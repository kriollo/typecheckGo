import { $dom, blockedForm, validateFormRequired } from '@/jscontrollers/composables/dom-selector';
import { fetchGetTipoDocumento } from '@/jscontrollers/composables/fetching';
import { createXlsxFromJson } from '@/jscontrollers/composables/useXlsx.js';
import {
    addDias,
    format_number_n_decimal,
    getDiaActual,
    GetUniquedArrayObject,
    isNumber,
    pasarella,
    show_toast,
    validateResponeStatus,
    versaAlert,
    versaFetch,
} from '@/jscontrollers/composables/utils';
import { usePPalStore } from '@/jscontrollers/usePPalStore.js';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
import type { AccionData, actionsType, VersaFetchResponse } from 'versaTypes';
const { provide, ref, computed, reactive, inject, watch, onMounted } = Vue;

import cardProveedorModal from '@/jscontrollers/components/cardProveedorModal';
import newModal from '@/jscontrollers/components/newModal';

import sendToPayment from '@/jscontrollers/bodega/preingreso/ppal/sendToPayment';
import dropZone from '@/jscontrollers/components/dropZone.js';
import iCheck from '@/jscontrollers/components/iCheck';
import inputDataList from '@/jscontrollers/components/inputDataList.js';
import inputEditable from '@/jscontrollers/components/inputEditable.js';

/* eslint-disable */
const ie = inputEditable;
// const cp = tarjetaProveedor;
const dz = dropZone;
const ic = iCheck;
const il = inputDataList;
const stp = sendToPayment;
/* eslint-enable */

