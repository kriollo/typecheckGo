import newModal from '@/jscontrollers/components/newModal';
import modalEditLine from '@/jscontrollers/geda/asingancion/modalEditLine';

import { $dom } from '@/jscontrollers/composables/dom-selector';
import { versaAlert, versaFetch } from '@/jscontrollers/composables/utils';
import { generateFileBarCode } from '@/jscontrollers/geda/fechGeda';
import { useGEDAStore } from '@/jscontrollers/stores/dependencias';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { ref, defineComponent, computed, watchEffect, watch } = Vue;

import customTable from '@/jscontrollers/components/customTable';
import iRadio from '@/jscontrollers/components/iRadio';
import inputDataList from '@/jscontrollers/components/inputDataList';
/* eslint-disable */
const ct = customTable;
const ir = iRadio;
const idl = inputDataList;
/* eslint-enable */

export default defineComponent({
    name: 'showModalValeSalida',
    components: { newModal, modalEditLine },
    emits: ['accion'],
    props: {
        vale: {
            type: Object,
            required: true,
        },
        showModal: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const showModal = computed(() => props.showModal);

        const lastDependenciaSelected = ref({});

        const ValeSelected = computed(() => props.vale);

        const data = ref([]);
        const showModalEditLine = ref(false);
        const ItemSelected = ref({});

        const dependencias = computed(() => useGEDAStore.state.dependencias);

        const getDetalleValeSalida = () => {
            data.value = [];
            versaFetch({
                method: 'POST',
                url: '/api/GEDA_getDetalleValeSalida',
                headers: { 'content-type': 'application/json' },
                data: JSON.stringify({ id: ValeSelected.value.id }),
            }).then(
                /** @type {{ success: Number; data: Array; }} */ response => {
                    if (response.success === 1) {
                        data.value = response.data;
                    }
                }
            );
        };

        watchEffect(() => {
            if (ItemSelected.value.id !== undefined) {
                const item = $dom(`.table-info`);
                if (!(item instanceof HTMLElement)) return;

                if (item !== null) {
                    const top = item.offsetTop - 100;
                    const modalBody = $dom('#modal-body_modalValeSalida');
                    if (modalBody !== null && Number(item.id) > 5) {
                        modalBody.scrollTop = top;
                    } else {
                        modalBody.scrollTop = 0;
                    }
                }
            }
        });

        watch(
            showModal,
            () => {
                if (showModal.value) {
                    getDetalleValeSalida();
                } else {
                    lastDependenciaSelected.value = {};
                }
            },
            { immediate: true }
        );

        return {
            showModal,
            data,
            ValeSelected,
            showModalEditLine,
            ItemSelected,
            dependencias,
            lastDependenciaSelected,
        };
    },
    methods: {
        accion(accion) {
            const actions = {
                closeModal: () => this.$emit('accion', accion),
                closeModalEditline: () => (this.showModalEditLine = false),
                up: () => this.upItem(accion.form),
                down: () => this.downItem(accion.form),
                saveCloseEdit: () => this.saveCloseEdit(accion.form),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        OpenModalEditLine(item) {
            this.ItemSelected = item;
            this.showModalEditLine = true;
        },
        upItem(form) {
            this.updateData(form);
            let id = this.ItemSelected.id;
            if (id === 0) return;
            id -= 1;

            this.ItemSelected = this.data.find(item => item.id === id);
        },
        downItem(form) {
            this.updateData(form);
            let id = this.ItemSelected.id;
            if (id + 1 === this.data.length) return;
            id += 1;

            this.ItemSelected = this.data.find(item => item.id === id);
        },
        async updateData(form) {
            this.data = await this.data.map(item => {
                if (item.id === form.id) {
                    const desc_dependencia = this.dependencias.find(value => value.codigo === form.cod_dependencia);
                    if (desc_dependencia !== undefined) {
                        form.desc_dependencia = desc_dependencia.desc_dependencia;
                    }

                    this.lastDependenciaSelected = {
                        cod_dependencia: form.cod_dependencia,
                        desc_dependencia: form.desc_dependencia,
                    };

                    return form;
                }
                return item;
            });
        },
        saveCloseEdit(form) {
            this.updateData(form);
            this.showModalEditLine = false;
        },
        async asignaMaterial() {
            if (
                this.data.some(
                    item =>
                        item.serie === '' ||
                        item.cod_sap === '' ||
                        item.categoria === '' ||
                        item.cod_dependencia === '' ||
                        item.propiedad === '' ||
                        item.fecha_revision === ''
                )
            ) {
                versaAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'Debe completar todos los campos',
                });
                return;
            }

            const result = await Swal.fire({
                title: '¿Está seguro de asignar los materiales?',
                showCancelButton: true,
                confirmButtonText: 'Si',
                cancelButtonText: 'No',
                icon: 'question',
            });
            if (result.isConfirmed) {
                versaFetch({
                    method: 'POST',
                    url: '/api/GEDA/asignaMaterialValeSalida',
                    headers: { 'content-type': 'application/json' },
                    data: JSON.stringify({
                        data: this.data,
                        id_vale: this.ValeSelected.id,
                    }),
                }).then(
                    /** @type {{ success: Number; messge: string; }} */ response => {
                        versaAlert({
                            type: response.success === 1 ? 'success' : 'error',
                            title: response.success === 1 ? 'Correcto' : 'Error',
                            message: response.message,
                        });
                        if (response.success === 1) {
                            this.$emit('accion', {
                                accion: 'refresh-table',
                            });
                            this.$emit('accion', { accion: 'closeModal' });
                        }
                    }
                );
            }
        },
        async generarFileBarCode() {
            const code = await generateFileBarCode(this.data);
            if (code === '') {
                versaAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'No se encontraron registros para generar el archivo o existen registros incompletos',
                });
                return;
            }
            //descargar archivo
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `file${this.ValeSelected.id}PrintCode.zpl`;
            a.click();

            //eliminar url de objeto y  elemento a
            URL.revokeObjectURL(url);
            a.remove();
        },
    },
    template: html`
        <div v-if="showModal">
            <newModal
                :escClose.bool="true"
                :showModal="showModal"
                @accion="accion"
                idModal="modalValeSalida"
                key="modalValeSalida"
                size="max-w-7xl">
                <template v-slot:title>Asigna Material vale de salida Nº {{ ValeSelected.id }}</template>
                <template v-slot:body>
                    <table class="table table-bordered table-striped table-responsive">
                        <thead>
                            <tr>
                                <th>Acción</th>
                                <th>Codigo</th>
                                <th>Descripción</th>
                                <th>Código Activo</th>
                                <th>Código SAP</th>
                                <th>Cátegoria</th>
                                <th>Dependencia</th>
                                <th>Propiedad</th>
                                <th>Fecha de Revisión</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr :class="{ 'active': item.id === ItemSelected.id }" :id="item.id" v-for="item in data">
                                <td>
                                    <button type="button" class="btn btn-primary" @click="OpenModalEditLine(item)">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </td>
                                <td>{{ item.codigo }}</td>
                                <td>{{ item.desc_codigo }}</td>
                                <td>{{ item.codigo_activo }}</td>
                                <td>{{ item.cod_sap }}</td>
                                <td>{{ item.categoria }}</td>
                                <td>{{ item.desc_dependencia }}</td>
                                <td>{{ item.propiedad }}</td>
                                <td>{{ item.fecha_revision }}</td>
                            </tr>
                        </tbody>
                    </table>
                </template>
                <template v-slot:footer>
                    <div class="flex justify-between">
                        <button type="button" class="btn btn-secondary" @click="accion({ accion: 'closeModal' })">
                            Cerrar
                        </button>
                        <button type="button" class="btn btn-primary" @click="generarFileBarCode">
                            <i class="bi bi-printer"></i>
                            Generar Archivo de Codigos de Barras
                        </button>
                        <button type="button" class="btn btn-success" @click="asignaMaterial">Asignar</button>
                    </div>
                </template>
            </newModal>

            <modalEditLine
                :dataLength="(data.length)-1"
                :item="ItemSelected"
                :lastDependenciaSelected="lastDependenciaSelected"
                :showModal="showModalEditLine"
                @accion="accion"
                key="modalEditLine"
                v-if="showModal" />
        </div>
    `,
});
