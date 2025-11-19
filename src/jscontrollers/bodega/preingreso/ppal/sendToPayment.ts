import viewSendToPays from '@/jscontrollers/bodega/preingreso/ppal/viewSendToPays';
import customTable from '@/jscontrollers/components/customTable';
import loader from '@/jscontrollers/components/loading';

import { createXlsxFromJson } from '@/jscontrollers/composables/useXlsx';
import { addDias, getDiaActual, show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
import jsZip from 'P@/vendor/plugins/jszip/jszip.esm.js';

import type { AccionData, actionsType } from 'versaTypes';
import type { Ref } from 'vue';

/* eslint-disable */
const CT = customTable;
const L = loader;
const V = viewSendToPays;
/* eslint-enable */

const { ref } = Vue;

const sendToPayment = {
    name: 'sendToPayment',
    setup() {
        const fechaDesde = ref(addDias(getDiaActual(), -30)) as Ref<string>;
        const fechaHasta = ref(getDiaActual()) as Ref<string>;
        const refresh = ref(false) as Ref<boolean>;
        const externalFilters = ref(`&fechaDesde=${fechaDesde.value}&fechaHasta=${fechaHasta.value}`) as Ref<string>;
        const showModalViewPays = ref(false) as Ref<boolean>;

        const submitForm = () => {
            console.log('submitForm', fechaDesde.value, fechaHasta.value);
            externalFilters.value = `&fechaDesde=${fechaDesde.value}&fechaHasta=${fechaHasta.value}`;
            refresh.value = !refresh.value;
        };

        type DocsSelectedType = {
            rut: string;
            docfinal: string;
        };
        const docsSelected = ref([]) as Ref<DocsSelectedType[]>;

        const accion = (accion: AccionData) => {
            const actions: actionsType = {
                returnCheck: () => {
                    if (accion?.item) {
                        if (accion.item.selected) {
                            const findItem = docsSelected.value.find(
                                item => item.docfinal === accion.item.docfinal && item.rut === accion.item.rut
                            );
                            if (!findItem) {
                                docsSelected.value.push({
                                    rut: accion.item.rut,
                                    docfinal: accion.item.docfinal,
                                });
                            }
                        } else {
                            docsSelected.value = docsSelected.value.filter(
                                item => item.docfinal !== accion.item.docfinal && item.rut !== accion.item.rut
                            );
                        }
                    }
                },
                closeModal: () => {
                    showModalViewPays.value = false;
                    refresh.value = !refresh.value;
                },
                downloadExcelPay: () => downloadXlsx(accion.item?.id),
                downloadZIP: () => downloadZIP(accion.item?.id),
            };
            const fn = actions[accion.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        const btnLoading = ref(false) as Ref<boolean>;
        const senToPay = async () => {
            btnLoading.value = true;
            if (!docsSelected.value.length) {
                show_toast('error', 'Seleccione al menos una factura para enviar a pago');
                btnLoading.value = false;
                return;
            }

            const result = await Swal.fire({
                title: '¿Está seguro de enviar las facturas seleccionadas a pago?',
                text: 'Esta acción no se puede deshacer',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Enviar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    url: '/api/bodega/preingreso/sendToPaymentFacturas',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({ docsSelected: docsSelected.value }),
                });
                if (response.success === 1) {
                    show_toast('success', response.message, 'envio de Facturas', 'bg-success');
                    await downloadXlsx(response.id);

                    refresh.value = !refresh.value;
                    docsSelected.value = [];
                }
            }
            btnLoading.value = false;
        };

        const showLoader = ref(false) as Ref<boolean>;
        const downloadXlsx = async (id: number) => {
            showLoader.value = true;
            const result = await Swal.fire({
                title: '¿Está seguro de descargar el archivo?',
                text: 'Esta acción no se puede deshacer',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Descargar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    url: '/api/bodega/preingreso/getFacturasSendToPaymentById',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({ id }),
                });
                if (response.success === 1 && typeof response.data !== 'boolean') {
                    await createXlsxFromJson(response.data, 'Facturas Enviadas a Pago');
                }
            }
            showLoader.value = false;
        };
        const downloadZIP = async (id: number) => {
            showLoader.value = true;
            const result = await Swal.fire({
                title: '¿Está seguro de descargar el archivo?',
                text: 'Esta acción no se puede deshacer',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Descargar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    url: '/api/bodega/preingreso/getFacturasSendToPaymentById',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({ id }),
                });
                if (response.success === 1 && typeof response.data !== 'boolean') {
                    // recorrer la data, con las url de los archivos, descargar los archivo y comprimir
                    const zip = new jsZip();
                    const folder = zip.folder('facturas');
                    await Promise.all(
                        response.data.map(async item => {
                            if (item.archivo) {
                                const fileName = item.archivo.split('/').pop(); // Obtener solo el nombre del archivo
                                const fileUrl = item.ruta;

                                const file = await fetch(fileUrl);
                                const blob = await file.blob();
                                folder.file(fileName, blob);
                            }
                        })
                    );
                    zip.generateAsync({ type: 'blob' }).then(content => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(content);
                        a.download = 'Facturas.zip';
                        a.click();
                    });
                }
            }
            showLoader.value = false;
        };

        return {
            fechaDesde,
            fechaHasta,
            refresh,
            externalFilters,
            submitForm,
            accion,
            docsSelected,
            btnLoading,
            senToPay,
            showModalViewPays,
            showLoader,
        };
    },
    template: html`
        <article class="card">
            <div class="card-header">
                <viewSendToPays :showModal="showModalViewPays" @accion="accion" :disabledAll="showLoader" />
                <form @submit.prevent="submitForm" class="form-inline gap-2">
                    <div class="form-group">
                        <label for="fechaDesde" class="p-2">Fecha Desde</label>
                        <input type="date" class="form-control" id="fechaDesde" v-model="fechaDesde" />
                    </div>
                    <div class="form-group">
                        <label for="fechaHasta" class="p-2">Fecha Hasta</label>
                        <input type="date" class="form-control" id="fechaHasta" v-model="fechaHasta" />
                    </div>
                    <button type="submit" class="btn btn-primary">
                        <i class="fa fa-search"></i>
                        Buscar Facturas
                    </button>
                    <button class="btn btn-secondary" @click="showModalViewPays = true">
                        <i class="fa fa-eye"></i>
                        Ver Pagos enviados
                    </button>
                </form>
            </div>
            <div class="card-body">
                <button class="btn btn-success flex justify-between gap-2" @click="senToPay" :disabled="btnLoading">
                    <span>
                        <i class="fa fa-paper-plane"></i>
                        Enviar a Pago
                    </span>
                    <loader v-if="btnLoading" />
                </button>
                <div>
                    <customTable
                        id="sendToPaymentTable"
                        titleTable="Seleccione las facturas a enviar a pago"
                        url="/api/bodega/preingreso/getFacturasSendToPayment"
                        :externalFilters="externalFilters"
                        :refresh="refresh"
                        @accion="accion" />
                </div>
            </div>
        </article>
    `,
};

Vue.component('sendToPayment', sendToPayment);

export default sendToPayment;