Vue.component('ppal', {
    setup() {
        const ShowModalViewPreIngreso = ref(false);
        const idPreIngreso = ref(0);
        const showPendienteHesmigo = ref(false);
        const showPendienteFAC = ref(false);

        const functionPasarella = computed(() => usePPalStore.state.functionsPasarella);

        const estatus = reactive({
            nuevas: {
                cuenta: 0,
                data: [],
            },
            en_proceso: {
                cuenta: 0,
                data: [],
            },
            pendiente_hesmigo: {
                cuenta: 0,
            },
            pendiente_factura: {
                cuenta: 0,
            },
        });

        const setCounts = (/** @type {Array} */ counts) => {
            estatus.nuevas.cuenta = 0;
            estatus.en_proceso.cuenta = 0;
            estatus.pendiente_hesmigo.cuenta = 0;

            for (const item of counts) {
                switch (item.estado) {
                    case '1':
                        estatus.nuevas.cuenta = item.total;
                        break;
                    case '2':
                        estatus.en_proceso.cuenta = item.total;
                        break;
                    case '8':
                        estatus.pendiente_hesmigo.cuenta = item.total;
                        break;
                    case '9':
                        estatus.pendiente_factura.cuenta = item.total;
                        break;
                    default:
                        break;
                }
            }
        };

        const getPreIngresoResume = async (/** @type {Number} */ estado) => {
            const response = await fetch('/api/getPreIngresoResume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    estado: estado,
                }),
            });
            if (validateResponeStatus(response.status)) {
                const data = await response.json();
                return data;
            }
            return { success: 0, message: 'Error interno en el servidor' };
        };
        getPreIngresoResume(1).then((/** @type {{ success: Number; data: Array; counts: Array }} */ response) => {
            if (response.success === 1) {
                estatus.nuevas.data = response.data;
                setCounts(response.counts);
                return;
            }
            estatus.nuevas.data.value = [];
        });

        const updateFechaEntregaEstimada = async (
            /** @type {{id: Number; fecha_entrega_estimada: String;}} */ data
        ) => {
            const response = await fetch('/api/updateFechaEntregaEstimada', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (validateResponeStatus(response.status)) {
                const data = await response.json();
                return data;
            }
            return { success: 0, message: 'Error interno en el servidor' };
        };

        const updateOCSAP = async (/** @type {{id: Number; ocsap: String;}} */ data) => {
            const response = await fetch('/api/updateOCSAP', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (validateResponeStatus(response.status)) {
                const data = await response.json();
                return data;
            }
            return { success: 0, message: 'Error interno en el servidor' };
        };

        const ivaLocal = computed(() => 1 + parseFloat(usePPalStore.state.IVA));

        provide('ivaLocal', ivaLocal);

        return {
            getPreIngresoResume,
            estatus,
            ShowModalViewPreIngreso,
            idPreIngreso,
            updateFechaEntregaEstimada,
            updateOCSAP,
            functionPasarella,
            showPendienteHesmigo,
            setCounts,
            showPendienteFAC,
        };
    },
    methods: {
        accion(accion: AccionData) {
            const actions: actionsType = {
                reloadData: () => this.loadPreIngresoResume(accion.estado),
                closeModal: () => {
                    this.ShowModalViewPreIngreso = false;
                },
                verPreIngreso: () => {
                    this.VerPreIngreso(accion.id);
                },
                showInputText: () => this.showInputText(accion.id, accion.estado_panel, accion.field),
                cancelUpdate: () => this.cancelUpdate(accion.id, accion.from, accion.field),
                updateData: () => this.updateData(accion),
                showPendienteHesmigo: () => {
                    this.showPendienteHesmigo = false;
                    this.showPendienteFAC = false;
                    setTimeout(() => {
                        this.showPendienteHesmigo = true;
                    }, 100);
                },
                updateCount: () => {
                    this.setCounts(accion.counts);
                },
                showPendienteFAC: () => {
                    this.showPendienteHesmigo = false;
                    this.showPendienteFAC = false;
                    setTimeout(() => {
                        this.showPendienteFAC = true;
                    }, 100);
                },
                verFactura: () => this.descargaBlob(accion),
            };

            const selectedAction = actions[accion.accion] || actions.default;
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        loadPreIngresoResume(/** @type {Number} */ estado) {
            this.estatus.nuevas.data = [];
            this.estatus.en_proceso.data = [];
            this.getPreIngresoResume(estado).then(
                (/** @type {{ success: Number; data: Array; counts: array }} */ response) => {
                    if (response.success === 1) {
                        if (Number(estado) === 1) {
                            this.estatus.nuevas.data = response.data;
                        } else {
                            this.estatus.en_proceso.data = response.data;
                        }

                        this.setCounts(response.counts);
                    }
                }
            );
        },
        VerPreIngreso(/** @type {Number} */ id) {
            this.idPreIngreso = Number(id);
            this.ShowModalViewPreIngreso = true;
        },
        showInputText(id: number, estado_panel: number, field: string) {
            if (Number(estado_panel) === 1) {
                this.estatus.nuevas.data.map((/** @type {{ id: Number; visible: Number; }} */ item) => {
                    item[field] = 0;
                    if (Number(item.id) === Number(id)) {
                        item[field] = 1;
                    }
                });
            } else {
                this.estatus.en_proceso.data.map((/** @type {{ id: Number; visible: Number; }} */ item) => {
                    item[field] = 0;
                    if (Number(item.id) === Number(id)) {
                        item[field] = 1;
                    }
                });
            }
        },
        cancelUpdate(/** @type {Number} */ id, /** @type {Number} */ estado_panel, /** @type {String} */ field) {
            if (Number(estado_panel) === 1) {
                this.estatus.nuevas.data.map((/** @type {{ id: Number; visible: Number; }} */ item) => {
                    item[field] = 0;
                });
            } else {
                this.estatus.en_proceso.data.map((/** @type {{ id: Number; visible: Number; }} */ item) => {
                    item[field] = 0;
                });
            }
        },
        updateData(/** @type {{id: Number; newData: String; from: Number, field: String}} */ data) {
            if (data.field === 'visibleOCSAP') {
                this.updateOCSAP(data).then((/** @type {{ success: Number; message: String; }} */ response) => {
                    if (response.success === 1) {
                        Swal.fire('Exito', response.message, 'success');
                        this.loadPreIngresoResume(data.from);
                        return;
                    }
                    Swal.fire('Error', response.message, 'error');
                });
            } else {
                this.updateFechaEntregaEstimada(data).then(
                    (/** @type {{ success: Number; message: String; }} */ response) => {
                        if (response.success === 1) {
                            Swal.fire('Exito', response.message, 'success');
                            this.loadPreIngresoResume(data.from);
                            return;
                        }
                        Swal.fire('Error', response.message, 'error');
                    }
                );
            }
        },
        descargaBlob(FileAsociado) {
            const link = document.createElement('a');
            link.target = '_blank';
            link.href = FileAsociado.ruta;
            link.click();

            // Limpiar después de la descarga
            setTimeout(() => {
                window.URL.revokeObjectURL(link.href);
                link.remove();
            }, 700);
        },
    },
    watch: {
        functionPasarella(val) {
            if (val !== null) {
                this.accion(val);
            }
        },
    },
    template: html`
        <div class="col col-md-12">
            <modalViewPreIngreso
                :idPreIngreso="idPreIngreso"
                :showModal="ShowModalViewPreIngreso"
                @accion="accion"
                key="modalViewPreIngreso" />
            <div class="card card-info card-outline card-outline-tabs">
                <div class="card-header p-0 border-bottom-0">
                    <ul id="custom-tabs-four-tab" class="nav nav-tabs" role="tablist">
                        <!-- Nuevas -->
                        <li class="nav-item">
                            <a
                                id="custom-tabs-Nuevas-tab"
                                class="nav-link active"
                                @click="loadPreIngresoResume(1)"
                                aria-controls="Nuevas-tab"
                                aria-selected="true"
                                data-toggle="pill"
                                href="#Nuevas"
                                role="tab">
                                Nuevas ( {{estatus.nuevas.cuenta}} )
                            </a>
                        </li>
                        <!-- En Proceso -->
                        <li class="nav-item">
                            <a
                                id="custom-tabs-En_Proceso-tab"
                                class="nav-link"
                                @click="loadPreIngresoResume(2)"
                                aria-controls="En_Proceso-tab"
                                aria-selected="false"
                                data-toggle="pill"
                                href="#En_Proceso"
                                role="tab">
                                En Proceso ( {{estatus.en_proceso.cuenta}} )
                            </a>
                        </li>

                        <!-- Pendientes HES/MIGO -->
                        <li class="nav-item">
                            <a
                                id="custom-tabs-Pendiente_HM-tab"
                                class="nav-link"
                                @click="accion({accion:'showPendienteHesmigo'})"
                                aria-controls="Pendiente_HM-tab"
                                aria-selected="false"
                                data-toggle="pill"
                                href="#Pendiente_HM"
                                role="tab">
                                Pendientes HES/MIGO ( {{ estatus.pendiente_hesmigo.cuenta }} )
                            </a>
                        </li>
                        <!-- Pendientes Por Facturar -->
                        <li class="nav-item">
                            <a
                                id="custom-tabs-Pendiente_FACT-tab"
                                class="nav-link"
                                @click="accion({accion:'showPendienteFAC'})"
                                aria-controls="Pendiente_FACT-tab"
                                aria-selected="false"
                                data-toggle="pill"
                                href="#Pendiente_FACT"
                                role="tab">
                                Pendientes Por Facturar ( {{estatus.pendiente_factura.cuenta}} )
                            </a>
                        </li>
                        <!-- Enviar a Pago -->
                        <li class="nav-item">
                            <a
                                id="custom-tabs-SendToPayment-tab"
                                class="nav-link"
                                aria-controls="SendToPayment-tab"
                                aria-selected="false"
                                data-toggle="pill"
                                href="#SendToPayment"
                                role="tab">
                                Envío a Pago
                            </a>
                        </li>
                        <!-- Consulta -->
                        <li class="nav-item">
                            <a
                                id="custom-tabs-Consulta-tab"
                                class="nav-link"
                                aria-controls="Consulta-tab"
                                aria-selected="false"
                                data-toggle="pill"
                                href="#Consulta"
                                role="tab">
                                Consulta Pre Ingresos Por Fechas
                            </a>
                        </li>
                    </ul>
                </div>
                <div class="card-body">
                    <div id="custom-tabs-four-tabContent" class="tab-content">
                        <div
                            id="Nuevas"
                            class="tab-pane fade active show table-responsive"
                            aria-labelledby="Nuevas-tab"
                            role="tabpanel">
                            <nuevas :data="estatus.nuevas.data" @accion="accion" />
                        </div>
                        <div
                            id="En_Proceso"
                            class="tab-pane fade table-responsive"
                            aria-labelledby="En_Proceso-tab"
                            role="tabpanel">
                            <en_proceso :data="estatus.en_proceso.data" @accion="accion"></en_proceso>
                        </div>
                        <div id="Pendiente_HM" class="tab-pane fade" aria-labelledby="Pendiente_HM-tab" role="tabpanel">
                            <pendiente_hesmigo :showComponente="showPendienteHesmigo" @accion="accion" />
                        </div>
                        <div
                            id="Pendiente_FACT"
                            class="tab-pane fade"
                            aria-labelledby="Pendiente_FACT-tab"
                            role="tabpanel">
                            <pendiente_factura :showComponente="showPendienteFAC" @accion="accion" />
                        </div>
                        <div id="Consulta" class="tab-pane fade" aria-labelledby="Consulta-tab" role="tabpanel">
                            <consulta @accion="accion"></consulta>
                        </div>
                        <div
                            id="SendToPayment"
                            class="tab-pane fade"
                            aria-labelledby="sendToPayment-tab"
                            role="tabpanel">
                            <sendToPayment />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});

Vue.component('nuevas', {
    components: {
        cardProveedorModal,
    },
    props: {
        data: {
            type: Array,
            default: [],
        },
    },
    setup(props) {
        const dataProps = computed(() => props.data);
        const showModalCardProveedor = ref(false);
        const proveedorSelected = ref('');
        const ivaLocal = inject('ivaLocal');

        const deletePreIngreso = async (/** @type {Number} */ id) => {
            const response = await fetch('/api/deletePreIngreso', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: id,
                }),
            });
            if (validateResponeStatus(response.status)) {
                const data = await response.json();
                return data;
            }
            return { success: 0, message: 'Error interno en el servidor' };
        };

        const linkFile = (item: { ruta: string; archivo: string }) => {
            return item.ruta ? `<a href="${item.ruta}" target="_blank">${item.archivo}</a>` : 'No disponible';
        };

        return {
            dataProps,
            deletePreIngreso,
            showModalCardProveedor,
            proveedorSelected,
            ivaLocal,
            linkFile,
        };
    },
    methods: {
        accion(accion: AccionData) {
            const actions = {
                verPreIngreso: () => {
                    this.$emit('accion', accion);
                },
                editarPreIngreso: () => this.editarPreIngreso(accion.id),
                EliminarPreIngreso: () => this.EliminarPreIngreso(accion.id),
                showInputText: () => {
                    this.$emit('accion', accion);
                },
                cancelUpdate: () => {
                    this.$emit('accion', accion);
                },
                updateData: () => {
                    this.$emit('accion', accion);
                },
                showProveedor: () => {
                    this.proveedorSelected = accion['rut_proveedor'];
                    this.showModalCardProveedor = true;
                },
                closeModal: () => {
                    this.showModalCardProveedor = false;
                },
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        editarPreIngreso(/** @type {Number} */ id) {
            location.href = `/bodega/pre_ingreso/${id}`;
        },
        async EliminarPreIngreso(/** @type {Number} */ id) {
            const result = await Swal.fire({
                title: 'Estás seguro del eliminar este pre-ingreso?',
                text: 'No podras revertir esta acción!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, estoy seguro!',
                cancelButtonText: 'No, cancelar!',
            });
            if (result.isConfirmed) {
                this.deletePreIngreso(id).then((/** @type {{ success: Number; message: String; }} */ response) => {
                    if (response.success === 1) {
                        Swal.fire('Exito', response.message, 'success');
                        this.$emit('accion', {
                            accion: 'reloadData',
                            estado: 1,
                        });
                        return;
                    }
                    Swal.fire('Error', response.message, 'error');
                });
            }
        },
    },
    template: html`
        <table class="table">
            <cardProveedorModal :proveedor="proveedorSelected" :showModal="showModalCardProveedor" @accion="accion" />
            <thead>
                <th>NºOrden</th>
                <th>F.Ingreso</th>
                <th>OC SAP</th>
                <th>Archivo</th>
                <th>Proveedor</th>
                <th>Campus</th>
                <th>Area</th>
                <th>Total</th>
                <th>Creado Por</th>
                <th>Fecha Entrega Estimada</th>
                <th>Accion</th>
            </thead>
            <tbody>
                <tr v-for="(item, index) in dataProps">
                    <td>{{item.ndoc}}</td>
                    <td>{{item.created_at}}</td>
                    <td
                        @dblclick="accion({'accion': 'showInputText',id:item.id,estado_panel:1, field:'visibleOCSAP'})"
                        title="Doble Clic para editar.">
                        <div v-if="item.visibleOCSAP == 1">
                            <inputEditable
                                :data="item.ocsap"
                                :id="Number(item.id)"
                                @accion="accion"
                                field="visibleOCSAP"
                                from="1"
                                key="ocsap_nuevas" />
                        </div>
                        <div v-else>{{item.ocsap}}</div>
                    </td>
                    <td v-html="linkFile(item)"></td>
                    <td>{{item.nombre}}</td>
                    <td>{{item.desc_campus}}</td>
                    <td>{{item.desc_area}}</td>
                    <td class="text-right">
                        <p class="p-0 m-0">Neto: {{ item.total_documento / (ivaLocal) | format_number_n_decimal(0)}}</p>
                        <p class="p-0 m-0">Total: {{ item.total_documento | format_number_n_decimal(0) }}</p>
                    </td>
                    <td>{{item.name}}</td>
                    <td
                        @dblclick="accion({'accion': 'showInputText',id:item.id,estado_panel:1, field:'visibleFechaEntrega' })"
                        title="Doble Clic para editar.">
                        <div v-if="item.visibleFechaEntrega == 1">
                            <inputEditable
                                :data="item.fecha_entrega_estimada"
                                :id="Number(item.id)"
                                @accion="accion"
                                field="visibleFechaEntrega"
                                from="1"
                                key="fecha_entrega_nuevas" />
                        </div>
                        <div v-else>{{item.fecha_entrega_estimada}}</div>
                    </td>
                    <td>
                        <div class="d-flex gap-2">
                            <button
                                type="button"
                                class="btn btn-sm btn-info"
                                @click="accion({'accion':'verPreIngreso',id:item.id})"
                                title="ver preIngreso">
                                <i class="fa fa-eye"></i>
                            </button>
                            <button
                                type="button"
                                class="btn btn-sm btn-warning"
                                @click="accion({'accion':'editarPreIngreso',id:item.id})"
                                title="Editar preIngreso">
                                <i class="fa fa-edit"></i>
                            </button>
                            <button
                                type="button"
                                class="btn btn-sm btn-danger"
                                @click="accion({'accion':'EliminarPreIngreso',id:item.id})"
                                title="Eliminar preIngreso">
                                <i class="fa fa-trash"></i>
                            </button>
                            <button
                                type="button"
                                class="btn btn-sm btn-info"
                                @click="accion({'accion':'showProveedor',rut_proveedor:item.rut_proveedor})"
                                title="Ver datos de Proveedor">
                                <i class="fas fa-user-friends"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    `,
});
Vue.component('en_proceso', {
    props: {
        data: {
            type: Array,
            default: [],
        },
    },
    setup(props) {
        const dataProps = computed(() => props.data);

        const closePreIngreso = async (/** @type {Number} */ id) => {
            const response = await fetch('/api/closePreIngreso', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: id,
                }),
            });
            if (validateResponeStatus(response.status)) {
                const data = await response.json();
                return data;
            }
            return { success: 0, message: 'Error interno en el servidor' };
        };

        const ivaLocal = inject('ivaLocal');

        const linkFile = (item: { ruta: string; archivo: string }) => {
            return item.ruta ? `<a href="${item.ruta}" target="_blank">${item.archivo}</a>` : 'No disponible';
        };

        return {
            dataProps,
            closePreIngreso,
            ivaLocal,
            linkFile,
        };
    },
    methods: {
        accion(/** @type {{accion: String; id: Number;}} */ accion) {
            const actions = {
                verPreIngreso: () => {
                    this.$emit('accion', accion);
                },
                CerrarPreIngreso: () => this.cerrarPreIngreso(accion.id),
                showInputText: () => {
                    this.$emit('accion', accion);
                },
                cancelUpdate: () => {
                    this.$emit('accion', accion);
                },
                updateData: () => {
                    this.$emit('accion', accion);
                },
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        async cerrarPreIngreso(/** @type {Number} */ id) {
            const result = await Swal.fire({
                title: 'Estás seguro de cerrar este pre-ingreso?',
                text: 'No podras revertir esta acción!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, estoy seguro!',
                cancelButtonText: 'No, cancelar!',
            });
            if (result.isConfirmed) {
                const response = await this.closePreIngreso(id);
                if (response.success === 1) {
                    Swal.fire('Exito', response.message, 'success');
                    this.$emit('accion', {
                        accion: 'reloadData',
                        estado: 2,
                    });
                    return;
                }
                Swal.fire('Error', response.message, 'error');
            }
        },
    },
    template: html`
        <table class="table">
            <thead>
                <th>NºOrden</th>
                <th>F.Ingreso</th>
                <th>OC SAP</th>
                <th>Archivo</th>
                <th>Proveedor</th>
                <th>Campus</th>
                <th>Area</th>
                <th>Total</th>
                <th>T.Pendiente</th>
                <th>Creado Por</th>
                <th>Fecha Entrega Estimada</th>
                <th>Accion</th>
            </thead>
            <tbody>
                <tr v-for="(item, index) in dataProps">
                    <td>{{item.ndoc}}</td>
                    <td>{{item.created_at}}</td>
                    <td
                        @dblclick="accion({'accion': 'showInputText',id:item.id,estado_panel:2, field:'visibleOCSAP'})"
                        title="Doble Clic para editar.">
                        <div v-if="item.visibleOCSAP == 1">
                            <inputEditable
                                :data="item.ocsap"
                                :id="Number(item.id)"
                                @accion="accion"
                                field="visibleOCSAP"
                                from="2"
                                key="ocsap_en_proceso" />
                        </div>
                        <div v-else>{{item.ocsap}}</div>
                    </td>
                    <td v-html="linkFile(item)"></td>
                    <td>{{item.nombre}}</td>
                    <td>{{item.desc_campus}}</td>
                    <td>{{item.desc_area}}</td>
                    <td class="text-right">
                        <p class="p-0 m-0">Neto: {{ item.total_documento / (ivaLocal) | format_number_n_decimal(0)}}</p>
                        <p class="p-0 m-0">Total: {{ item.total_documento | format_number_n_decimal(0) }}</p>
                    </td>
                    <td class="text-right">{{ item.total_pendiente | format_number_n_decimal(0)}}</td>
                    <td>{{item.name}}</td>
                    <td
                        @dblclick="accion({'accion': 'showInputText',id:item.id, estado_panel:2, field:'visibleFechaEntrega'})"
                        title="Doble Clic para editar.">
                        <div v-if="item.visibleFechaEntrega == 1">
                            <inputEditable
                                :data="item.fecha_entrega_estimada"
                                :id="Number(item.id)"
                                @accion="accion"
                                field="visibleFechaEntrega"
                                from="2"
                                key="fecha_entrega_en_proceso" />
                        </div>
                        <div v-else>{{item.fecha_entrega_estimada}}</div>
                    </td>
                    <td>
                        <button
                            type="button"
                            class="btn btn-sm btn-info"
                            @click="accion({'accion':'verPreIngreso',id:item.id})">
                            <i class="fa fa-eye"></i>
                        </button>
                        <button
                            type="button"
                            class="btn btn-sm btn-warning"
                            @click="accion({'accion':'CerrarPreIngreso',id:item.id})">
                            <i class="fa fa-times"></i>
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    `,
});

Vue.component('pendiente_hesmigo', {
    props: {
        showComponente: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, { emit }) {
        const showComponent = computed(() => props.showComponente);
        const data = ref([]);
        const dataFilter = ref([]);
        const showFilter = ref('');
        const proveedor = ref([]);
        const filter = ref('');

        const loadData = () => {
            versaFetch({
                method: 'POST',
                url: '/api/get_ingresos_Doc_Shesmigo',
            }).then(response => {
                if (response.success === 1) {
                    data.value = response.data;
                    dataFilter.value = response.data;

                    proveedor.value = GetUniquedArrayObject('desc_proveedor', response.data);

                    emit('accion', {
                        accion: 'updateCount',
                        counts: response.counts,
                    });
                }
            });
        };
        watch(showComponent, (/** @type {Boolean} */ val) => {
            if (val) {
                loadData();
            }
        });

        watch(filter, (/** @type {String} */ val) => {
            if (val !== '') {
                if (showFilter.value === 'NGUIA') {
                    dataFilter.value = data.value.filter(
                        (/** @type {{ ndocumento: String; }} */ item) => item.ndocumento === val
                    );
                } else {
                    dataFilter.value = data.value.filter(
                        (/** @type {{ desc_proveedor: String; }} */ item) => item.desc_proveedor === val
                    );
                }
            } else {
                dataFilter.value = data.value;
            }
        });

        const ivaLocal = inject('ivaLocal');

        return {
            showComponent,
            data,
            loadData,
            dataFilter,
            showFilter,
            proveedor,
            filter,
            ivaLocal,
        };
    },
    methods: {
        accion(accion: AccionData) {
            const actions: actionsType = {
                showInputText: () => {
                    this.data.map((/** @type {{ id: Number; visible: Number; }} */ item) => {
                        item[accion.field] = 0;
                        if (Number(item.id) === Number(accion.id)) {
                            item[accion.field] = 1;
                        }
                    });
                },
                cancelUpdate: () => {
                    this.data.map((/** @type {{ id: Number; visible: Number; }} */ item) => {
                        item[accion.field] = 0;
                    });
                },
                updateData: () => {
                    if (accion.field === 'visibleHesmigo') {
                        this.updateHesmigo({
                            id: accion.id,
                            hesmigo: accion.newData,
                            field: accion.field,
                        });
                    } else {
                        this.updateOCSAP({
                            id: accion.id,
                            ocsap: accion.newData,
                            field: accion.field,
                        });
                    }
                },
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        async updateHesmigo({ id, hesmigo, field }) {
            if (hesmigo === '' && hesmigo === null) return;
            const result = await Swal.fire({
                title: 'Estás seguro de actualizar el HES/MIGO?',
                text: 'No podras revertir esta acción!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, estoy seguro!',
                cancelButtonText: 'No, cancelar!',
            });

            if (result.isConfirmed) {
                const item = this.data.find(
                    (/** @type {{ id: Number; visible: Number; }} */ item) => Number(item.id) === Number(id)
                );
                const response = await versaFetch({
                    method: 'POST',
                    url: '/api/update_ingreso_Doc_Hesmigo',
                    headers: { 'content-type': 'application/json' },
                    data: JSON.stringify({
                        id,
                        hesmigo,
                        ndocumento: item.ndocumento,
                        tipodoc: item.tipodoc,
                        field,
                    }),
                });
                if (response.success === 1) {
                    versaAlert({
                        title: 'Exito',
                        message: response.message,
                        type: 'success',
                        callback: () => {
                            this.loadData();
                        },
                    });
                    return;
                }
                versaAlert({
                    title: 'Error',
                    message: response.message,
                    type: 'error',
                });
            }
        },
        async exportExcel() {
            await createXlsxFromJson(this.dataFilter, 'pendiente_PorHesMigo.xlsx');
        },
        async updateOCSAP({ id, ocsap, field }) {
            if (ocsap === '' && ocsap === null) return;

            const result = await Swal.fire({
                title: 'Estás seguro de actualizar el OC SAP?',
                text: 'No podras revertir esta acción!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, estoy seguro!',
                cancelButtonText: 'No, cancelar!',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    method: 'POST',
                    url: '/api/updateOCSAPIngreso',
                    headers: { 'content-type': 'application/json' },
                    data: JSON.stringify({
                        id,
                        ocsap,
                        field,
                    }),
                });

                if (response.success === 1) {
                    versaAlert({
                        title: 'Exito',
                        message: response.message,
                        type: 'success',
                        callback: () => {
                            this.loadData();
                        },
                    });
                    return;
                }
                versaAlert({
                    title: 'Error',
                    message: response.message,
                    type: 'error',
                });
            }
        },
    },
    template: html`
        <div v-if="showComponent">
            <div class="row">
                <div class="col col-md-12">
                    filtrar por:
                    <div class="btn-group btn-group-toggle" data-toggle="buttons">
                        <label class="btn btn-secondary active">
                            <input
                                id="option1_PorHesMigo"
                                type="radio"
                                @click="dataFilter = data; showFilter=''; filter=''"
                                autocomplete="off"
                                checked
                                name="options" />
                            Todos
                        </label>
                        <label class="btn btn-secondary">
                            <input
                                id="option2_PorHesMigo"
                                type="radio"
                                @click="showFilter = 'PROVEEDOR';dataFilter = data; filter=''"
                                autocomplete="off"
                                name="options" />
                            Proveedor
                        </label>
                        <label class="btn btn-secondary">
                            <input
                                id="option3_PorHesMigo"
                                type="radio"
                                @click="showFilter = 'NGUIA';dataFilter = data; filter=''"
                                autocomplete="off"
                                name="options" />
                            Nº Guia
                        </label>
                    </div>

                    <button type="button" class="btn btn-sm btn-success ml-1" @click="exportExcel">
                        Exportar a Excel
                    </button>
                </div>
                <div class="col col-md-12 my-2">
                    <div class="input-group mb-3" v-if="showFilter === 'NGUIA' ">
                        <div class="input-group-prepend">
                            <span class="input-group-text">Buscar</span>
                        </div>
                        <input type="text" class="form-control" placeholder="Ingrese Nº Guia" v-model="filter" />
                    </div>
                    <div class="input-group mb-3" v-if="showFilter === 'PROVEEDOR' ">
                        <div class="input-group-prepend">
                            <span class="input-group-text">Buscar</span>
                        </div>
                        <select class="form-control" v-model="filter" id="select_proveedor_PorHesMigo">
                            <option value="">Seleccione</option>
                            <option v-for="(item, index) in proveedor">{{item.desc_proveedor}}</option>
                        </select>
                    </div>
                </div>
            </div>
            <table class="table">
                <thead>
                    <th>Folio</th>
                    <th>Fecha</th>
                    <th>TipoDoc</th>
                    <th>Documento</th>
                    <th>Proveedor</th>
                    <th>OC SAP</th>
                    <th>Orden Compra</th>
                    <th>PreIngreso</th>
                    <th>Total</th>
                    <th>HES/MIGO</th>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in dataFilter">
                        <td>{{item.id}}</td>
                        <td>{{item.created_at}}</td>
                        <td>{{item.desc_tipodoc}}</td>
                        <td>{{item.ndocumento}}</td>
                        <td>{{item.desc_proveedor}}</td>
                        <td
                            @dblclick="accion({'accion': 'showInputText',id:item.id, estado_panel:3, field:'editOcSap'})"
                            title="Doble clic para Editar">
                            <div v-if="item.editOcSap == 1">
                                <inputEditable
                                    :data="item.ocsap"
                                    :id="Number(item.id)"
                                    @accion="accion"
                                    field="editOcSap"
                                    from="3"
                                    key="pf_ocsap" />
                            </div>
                            <div v-else>{{item.ocsap}}</div>
                        </td>
                        <td>{{item.ordencompra}}</td>
                        <td>{{item.id_preingreso}}</td>
                        <td class="text-right">
                            <p class="p-0 m-0">
                                Neto: {{ item.total_documento / (ivaLocal) | format_number_n_decimal(0)}}
                            </p>
                            <p class="p-0 m-0">Total: {{ item.total_documento | format_number_n_decimal(0) }}</p>
                        </td>
                        <td
                            @dblclick="accion({'accion': 'showInputText',id:item.id, estado_panel:3, field:'visibleHesmigo'})"
                            title="Doble Clic para editar.">
                            <div v-if="item.visibleHesmigo == 1">
                                <inputEditable
                                    :data="item.hesmigo"
                                    :id="Number(item.id)"
                                    @accion="accion"
                                    field="visibleHesmigo"
                                    from="2"
                                    key="pf_hesmigo" />
                            </div>
                            <div v-else>{{item.hesmigo}}</div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `,
});

Vue.component('pendiente_factura', {
    props: {
        showComponente: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, { emit }) {
        const showComponent = computed(() => props.showComponente);
        const data = ref([]);
        const dataFilter = ref([]);
        const showFilter = ref('');
        const proveedor = ref([]);
        const filter = ref('');
        const showModalAsocia = ref(false);

        const loadData = () => {
            versaFetch({
                method: 'POST',
                url: '/api/get_ingresos_Doc_guias_SF',
            }).then(response => {
                if (response.success === 1) {
                    for (const item of response.data) {
                        item.selected = false;
                    }

                    data.value = response.data;
                    dataFilter.value = response.data;

                    proveedor.value = GetUniquedArrayObject('desc_proveedor', response.data);

                    emit('accion', {
                        accion: 'updateCount',
                        counts: response.counts,
                    });
                }
            });
        };
        watch(showComponent, (/** @type {Boolean} */ val) => {
            if (val) {
                loadData();
            }
        });

        watch(filter, (/** @type {String} */ val) => {
            if (val !== '') {
                if (showFilter.value === 'NGUIA') {
                    dataFilter.value = data.value.filter(
                        (/** @type {{ ndocumento: String; }} */ item) => item.ndocumento === val
                    );
                } else {
                    dataFilter.value = data.value.filter(
                        (/** @type {{ desc_proveedor: String; }} */ item) => item.desc_proveedor === val
                    );
                }
            } else {
                dataFilter.value = data.value;
            }
        });

        const totalSelected = computed(() => dataFilter.value.filter(item => item.selected).length);

        const updateUltimaSolicitdFactura = async (/** @type {Object} */ params) => {
            const response = await fetch('/api/updateUltimaSolicitdFacturaIngresoBodega', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: params.id,
                }),
            })
                .then((/** @type {Response} */ response) => {
                    if (validateResponeStatus(response.status)) {
                        const data = response.json();
                        return data;
                    } else {
                        return {
                            success: 0,
                            message: 'Error interno en el servidor',
                        };
                    }
                })
                .catch((/** @type {Error} */ error) => ({
                    success: 0,
                    message: error.message,
                }));
            return response;
        };

        const ivaLocal = inject('ivaLocal');

        const linkFile = (item: { ruta: string; archivo: string }) => {
            return item.ruta ? `<a href="${item.ruta}" target="_blank">${item.archivo}</a>` : 'No disponible';
        };

        return {
            showComponent,
            data,
            loadData,
            dataFilter,
            showFilter,
            proveedor,
            filter,
            totalSelected,
            showModalAsocia,
            updateUltimaSolicitdFactura,
            ivaLocal,
            linkFile,
        };
    },
    methods: {
        accion(accion: AccionData) {
            const actions: actionsType = {
                showInputText: () => {
                    this.data.map((/** @type {{ id: Number; visible: Number; }} */ item) => {
                        item[accion.field] = 0;
                        if (Number(item.id) === Number(accion.id)) {
                            item[accion.field] = 1;
                        }
                    });
                },
                cancelUpdate: () => {
                    this.data.map((/** @type {{ id: Number; visible: Number; }} */ item) => {
                        item[accion.field] = 0;
                    });
                },
                updateData: () => {
                    this.updateHesmigo({
                        id: accion.id,
                        hesmigo: accion.newData,
                        field: accion.field,
                    });
                },
                asociarFactura: () => this.asociarFactura(),
                closeModal: () => {
                    this.showModalAsocia = false;
                },
                reloadData: () => this.loadData(),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        asociarFactura() {
            if (this.totalSelected === 0) return;

            this.showModalAsocia = true;
        },
        async exportExcel() {
            await createXlsxFromJson(this.dataFilter, 'pendiente_factura.xlsx');
        },
        updateUltimaSolicitdFacturaBtn(/** @type {{ id: Number; ultima_solicitd_factura: Date }} */ item) {
            this.updateUltimaSolicitdFactura(item).then((/** @type {Object} */ data) => {
                if (data.success === 1) {
                    item.ultima_solicitd_factura = data.fecha;
                } else {
                    show_toast('Error', data.message);
                }
            });
        },
        async getMailTo(/** @type {Object} */ item) {
            const subject = `Solicitud de Factura Orden de Compra`;
            const body = `Estimado(a): ${item.desc_proveedor},
            %0A
            %0A
            Adjunto información de Orden de Compra SAP, total a facturar y número de HES (Hoja de Entrada) para generar la factura. Favor incluir estos datos en la Referencia del documento.
            %0A
            %0A
            OC SENEGOCIA: ${item.ordencompra}
            %0A
            GUIA DE DESPACHO: ${item.ndocumento}
            %0A
            OC SAP: ${item.ocsap}
            %0A
            HES: ${item.hesmigo}
            %0A
            MONTO FACTURA: ${Number(item.total_documento).toLocaleString('es-ES')}
            %0A
            %0A
            Una vez emitida la factura, enviar a los correos que están en copia, incluido el mío, para procesar el pago correspondiente.
            %0A
            Si tienes dudas, te invito a revisar el siguiente manual:
            %0A
            Instructivo de Proveedores y Contratistas: https://www.udd.cl/dircom/web/InstructivodeProveedoresyContratistas.pdf
            %0A
            %0A
            Muchas gracias.
            %0A
            %0A
            Atte.`;

            const conctacto = await versaFetch({
                url: '/api/getContactosProveedor',
                method: 'POST',
                data: JSON.stringify({
                    rut: item.rut_proveedor,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            let emails = [];
            if (conctacto.data !== false) {
                emails = conctacto.data.map((/** @type {{ email: String; }} */ item) => item.email);
            } else {
                emails = [item.email_contacto];
            }
            const to = emails.join(';');
            const mail = `mailto:${to}?subject=${subject}&body=${body}`;

            const a = document.createElement('a');
            a.href = mail;
            a.target = '_blank';
            a.click();
            a.remove();
        },
    },
    template: html`
        <div v-if="showComponent">
            <div class="row">
                <div class="col col-md-12">
                    filtrar por:
                    <div class="btn-group btn-group-toggle" data-toggle="buttons">
                        <label class="btn btn-secondary active">
                            <input
                                id="option1"
                                type="radio"
                                @click="dataFilter = data; showFilter=''; filter=''"
                                autocomplete="off"
                                checked
                                name="options" />
                            Todos
                        </label>
                        <label class="btn btn-secondary">
                            <input
                                id="option2"
                                type="radio"
                                @click="showFilter = 'PROVEEDOR';dataFilter = data; filter=''"
                                autocomplete="off"
                                name="options" />
                            Proveedor
                        </label>
                        <label class="btn btn-secondary">
                            <input
                                id="option3"
                                type="radio"
                                @click="showFilter = 'NGUIA';dataFilter = data; filter=''"
                                autocomplete="off"
                                name="options" />
                            Nº Guia
                        </label>
                    </div>

                    <button type="button" class="btn btn-sm btn-success ml-1" @click="exportExcel">
                        Exportar a Excel
                    </button>
                </div>
                <div class="col col-md-12 my-2">
                    <div class="input-group mb-3" v-if="showFilter === 'NGUIA' ">
                        <div class="input-group-prepend">
                            <span class="input-group-text">Buscar</span>
                        </div>
                        <input type="text" class="form-control" placeholder="Ingrese Nº Guia" v-model="filter" />
                    </div>
                    <div class="input-group mb-3" v-if="showFilter === 'PROVEEDOR' ">
                        <div class="input-group-prepend">
                            <span class="input-group-text">Buscar</span>
                        </div>
                        <select class="form-control" v-model="filter" id="select_proveedor_PorFacturar">
                            <option value="">Seleccione</option>
                            <option v-for="(item, index) in proveedor">{{item.desc_proveedor}}</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="mb-2">
                    Total Seleccionados: {{totalSelected}}
                    <button
                        type="button"
                        class="btn btn-sm btn-success ml-1"
                        @click="asociarFactura"
                        v-if="totalSelected > 0">
                        Asociar a Factura
                    </button>
                    <modalInputFactura
                        :guiasSelected="dataFilter.filter(item => item.selected)"
                        :showModal="showModalAsocia"
                        @accion="accion"
                        key="modalInputFactura" />
                </div>
                <table class="table">
                    <thead>
                        <th>Seleccione</th>
                        <th>Folio</th>
                        <th>Fecha</th>
                        <th>TipoDoc</th>
                        <th>Documento</th>
                        <th>Proveedor</th>
                        <th>OC SAP</th>
                        <th>Archivo</th>
                        <th>Orden Compra</th>
                        <th>PreIngreso</th>
                        <th>Total</th>
                        <th>HES/MIGO</th>
                        <th>Acción</th>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in dataFilter">
                            <td class="text-center">
                                <div class="icheck-success">
                                    <input type="checkbox" :id="'check_'+index" v-model="item.selected" />
                                    <label :for="'check_'+index"></label>
                                </div>
                            </td>
                            <td>{{item.id}}</td>
                            <td>{{item.created_at}}</td>
                            <td>{{item.desc_tipodoc}}</td>
                            <td>{{item.ndocumento}}</td>
                            <td>{{item.desc_proveedor}}</td>
                            <td>{{item.ocsap}}</td>
                            <td v-html="linkFile(item)"></td>
                            <td>{{item.ordencompra}}</td>
                            <td>{{item.id_preingreso}}</td>
                            <td class="text-right">
                                <p class="p-0 m-0">
                                    Neto: {{ item.total_documento / (ivaLocal) | format_number_n_decimal(0)}}
                                </p>
                                <p class="p-0 m-0">Total: {{ item.total_documento | format_number_n_decimal(0) }}</p>
                            </td>
                            <td
                                @dblclick="accion({'accion': 'showInputText',id:item.id, estado_panel:3, field:'visibleHesmigo'})"
                                title="Doble Clic para editar.">
                                <div v-if="item.visibleHesmigo == 1">
                                    <inputEditable
                                        :data="item.hesmigo"
                                        :id="Number(item.id)"
                                        @accion="accion"
                                        field="visibleHesmigo"
                                        from="2"
                                        key="hesmigo" />
                                </div>
                                <div v-else>{{item.hesmigo}}</div>
                            </td>
                            <td>
                                <div class="flex-col text-center">
                                    <p>{{ item.ultima_solicitd_factura }}</p>
                                    <a
                                        class="btn btn-sm btn-primary"
                                        @click="getMailTo(item);updateUltimaSolicitdFacturaBtn(item)"
                                        title="Enviar Correo">
                                        <i class="fas fa-envelope"></i>
                                    </a>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,
});
Vue.component('facturaasociada', {
    components: { newModal },
    props: {
        iddoc: {
            type: Number,
            required: true,
        },
        file: {
            type: Object,
            required: false,
        },
    },
    setup(props) {
        const idDoc = computed(() => props.iddoc);
        const FileAsociado = computed(() => props.file);
        const showModal = ref(false);
        const typeFiles = computed(() => usePPalStore.state.FileTypeValid);
        const file = ref([]);

        const message = ref('Cargar Documento');
        watch(FileAsociado, (/** @type {Object} */ val) => {
            if (val) {
                message.value = 'Actualizar Documento';
            } else {
                message.value = 'Cargar Documento';
            }
        });

        const deleteFileDOC = async (/** @type {Number} */ id) => {
            const response = await fetch('/api/deleteFileDOC', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id }),
            });
            if (validateResponeStatus(response.status)) {
                const data = await response.json();
                return data;
            } else {
                return { success: 0, message: 'Error interno en el servidor' };
            }
        };

        return {
            idDoc,
            showModal,
            FileAsociado,
            message,
            typeFiles,
            deleteFileDOC,
            file,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion: AccionData) {
            const actions = {
                showModal: () => {
                    this.showModal = true;
                },
                closeModal: () => {
                    this.showModal = false;
                },
                addFiles: () => {
                    this.file = [];
                    const refresh = {
                        accion: 'addFiles',
                        file: {},
                    };
                    this.$emit('accion', refresh);

                    this.$emit('accion', accion);
                    this.showModal = false;
                },
                deleteFile: () => this.deleteFile(this.FileAsociado),
            };
            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        getType(type) {
            const typeSearch = this.typeFiles.find(item => item.type === type);
            if (typeSearch === undefined) return 'bi bi-file-earmark';
            return `${typeSearch.color} ${typeSearch.icon}`;
        },
        descargaBlob() {
            const blob = new Blob([this.FileAsociado.file], {
                type: this.FileAsociado.type,
            });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = this.FileAsociado.archivo;
            link.click();

            // Limpiar después de la descarga
            setTimeout(() => {
                window.URL.revokeObjectURL(link.href);
                link.remove();
            }, 700);
        },
        deleteFile(/** @type {Object} */ params) {
            this.message = 'Cargar Documento';
            if (params.id === undefined) {
                this.file = [];
                const accion = {
                    accion: 'addFiles',
                    file: {},
                };
                this.$emit('accion', accion);
            } else {
                this.deleteFileDOC(params.id).then((/** @type {Object} */ response) => {
                    if (response.success === 1) {
                        this.file = [];
                        const accion = {
                            accion: 'addFiles',
                            file: {},
                        };
                        this.$emit('accion', accion);
                    }
                });
            }
        },
    },
    template: html`
        <div class="d-flex justify-content-between align-items-center border-info border p-2">
            <div v-if="FileAsociado?.type">
                <i :class="getType(FileAsociado?.type)+' fa-1x'"></i>
                <a style="cursor: pointer;" @click="descargaBlob" download v-if="FileAsociado?.id === undefined">
                    {{ FileAsociado?.archivo }}
                </a>
                <a :href="FileAsociado.ruta" download v-else>{{ FileAsociado?.archivo }}</a>
            </div>
            <div class="d-flex justify-content-between gap-1">
                <button
                    type="button"
                    class="btn btn-primary btn-xs btn-sm"
                    @click="accion({accion:'showModal'})"
                    title="Cargar Archivo">
                    <i class="fa fa-upload"></i>
                    {{ message }}
                </button>
                <button
                    type="button"
                    class="btn btn-danger btn-xs btn-sm"
                    @click="accion({accion:'deleteFile'})"
                    title="Eliminar Archivo"
                    v-if="FileAsociado?.archivo !== undefined">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
            <newModal :showModal="showModal" @accion="accion" idModal="modalFacturaAsociada">
                <template v-slot:title>Factura Asociada</template>
                <template v-slot:body>
                    <dropZone :files="file" @accion="accion" />
                </template>
                <template v-slot:footer>
                    <button type="button" class="btn btn-secondary" @click="accion({accion:'closeModal'})">
                        Cerrar
                    </button>
                </template>
            </newModal>
        </div>
    `,
});
Vue.component('modalInputFactura', {
    components: { newModal },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
        guiasSelected: {
            type: Array,
            default: [],
        },
    },
    setup(props) {
        const file = ref(null);
        const showModal = computed(() => props.showModal);
        const valueInput = ref('');
        const array_tipodocumento = ref([]);
        const tipoDoc = ref({
            id: 0,
            descripcion: '',
        });
        const fechaDoc = ref(getDiaActual());
        const montoDoc = ref(0);

        watch(showModal, () => {
            file.value = null;
            valueInput.value = '';
        });

        onMounted(async () => {
            const response = (await fetchGetTipoDocumento({ estado: 1 })) as VersaFetchResponse | boolean;
            if (response !== false) {
                array_tipodocumento.value = response;
            }
        });

        return {
            file,
            valueInput,
            array_tipodocumento,
            tipoDoc,
            fechaDoc,
            montoDoc,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion: AccionData) {
            const actions: actionsType = {
                closeModal: () => {
                    this.$emit('accion', { accion: 'closeModal' });
                },
                updateData: () => this.asociarFactura(accion.newData),
                addFiles: () => {
                    this.file = accion.files;
                },
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        async asociarFactura(nfactura) {
            const form = $dom('#formAsociaFactura');
            if (!(form instanceof HTMLFormElement)) return;

            const currentState = blockedForm(form, 'true');
            if (!validateFormRequired(form)) {
                show_toast('Error', 'Debe completar los campos requeridos');
                blockedForm(form, 'false', currentState);
                return;
            }

            if (nfactura === '' || nfactura === null || isNaN(nfactura) || nfactura === '0' || !isNumber(nfactura)) {
                show_toast('Error', 'El Nº de factura debe ser numerico');
                blockedForm(form, 'false', currentState);
                return;
            }
            if (this.valorDoc === 0) {
                show_toast('Error', 'El monto de la factura no puede ser 0');
                blockedForm(form, 'false', currentState);
                return;
            }

            if (this.file === null) {
                show_toast('Error', 'Debe cargar el documento de la factura');
                blockedForm(form, 'false', currentState);
                return;
            }

            const result = await Swal.fire({
                title: 'Estás seguro de asociar la factura?',
                text: 'No podras revertir esta acción!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, estoy seguro!',
                cancelButtonText: 'No, cancelar!',
            });
            if (result.isConfirmed) {
                const formData = new FormData();
                formData.append('file', this.file.file);
                formData.append('dataFile', JSON.stringify(this.file));
                formData.append('nfactura', nfactura);
                formData.append('guiasSelected', JSON.stringify(this.guiasSelected));
                formData.append('proveedor', this.guiasSelected[0].rut_proveedor);
                formData.append('tipoDoc', this.tipoDoc.id);
                formData.append('fechaDoc', this.fechaDoc);
                formData.append('montoDoc', this.montoDoc);

                const response = await versaFetch({
                    method: 'POST',
                    url: '/api/IngresoasociarGuiaFactura',
                    data: formData,
                });
                blockedForm(form, 'false', currentState);
                if (response.success === 1) {
                    versaAlert({
                        title: 'Exito',
                        message: response.message,
                        type: 'success',
                        callback: () => {
                            this.$emit('accion', {
                                accion: 'closeModal',
                            });
                            this.$emit('accion', {
                                accion: 'reloadData',
                            });
                        },
                    });
                    return;
                }
                versaAlert({
                    title: 'Error',
                    message: response.message,
                    type: 'error',
                });
            }
        },
    },
    template: html`
        <newModal :showModal="showModal" @accion="accion" idModal="modalInputFactura" key="modalInputFactura">
            <template v-slot:title>Asociar Factura</template>
            <template v-slot:body>
                <form id="formAsociaFactura">
                    <div class="row px-2">
                        <div class="col col-md-4">
                            <div>
                                <inputDataList
                                    id="modalInputFactura_tipoDocumento"
                                    :fieldsReturn="{ idField:'id', descripcionField:'descripcion'}"
                                    :list="array_tipodocumento"
                                    :msgItem="['descripcion']"
                                    :value="{ idField:tipoDoc.id, descripcionField: tipoDoc.descripcion}"
                                    @changeDataList="tipoDoc.id = $event.idField;tipoDoc.descripcion=$event.descripcionField"
                                    itemValueOption="id"
                                    key="tipoDocumento"
                                    label="Tipo Documento"
                                    :required="true" />
                            </div>
                            <div>
                                <facturaasociada :iddoc="0" :file="file" @accion="accion" />
                            </div>
                            <div class="row">
                                <div class="col col-md-6">
                                    <label for="txtInput_1_fecha">Fecha</label>
                                    <input
                                        id="txtInput_1_fecha"
                                        type="date"
                                        v-model="fechaDoc"
                                        class="form-control"
                                        required />
                                </div>
                                <div class="col col-md-6">
                                    <label for="txtInput_1_monto">Monto</label>
                                    <input
                                        id="txtInput_1_monto"
                                        type="number"
                                        v-model="montoDoc"
                                        class="form-control"
                                        required />
                                </div>
                            </div>
                            <div>
                                <label for="txtInput_1_nfactura">Nº Factura</label>
                                <inputEditable
                                    :data="valueInput"
                                    :id="1"
                                    :showCancelButton="false"
                                    @accion="accion"
                                    field="nfactura"
                                    from="2"
                                    key="mIFactura"
                                    :required="true" />
                            </div>
                        </div>
                        <div class="col col-md-8 table-responsive">
                            <table class="table">
                                <thead>
                                    <th>Folio</th>
                                    <th>Fecha</th>
                                    <th>TipoDoc</th>
                                    <th>Documento</th>
                                    <th>OC SAP</th>
                                    <th>Orden Compra</th>
                                    <th>PreIngreso</th>
                                    <th>HES/MIGO</th>
                                </thead>
                                <tbody>
                                    <tr v-for="(item, index) in guiasSelected">
                                        <td>{{item.id}}</td>
                                        <td>{{item.created_at}}</td>
                                        <td>{{item.desc_tipodoc}}</td>
                                        <td>{{item.ndocumento}}</td>
                                        <td>{{item.ocsap}}</td>
                                        <td>{{item.ordencompra}}</td>
                                        <td>{{item.id_preingreso}}</td>
                                        <td>{{item.hesmigo}}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </form>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-secondary" @click="accion({'accion': 'closeModal'})">
                    Cerrar
                </button>
            </template>
        </newModal>
    `,
});

Vue.component('consulta', {
    setup() {
        const desde = ref();
        const hasta = ref();
        const data = ref([]);

        hasta.value = getDiaActual();
        desde.value = addDias(hasta.value, -30);

        const showModal = ref(false);
        const ShowModalFiles = ref(false);

        const getSOCByDates = async (/** @type {Object} */ params) => {
            const response = await versaFetch({
                url: '/api/get_bodega_preingresos_ppal',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    desde: params.desde,
                    hasta: params.hasta,
                }),
            });
            return response;
        };

        const typeFiles = computed(() => usePPalStore.state.FileTypeValid);
        return {
            desde,
            hasta,
            getSOCByDates,
            showModal,
            ShowModalFiles,
            typeFiles,
            data,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion: AccionData) {
            const actions: actionsType = {
                viewAprobators: () => this.viewAprobators(accion.id),
                viewFiles: () => this.viewFiles(accion.id),
                closeModal: () => {
                    this.showModal = false;
                    this.ShowModalFiles = false;
                },
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        getType(type) {
            const typeSearch = this.typeFiles.find(item => item.type === type);
            if (typeSearch === undefined) return 'bi bi-file-earmark';
            return `${typeSearch.color} ${typeSearch.icon}`;
        },
        async loadPreIngresoByDates() {
            const data = await this.getSOCByDates({
                desde: this.desde,
                hasta: this.hasta,
            });
            if (Number(data.success) === 1) {
                this.data = data.data;
                if ($('#tableResult').find('tr').children().length > 0) {
                    $('#tableResult').find('tr').children().remove();
                    $('#tableResult').find('tbody').remove();
                    // @ts-ignore
                    $('#tableResult').DataTable().destroy();
                    $('#tableResult').empty();
                }

                $('#tableResult').DataTable({
                    language: {
                        search: 'Buscar:',
                        zeroRecords: 'No hay datos para mostrar',
                        info: 'Mostrando _END_ Registros, de un total de _TOTAL_ ',
                        loadingRecords: 'Cargando...',
                        processing: 'Procesando...',
                        infoEmpty: 'No hay entradas para mostrar',
                        lengthMenu: 'Mostrar _MENU_ Filas',
                        paginate: {
                            first: 'Primera',
                            last: 'Ultima',
                            next: 'Siguiente',
                            previous: 'Anterior',
                        },
                        decimal: ',',
                        thousands: '.',
                    },
                    columnDefs: data.encabezado,
                    columns: [
                        { data: 'id' },
                        {
                            data: 'id',
                            render: (data, type, row) => html`
                                <div class="d-flex gap-2">
                                    <button
                                        type="button"
                                        class="btn btn-success btn-sm"
                                        data-value='{"accion": "verPreIngreso", "id": ${row.id} }'
                                        name="pasarella"
                                        title="Ver Archivos">
                                        <i class="fa fa-eye" aria-hidden="true"></i>
                                    </button>
                                    ${row.archivo
                                        ? html`
                                              <button
                                                  type="button"
                                                  class="btn btn-info btn-sm"
                                                  data-value='{"accion": "verFactura", "id": ${row.id}, "ruta": "${row.ruta}", "type" : "${row.type}" }'
                                                  name="pasarella"
                                                  title="Ver Archivos: ${row.archivo}">
                                                  <i class="${this.getType(row.type)}" aria-hidden="true"></i>
                                              </button>
                                          `
                                        : ''}
                                </div>
                            `,
                        },
                        { data: 'name' },
                        { data: 'created_at' },
                        { data: 'ndoc' },
                        { data: 'fecha' },
                        { data: 'ocsap' },
                        {
                            data: 'total_documento',
                            render: data => html`
                                <div class="text-right">${format_number_n_decimal(data, 1)}</div>
                            `,
                        },
                        { data: 'nombre' },
                        { data: 'desc_campus' },
                        { data: 'desc_area' },
                        { data: 'observacion' },
                    ],
                    data: data.data,
                    info: true,
                    searching: true,
                    paging: true,
                    responsive: true,
                    lengthMenu: [
                        [5, 10, 25, 50, -1],
                        [5, 10, 25, 50, 'Todos'],
                    ],
                    pageLength: 10,
                    dom:
                        "<'row'<'col-sm-12 col-md-4'l><'col-sm-12 col-md-4'B><'col-sm-12 col-md-4'f>>" +
                        "<'row'<'col-sm-12'tr>>" +
                        "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
                    buttons: ['excelHtml5'],
                });

                $('#tableResult').DataTable().columns.adjust().draw();
            }
        },
        viewAprobators(/** @type {Number} */ id) {
            this.aprobators = [];
            this.getAprobators(id).then((/** @type {Object} */ data) => {
                if (Number(data.success) === 1) {
                    this.aprobators = data.data;
                    this.showModal = true;
                }
            });
        },
        viewFiles(/** @type {number} */ id) {
            this.files = [];
            this.viewAllFiles(id).then((/** @type {Object} */ data) => {
                this.files = data;
                this.ShowModalFiles = true;
            });
        },
        exportExcel() {
            if (this.data.length === 0) return;
            const newData = this.data.map((index, item) => {
                return {
                    index: index + 1,
                    rut_proveedor: item.DocFinalRutProveedor,
                    nombre_proveedor: item.nombre,
                    Factura_Nro: item.DocFinalDocumento,
                    Fecha: item.DocFinalFechaDocumento,
                    Monto: item.DocFinalTotalDocumento,
                    OC_SISTEMA: item.DocFinalOrdenCompra,
                    HES_MIGO: item.DocFinalHesMigo,
                    FECHA_ENVIA_PAGO: getDiaActual(),
                };
            });

            createXlsxFromJson(newData, 'preingreso');
        },
    },
    watch: {
        functionPasarella(val) {
            if (val !== null) {
                this.accion(val);
            }
        },
    },
    template: html`
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-md-3">
                        <input id="desde" type="date" class="form-control" v-bind:max="hasta" v-model="desde" />
                    </div>
                    <div class="col-md-3">
                        <input id="hasta" type="date" class="form-control" v-bind:min="desde" v-model="hasta" />
                    </div>
                    <div class="col-md-1">
                        <button
                            type="button"
                            class="btn btn-success btn-sm"
                            @click="loadPreIngresoByDates"
                            title="Procesar Busqueda...">
                            <i class="fa fa-search" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body px-0">
                    <div class="col col-md-12">
                        <table id="tableResult" class="table table-bordered table-striped table-hover"></table>
                    </div>
                </div>
            </div>
        </div>
    `,
});

Vue.component('modalViewPreIngreso', {
    components: { newModal },
    props: {
        showModal: {
            type: Boolean,
            required: true,
        },
        idPreIngreso: {
            type: Number,
            default: 0,
        },
    },
    setup(props) {
        const showModal = computed(() => props.showModal);
        const urlBase = new URL(window.location.href);
        const campusSessions = computed(() => usePPalStore.state.campusSessions);

        const urlViewPreIngreso = computed(
            () =>
                `${urlBase.origin}/externo/bodega_preingreso_pdf/${props.idPreIngreso}?campus=${campusSessions.value}&origen=ppal`
        );

        const getHtmlUrl = async (/** @type {String} */ url) => {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'text/html',
                },
            });
            if (response.status === 200) {
                const data = await response.text();
                return data;
            }
            return 'Error al cargar el contenido';
        };

        watch(showModal, async val => {
            const iframeHtml = document.getElementById('iframePreIngreso');
            if (!(iframeHtml instanceof HTMLIFrameElement)) return;

            if (val) {
                const response = await getHtmlUrl(urlViewPreIngreso.value);
                iframeHtml.srcdoc = response;
                iframeHtml.onload = () => {
                    const iframe = iframeHtml?.contentDocument || iframeHtml?.contentWindow.document;
                    const body = iframe.body;
                    body.style.margin = '10px';
                    body.style.padding = '10px';
                };
            } else {
                iframeHtml.srcdoc = '';
            }
        });

        return {
            urlViewPreIngreso,
        };
    },
    methods: {
        accion(accion: AccionData) {
            const actions: actionsType = {
                closeModal: () => {
                    this.$emit('accion', { accion: 'closeModal' });
                },
                default: () => show_toast('Error', 'Accion no definida'),
            };

            const selectedAction = actions[accion.accion] || actions.default;
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        imprimirPreIngreso() {
            const iframeHtml = document.getElementById('iframePreIngreso');
            if (!(iframeHtml instanceof HTMLIFrameElement)) {
                return;
            }

            iframeHtml.contentWindow.print();
        },
    },
    template: html`
        <newModal
            :idModal="'modalViewPreIngreso'"
            :showModal="showModal"
            @accion="accion"
            key="modalViewPreIngreso"
            size="max-w-7xl">
            <template v-slot:title>Pre Ingreso Nº {{ idPreIngreso }}</template>
            <template v-slot:body>
                <iframe id="iframePreIngreso" style="width: 100%;height: 500px;"></iframe>
            </template>
            <template v-slot:footer>
                <div class="flex justify-between">
                    <button type="button" class="btn btn-default" @click="accion({'accion':'closeModal'})">
                        Cerrar
                    </button>
                    <button type="button" class="btn btn-success" @click="imprimirPreIngreso">Imprimir</button>
                </div>
            </template>
        </newModal>
    `,
});

const ppalPreIngreso = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    store: usePPalStore,
    methods: {
        ...Vuex.mapMutations(['SET_FUNCTIONS_PASARELLA']),
        pasarella: function (param) {
            this.SET_FUNCTIONS_PASARELLA(param);
        },
    },
});

document.addEventListener('click', event => {
    pasarella(ppalPreIngreso, event);
});
