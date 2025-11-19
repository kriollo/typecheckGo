import { fecthCampus, fetchProyectos, fetchgetProveedores } from '@/jscontrollers/composables/fetching.js';
import { createXlsxFromJson } from '@/jscontrollers/composables/useXlsx';
import {
    addDias,
    format_number_n_decimal,
    format_number_n_decimal_us,
    getDiaActual,
    pasarella,
    show_toast,
    versaAlert,
    versaFetch,
} from '@/jscontrollers/composables/utils';
import { cgestion, comparativo, participantes } from '@/jscontrollers/solicitudordencompra/componentsSOC.js';
import {
    TOPE_RETENCION,
    fetchAddAprobator,
    fetchAprobatorsById,
    fetchCGestionBySOCId,
    fetchFilesById,
    fetchaprobMakeHESMIGO,
} from '@/jscontrollers/solicitudordencompra/composableSOC.js';
import { usePPalStore } from '@/jscontrollers/usePPalStore.js';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm.js';

import customTable from '@/jscontrollers/components/customTable.js';
import iCheck from '@/jscontrollers/components/iCheck.js';
import inputEditable from '@/jscontrollers/components/inputEditable.js';
import iRadio from '@/jscontrollers/components/iRadio.js';
import loader from '@/jscontrollers/components/loading.js';
import newModal from '@/jscontrollers/components/newModal';
import configUserCgestion from '@/jscontrollers/solicitudordencompra/controlgestion/configUserCgestion.js';
// import CG_components from '@/jscontrollers/solicitudordencompra/controlgestion_components.js';
import dropZone from '@/jscontrollers/components/dropZone';

import type { AccionData, VersaFetchResponse, actionsType } from 'versaTypes';

const { ref, computed, watch, reactive, inject, provide, onMounted } = Vue;

/* eslint-disable */
const dp = dropZone;
const ic = iCheck;
// const CG = CG_components;
const ct = customTable;
const ld = loader;
const ie = inputEditable;
const ir = iRadio;
const cu = configUserCgestion;
/* eslint-enable */

Vue.component('ppal', {
    setup() {
        const loading = inject('loading');
        const tipoSocSelected = reactive({
            1: 'todos',
            2: 'todos',
            99: 'todos',
        });

        const estado = {
            1: 'PorOC',
            2: 'PorSOLHESMIGO',
            4: 'PorSOLHESMIGO',
            3: 'PorHESMIGO',
            99: 'PorFACTURAR',
        };

        const state = reactive({
            PorOC: 0,
            PorSOLHESMIGO: 0,
            PorHESMIGO: 0,
            PorFACTURAR: 0,
        });

        const result = reactive({
            PorOC: [],
            PorSOLHESMIGO: [],
            PorHESMIGO: [],
            PorFACTURAR: [],
        });

        const loadState = async () => {
            const data = (await versaFetch({
                url: '/api/getResumeCountCGestion',
                method: 'POST',
            })) as unknown as any[];

            state.PorOC = 0;
            state.PorSOLHESMIGO = 0;
            state.PorHESMIGO = 0;
            state.PorFACTURAR = 0;

            state.PorOC += +(data.find(item => Number(item.estado_cgestion) === 1)?.total ?? 0);
            state.PorSOLHESMIGO += +(data.find(item => Number(item.estado_cgestion) === 2)?.total ?? 0);
            state.PorHESMIGO += +(data.find(item => Number(item.estado_cgestion) === 3)?.total ?? 0);
            state.PorFACTURAR += +(data.find(item => Number(item.estado_cgestion) === 99)?.total ?? 0);
        };
        const loadSOCByState = async (/** @type {Number} */ estado_cgestion) => {
            loading.value = true;
            if (Number(estado_cgestion) === 99) {
                const data = (await versaFetch({
                    url: '/api/getHESMIGOPorFacturar',
                    method: 'POST',
                    data: JSON.stringify({
                        tipoSoc: tipoSocSelected[estado_cgestion],
                    }),
                    headers: { 'Content-Type': 'application/json' },
                })) as VersaFetchResponse | false;
                if (data === false) result[estado[estado_cgestion]] = [];
                else result[estado[estado_cgestion]] = data;
            } else {
                const data = (await versaFetch({
                    url: '/api/getSOCsByEstado',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        estado_solicitante: 2,
                        estado_cgestion: estado_cgestion,
                        origen: 'cgestion',
                        tipoSoc: tipoSocSelected[estado_cgestion],
                    }),
                })) as VersaFetchResponse | false;
                if (data === false) result[estado[estado_cgestion]] = [];
                else result[estado[estado_cgestion]] = data;
            }
            loading.value = false;
            loadState();
        };
        loadSOCByState(1);

        const files = ref([]);
        const aprobators = ref([]);
        const cgestion = ref([]);
        const showModalAprob = ref(false);
        const ShowModalFiles = ref(false);
        const showModalCGestion = ref(false);
        const origen = ref('');

        const countSocPendientes = ref(0);
        const refreshData = ref(false);
        const otherFilters = ref('');

        const getCGestionBySOCId = async (id: number) => fetchCGestionBySOCId(id);
        const viewAllFiles = async (id: number) => fetchFilesById(id);
        const getAprobators = async (id: number) => fetchAprobatorsById(id);

        const userSistema = inject('userSistema');

        const fromViewComparativo = ref(1);

        const id_encabezado_soc = ref(0);

        const proveedor = ref([]);
        onMounted(async () => {
            const result = await fetchgetProveedores({ estado: 1 });
            proveedor.value = result;
        });
        provide('proveedor', proveedor);

        return {
            state,
            result,
            loadSOCByState,
            files,
            aprobators,
            cgestion,
            showModalAprob,
            ShowModalFiles,
            showModalCGestion,
            viewAllFiles,
            getAprobators,
            getCGestionBySOCId,
            userSistema,
            id_encabezado_soc,
            countSocPendientes,
            refreshData,
            otherFilters,
            loading,
            tipoSocSelected,
            estado,
            fromViewComparativo,
            origen,
        };
    },
    methods: {
        accion(accion: AccionData) {
            const actions: actionsType = {
                loadSOCByState: () => this.loadSOCByState(accion.estado_cgestion),
                loadSOCByStateComponente: () => this.loadSOCByState(this.fromViewComparativo),
                viewFiles: () => {
                    switch (accion.from) {
                        case 'PorOC':
                            this.fromViewComparativo = 1;
                            break;
                        case 'PorSOLHESMIGO':
                            this.fromViewComparativo = 2;
                            break;
                        case 'PorHESMIGO':
                            this.fromViewComparativo = 3;
                            break;
                        case 'PorFACTURAR':
                            this.fromViewComparativo = 99;
                            break;
                        default:
                            this.fromViewComparativo = 1;
                            break;
                    }
                    this.origen = accion.from;
                    this.viewFiles(accion.id);
                },
                viewAprobators: () => this.viewAprobators(accion.id),
                viewFilesPend: () => {
                    this.fromViewComparativo = 1;
                    this.viewFiles(accion.item.id);
                },
                viewAprobatorsPend: () => this.viewAprobators(accion.item.id),
                viewCGestion: () => this.viewCGestion(accion.id),
                closeModal: () => {
                    this.ShowModalFiles = false;
                    this.showModalAprob = false;
                    this.showModalCGestion = false;
                },
                newParticipante: () => this.newParticipante(),
                updatePrioridadCGSOC: () => this.updatePrioridadCGSOC(accion),
                updateObservacionCG: () => this.updateObservacionCG(accion),
                filterTable: () => {
                    const estado = Object.keys(this.estado).find(
                        key => this.estado[key].toLowerCase() === accion.from.toLowerCase()
                    );
                    if (accion.tipoSocSelected === 'exportExcel') {
                        this.exportExcel(Number(estado));
                        return;
                    }

                    this.tipoSocSelected[estado] = accion.tipoSocSelected;
                    this.loadSOCByState(Number(estado));
                },
                reloadParticipantes: () => {
                    this.showModalAprob = false;
                    this.viewAprobators(accion.idSoc);
                },
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        viewFiles(/** @type {number} */ id) {
            this.files = [];
            this.viewAllFiles(id).then((/** @type {Object} */ data) => {
                this.files = data;
                this.ShowModalFiles = true;
            });
        },
        viewAprobators(/** @type {Number} */ id) {
            this.aprobators = [];
            this.getAprobators(id).then((/** @type {Object} */ data) => {
                if (data.success === 1) {
                    this.id_encabezado_soc = id;
                    this.aprobators = data.data;
                    this.showModalAprob = true;
                }
            });
        },
        viewCGestion(/** @type {Number} */ id) {
            this.cgestion = [];
            this.getCGestionBySOCId(id).then((/** @type {Object} */ data) => {
                this.cgestion = data;
                this.showModalCGestion = true;
            });
        },
        async newParticipante() {
            const htmlSwal = html`
                <div class="col col-md-12">
                    <input
                        type="text"
                        list="baseParticipantes"
                        ref="txtParticipante"
                        id="newParticipante"
                        class="form-control" />
                    <datalist id="baseParticipantes">
                        <option v-for="item in userSistema" :value="item.email">{{ item.name }}</option>
                    </datalist>
                </div>
            `;

            const result = await Swal.fire({
                title: 'Seleccione a Nuevo Participante',
                html: htmlSwal,
                showCancelButton: true,
                confirmButtonText: 'Agregar',
                cancelButtonText: 'Cancelar',
                showLoaderOnConfirm: true,
                preConfirm: () => {
                    const $select = document.querySelector('#newParticipante');
                    if ($select instanceof HTMLInputElement) {
                        if ($select.value.trim() === '') {
                            Swal.showValidationMessage('Debe seleccionar un participante');
                            return undefined;
                        }

                        const findAprobator = this.aprobators.find(item => item.email === $select.value);
                        if (findAprobator) {
                            Swal.showValidationMessage('Participante ya se encuentra agregado');
                            return undefined;
                        }

                        const idUserParticipante = this.userSistema.find(item => item.email === $select.value)?.id_user;
                        return idUserParticipante;
                    }
                },
            });

            if (result.isConfirmed && result.value) {
                const data = await fetchAddAprobator({
                    id_soc: this.id_encabezado_soc,
                    id_user: result.value,
                });
                if (data.success === 1) {
                    versaAlert({
                        title: 'Participante Agregado',
                        message: data.message,
                        type: 'success',
                        callback: () => {
                            this.viewAprobators(this.id_encabezado_soc);
                        },
                    });
                } else {
                    versaAlert({
                        title: 'Error al agregar participante',
                        message: data.message,
                        type: 'error',
                    });
                }
            }
        },
        async updatePrioridadCGSOC(/** @type {Object} */ data) {
            const response = await versaFetch({
                method: 'POST',
                url: '/api/updatePrioridadCGSOC',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id: data.id,
                    prioridad: data.prioridad,
                }),
            });

            if (response.success === 0) {
                versaAlert({
                    title: 'Error al actualizar prioridad',
                    message: response.message,
                    type: 'error',
                });
            }
        },
        async updateObservacionCG(/** @type {Object} */ data) {
            const response = await versaFetch({
                method: 'POST',
                url: '/api/updateObservacionCGSOC',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id: data.id,
                    observacion: data.observacion_cg,
                    id_hesmigo: data?.id_hesmigo,
                }),
            });

            if (response.success === 0) {
                versaAlert({
                    title: 'Error al actualizar observación',
                    message: response.message,
                    type: 'error',
                });
            }
        },
        async exportExcel(/** @type {Number} */ estado_cgestion) {
            //debo borrar de la data la columna token_files
            const data = this.result[this.estado[estado_cgestion]];

            data.forEach(item => {
                delete item.token_files;
            });

            if (data.length > 0) {
                await createXlsxFromJson(data, this.estado[estado_cgestion]);
            }
        },
    },
    template: html`
        <div class="col col-md-12">
            <div class="card card-info card-outline card-outline-tabs">
                <div class="card-header p-0 border-bottom-0">
                    <ul class="nav nav-tabs" id="custom-tabs-four-tab" role="tablist">
                        <li class="nav-item">
                            <a
                                class="nav-link active"
                                id="custom-tabs-Por_OC-tab"
                                data-toggle="pill"
                                href="#Por_OC"
                                role="tab"
                                aria-controls="Por_OC-tab"
                                aria-selected="true"
                                @click="loadSOCByState(1)">
                                Pendiente por OC ( {{ state.PorOC }} )
                            </a>
                        </li>
                        <li class="nav-item">
                            <a
                                class="nav-link"
                                id="custom-tabs-Por_PendSOLHESMIGO-tab"
                                data-toggle="pill"
                                href="#Por_PendSOLHESMIGO"
                                role="tab"
                                aria-controls="Por_PendSOLHESMIGO-tab"
                                aria-selected="true"
                                @click="loadSOCByState(2)">
                                Pendiente por Solicitar HES/MIGO ( {{ state.PorSOLHESMIGO }} )
                            </a>
                        </li>
                        <li class="nav-item">
                            <a
                                class="nav-link"
                                id="custom-tabs-Por_HESMIGO-tab"
                                data-toggle="pill"
                                href="#Por_HESMIGO"
                                role="tab"
                                aria-controls="Por_HESMIGO-tab"
                                aria-selected="false"
                                @click="loadSOCByState(3)">
                                En HES/MIGO ( {{ state.PorHESMIGO }} )
                            </a>
                        </li>
                        <li class="nav-item">
                            <a
                                class="nav-link"
                                id="custom-tabs-Por_FACTURAR-tab"
                                data-toggle="pill"
                                href="#Por_FACTURAR"
                                role="tab"
                                aria-controls="Por_FACTURAR-tab"
                                aria-selected="false"
                                @click="loadSOCByState(99)">
                                Por Facturar ( {{ state.PorFACTURAR }} )
                            </a>
                        </li>
                        <li class="nav-item">
                            <a
                                class="nav-link"
                                id="custom-tabs-Consulta-tab"
                                data-toggle="pill"
                                href="#Consulta"
                                role="tab"
                                aria-controls="Consulta-tab"
                                aria-selected="false">
                                Consulta Por Fechas
                            </a>
                        </li>
                        <li class="nav-item">
                            <a
                                class="nav-link"
                                id="custom-tabs-SOCpendientes-tab"
                                data-toggle="pill"
                                href="#SOCpendientes"
                                role="tab"
                                aria-controls="SOCpendientes-tab"
                                aria-selected="false"
                                @click="refreshData = !refreshData">
                                SOC Pendientes de Aprobación ( {{ countSocPendientes }} )
                            </a>
                        </li>
                    </ul>
                </div>
                <div class="card-body px-2">
                    <div class="tab-content" id="custom-tabs-four-tabContent">
                        <div class="tab-pane fade active show" id="Por_OC" role="tabpanel" aria-labelledby="Por_OC-tab">
                            <por-oc :porAprobar="result.PorOC" @accion="accion"></por-oc>
                        </div>
                        <div
                            class="tab-pane fade"
                            id="Por_PendSOLHESMIGO"
                            role="tabpanel"
                            aria-labelledby="Por_PendSOLHESMIGO-tab">
                            <Por_PendSOLHESMIGO
                                :porPendSOLHESMIGO="result.PorSOLHESMIGO"
                                @accion="accion"></Por_PendSOLHESMIGO>
                        </div>
                        <div class="tab-pane fade" id="Por_HESMIGO" role="tabpanel" aria-labelledby="Por_HESMIGO-tab">
                            <por-hesmigo :porHESMIGO="result.PorHESMIGO" @accion="accion"></por-hesmigo>
                        </div>
                        <div class="tab-pane fade" id="Por_FACTURAR" role="tabpanel" aria-labelledby="Por_FACTURAR-tab">
                            <por-facturar :porFacturar="result.PorFACTURAR" @accion="accion"></por-facturar>
                        </div>
                        <div class="tab-pane fade" id="Consulta" role="tabpanel" aria-labelledby="Consulta-tab">
                            <consulta></consulta>
                        </div>
                        <div
                            class="tab-pane fade"
                            id="SOCpendientes"
                            role="tabpanel"
                            aria-labelledby="SOCpendientes-tab">
                            <customTable
                                id="SOCPendientes"
                                key="SOCPendientes"
                                titleTable="Pendiente de Aprobación"
                                url="/api/getSOCPendientesAprobacionPaginate"
                                :refresh="refreshData"
                                :externalFilters="otherFilters"
                                @accion="accion"
                                v-model="countSocPendientes" />
                        </div>
                    </div>
                </div>
                <participantes
                    :participantes="aprobators"
                    :showModal="showModalAprob"
                    @accion="accion"
                    origen="pendientes" />
                <comparativo :files="files" :showModal="ShowModalFiles" @accion="accion" :origen="origen" />
                <cgestion
                    key="consulta_cgestion"
                    id="consulta_cgestion"
                    :cgestion="cgestion"
                    :showModal="showModalCGestion"
                    @accion="accion" />
            </div>
        </div>
    `,
});

Vue.component('por-oc', {
    emits: ['accion'],
    props: {
        porAprobar: {
            type: Array,
            default: [],
        },
    },
    setup(props) {
        const porAprobar = computed(() => props.porAprobar);
        const dataFiltrada = ref([]);

        watch(porAprobar, newVal => {
            dataFiltrada.value = newVal;
        });
        const socSelected = ref(0);

        const ShowModaluploadOC = ref(false);

        const filter = ref('');

        const setFilter = () => {
            if (filter.value !== '') {
                dataFiltrada.value = porAprobar.value.filter(item => {
                    for (const key in item) {
                        if (
                            typeof item[key] === 'string' &&
                            item[key].toLowerCase().includes(filter.value.toLowerCase())
                        ) {
                            return true;
                        }
                    }
                });
            } else {
                dataFiltrada.value = porAprobar.value;
            }
        };

        return {
            socSelected,
            ShowModaluploadOC,
            filter,
            setFilter,
            dataFiltrada,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                closeModal: () => {
                    this.ShowModaluploadOC = false;
                },
                uploadOC: () => {
                    this.socSelected = +accion.id;
                    this.ShowModaluploadOC = true;
                },
                default: () => this.$emit('accion', accion),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
    },
    template: html`
        <div class="card">
            <uploadOC :showModal="ShowModaluploadOC" :socId="socSelected" @accion="accion"></uploadOC>
            <div class="card-header">
                <h3 class="card-title">Pendiente por Orden de Compra</h3>
                <div class="card-tools m-0">
                    <tipoSocFiltro from="PorOC" @accion="accion" key="porOC" />
                </div>
            </div>
            <div class="card-body ">
                <div class="row mb-2">
                    <div>
                        <div class="input-group">
                            <input
                                type="text"
                                class="form-control"
                                id="txtFilter_PorOC"
                                @keyup.enter="setFilter"
                                placeholder="Ingrese y presione 'Enter' para buscar"
                                v-model="filter" />
                            <div class="input-group-append">
                                <span class="input-group-text cursor-pointer" @click="setFilter">
                                    <i class="fas fa-search"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row table-responsive px-0">
                    <tableResultPorOC
                        :data="dataFiltrada"
                        tabOrigen="Pendientes"
                        @accion="accion"
                        key="pendientes"></tableResultPorOC>
                </div>
            </div>
        </div>
    `,
});
Vue.component('por-hesmigo', {
    emits: ['accion'],
    props: {
        porHESMIGO: {
            type: Array,
            default: [],
        },
    },
    setup(props) {
        const porHESMIGO = computed(() => props.porHESMIGO);
        const dataFiltrada = ref([]);
        const filter = ref([]);
        watch(porHESMIGO, newVal => {
            dataFiltrada.value = newVal;
        });

        const sendHESMIGOFETCH = async (/** @type {Object} */ data) => {
            const response = await versaFetch({
                url: '/api/sendHESMIGO',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id: data.id,
                    id_hesmigo: data.id_hesmigo,
                    hesmigo: data.hesmigo,
                }),
            });
            return response;
        };

        const setFilter = () => {
            if (filter.value !== '') {
                dataFiltrada.value = porHESMIGO.value.filter(item => {
                    for (const key in item) {
                        if (
                            typeof item[key] === 'string' &&
                            item[key].toLowerCase().includes(filter.value.toLowerCase())
                        ) {
                            return true;
                        }
                    }
                });
            } else {
                dataFiltrada.value = porHESMIGO.value;
            }
        };

        return {
            sendHESMIGOFETCH,
            filter,
            setFilter,
            dataFiltrada,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                sendHESMIGO: () => this.sendHESMIGO(accion),
                aprobHESMIGO: () => this.aprobHESMIGO(accion),
                default: () => this.$emit('accion', accion),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        async sendHESMIGO(/** @type {Object} */ accion) {
            if (accion.hesmigo.length !== 10) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al enviar Orden de Compra',
                    text: 'HES/MIGO debe tener 10 caracteres',
                });
                return;
            }

            const result = await Swal.fire({
                title: '¿Estas seguro?',
                text: '¿Está seguro que desea enviar?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
            });
            if (result.isConfirmed) {
                usePPalStore.commit('setShowLoader', true);
                const data = await this.sendHESMIGOFETCH(accion);
                if (data.success === 1) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Orden de Compra Enviada',
                        text: data.message,
                    });
                    this.$emit('accion', {
                        accion: 'loadSOCByState',
                        estado_cgestion: 3,
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al enviar Orden de Compra',
                        text: data.message,
                    });
                }
                usePPalStore.commit('setShowLoader', false);
            }
        },
        async aprobHESMIGO(/** @type {Object} */ accion) {
            const result = await Swal.fire({
                title: '¿Estas seguro?',
                text: '¿Está seguro que desea aprobar?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
            });
            if (result.isConfirmed) {
                usePPalStore.commit('setShowLoader', true);
                const data = await fetchaprobMakeHESMIGO(accion.id);
                if (data.success === 1) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Orden de Compra Aprobada',
                        text: data.message,
                    });
                    this.$emit('accion', {
                        accion: 'loadSOCByState',
                        estado_cgestion: 3,
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al aprobar Orden de Compra',
                        text: data.message,
                    });
                }
                usePPalStore.commit('setShowLoader', false);
            }
        },
    },
    template: html`
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Pendiente por HES/MIGO</h3>
                <div class="card-tools m-0">
                    <tipoSocFiltro from="porHesmigo" @accion="accion" key="porHesmigo" />
                </div>
            </div>
            <div class="card-body ">
                <div class="row mb-2">
                    <div>
                        <div class="input-group">
                            <input
                                type="text"
                                class="form-control"
                                id="txtFilter_porHESMIGO"
                                @keyup.enter="setFilter"
                                placeholder="Ingrese y presione 'Enter' para buscar"
                                v-model="filter" />
                            <div class="input-group-append">
                                <span class="input-group-text cursor-pointer" @click="setFilter">
                                    <i class="fas fa-search"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row table-responsive px-0">
                    <tableResultPorHESMIGO :data="dataFiltrada" @accion="accion"></tableResultPorHESMIGO>
                </div>
            </div>
        </div>
    `,
});
Vue.component('por-facturar', {
    emits: ['accion'],
    props: {
        porFacturar: {
            type: Array,
            default: [],
        },
    },
    setup(props) {
        const porFacturar = computed(() => props.porFacturar);
        const functionPasarella = computed(() => usePPalStore.state.functionsPasarella);

        return {
            porFacturar,
            functionPasarella,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                closeModal: () => {
                    this.ShowModalFiles = false;
                },
                default: () => this.$emit('accion', accion),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
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
                <h3 class="card-title">Pendiente por Facturar</h3>
                <div class="card-tools m-0">
                    <tipoSocFiltro from="porFacturar" @accion="accion" key="porFacturar" />
                </div>
            </div>
            <div class="card-body table-responsive">
                <tablePorFacturar :data="porFacturar" @accion="accion"></tablePorFacturar>
            </div>
        </div>
    `,
});
Vue.component('consulta', {
    setup() {
        const desde = ref(addDias(getDiaActual(), -30));
        const hasta = ref(getDiaActual());
        const array_campus = ref([]);
        const array_area = ref([]);
        const array_proyectos = ref([]);

        provide('array_proyectos', array_proyectos);

        const filters = reactive({
            cod_campus: 0,
            cod_area: 0,
            cod_proyecto: 0,
        });

        const filtroDetalle = ref({});

        const tipoConsulta = ref('General');

        const functionPasarella = computed(() => usePPalStore.state.functionsPasarella);

        const owner_user = computed(() => usePPalStore.state.owner_user);

        const showModalProyDatail = ref(false);
        const showModalEditProy = ref(false);
        const socSelected = ref({});

        const ProySelected = ref({});

        const getSOCByDates = async (/** @type {Object} */ params) => {
            const response = await versaFetch({
                url: '/api/getSOCByDatesCGestion',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    desde: params.desde,
                    hasta: params.hasta,
                    filters,
                    tipoConsulta: tipoConsulta.value,
                    from: 'consulta',
                }),
            });
            return response;
        };

        Promise.all([fecthCampus(), fetchProyectos({ estado: '1', origen: 'SOC' })])
            .then(values => {
                array_campus.value = values[0];
                array_proyectos.value = values[1];
            })
            .catch(error => {
                show_toast('error', error, 'error', 'error');
            });

        const loadArea = async (/** @type {Number} */ id_campus) => {
            const formD = new FormData();
            formD.append('codigo', id_campus.toString()); // convert id_campus to string before appending to FormData
            formD.append('estado', '1'); // pass string '1' instead of number 1
            formD.append('habilitarsoc', '1'); // pass string '1' instead of number 1
            const response = await versaFetch({
                url: '/api/getAreas',
                method: 'POST',
                data: formD,
            });
            array_area.value = response;
        };

        return {
            desde,
            hasta,
            getSOCByDates,
            functionPasarella,
            tipoConsulta,
            array_campus,
            array_area,
            array_proyectos,
            filters,
            loadArea,
            showModalProyDatail,
            ProySelected,
            filtroDetalle,
            owner_user,
            showModalEditProy,
            socSelected,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                closeModal: () => {
                    this.showModalProyDatail = false;
                    this.showModalEditProy = false;
                },
                devolverEstado: () => this.devolverEstado(accion),
                viewDetalleProyecto: () => this.viewDetalleProyecto(accion.id),
                deleteSOC: () => this.deleteSOC(accion.id),
                showModalEditProy: () => {
                    this.socSelected = accion.item;
                    this.showModalEditProy = true;
                },
                loadSocByDates: () => this.loadSocByDates(),
                devolverEstadoAnterior: () => this.devolverEstadoAnterior(accion.id),
                defult: () => this.$emit('accion', accion),
                updateDescripcionSOC: () => this.updateDescripcionSOC(accion),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        async devolverEstadoAnterior(id) {
            const result = await Swal.fire({
                title: '¿Estas seguro?',
                text: '¿Está seguro que desea devolver a estado anterior?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    method: 'POST',
                    url: '/api/devolverSOCEstadoAnterior',
                    data: JSON.stringify({ id }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (response.success === 1) {
                    versaAlert({
                        title: 'Exito',
                        message: response.message,
                        type: 'success',
                        callback: () => {
                            this.loadSocByDates();
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
        loadSocByDates() {
            const owner_user = this.owner_user;
            this.getSOCByDates({
                desde: this.desde,
                hasta: this.hasta,
            }).then((/** @type {Object} */ data) => {
                if (data.success === 1) {
                    if ($('#tableResult').find('tr').children().length > 0) {
                        $('#tableResult').find('tr').children().remove();
                        $('#tableResult').find('tbody').remove();
                        // @ts-ignore
                        $('#tableResult').DataTable().destroy();
                        $('#tableResult').empty();
                    }
                    const consultaFn = {
                        General: () => this.consultaGeneral(data, owner_user),
                        'Por Proyecto': () => this.consultaPorProyecto(data),
                        'General Aperturado por CGestión': () => this.aperturadoPorCGesiton(data, owner_user),
                    };
                    const selectedConsulta = consultaFn[this.tipoConsulta] || consultaFn['General'];
                    if (typeof selectedConsulta === 'function') {
                        selectedConsulta();
                    }

                    $('#tableResult').DataTable().columns.adjust().draw();

                    if (this.owner_user === 1) {
                        $('#tableResult').on(
                            'dblclick',
                            'div[name="descripcion_consulta_cgestion"]',
                            async function () {
                                const value = $(this).data('value');
                                const rowIndex = value.rowIndex || 0;
                                const dt = $('#tableResult').DataTable();

                                const item = dt.row(rowIndex).data();

                                const result = await Swal.fire({
                                    title: 'Editar Glosa',
                                    input: 'text',
                                    inputLabel: 'Glosa',
                                    inputValue: item.descripcion,
                                    showCancelButton: true,
                                    confirmButtonText: 'Guardar',
                                    cancelButtonText: 'Cancelar',
                                    showLoaderOnConfirm: true,
                                    preConfirm: observacion => {
                                        if (observacion === '') {
                                            Swal.showValidationMessage('Debe ingresar una observación');
                                        }
                                        return observacion;
                                    },
                                });
                                if (result.isConfirmed) {
                                    const btn = document.createElement('button');
                                    btn.setAttribute('type', 'button');
                                    btn.setAttribute('name', 'pasarella');
                                    btn.setAttribute(
                                        'data-value',
                                        JSON.stringify({
                                            id: item.id,
                                            descripcion: result.value,
                                            id_encabezado_soc: item.soc_encabezado_id,
                                            accion: 'updateDescripcionSOC',
                                        })
                                    );
                                    btn.style.display = 'none';
                                    document.body.appendChild(btn);
                                    btn.click();

                                    btn.remove();

                                    $(`#descripcion_${rowIndex}`).text(result.value);
                                }
                            }
                        );
                    }
                }
            });
        },
        async devolverEstado(/** @type {Object} */ accion) {
            const result = await Swal.fire({
                title: '¿Estas seguro?',
                text: '¿Está seguro que desea devolver a Pendiente OC?, se notificará al solicitante',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    method: 'POST',
                    url: '/api/devolverSOCPendienteOC',
                    data: JSON.stringify({ id: accion.id }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (response.success === 1) {
                    versaAlert({
                        title: 'Exito',
                        message: response.message,
                        type: 'success',
                        callback: () => {
                            this.loadSocByDates();
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
        getCodList(/** @type {String} */ lista) {
            switch (lista) {
                case 'array_campus': {
                    this.filters.cod_campus = '';
                    this.filters.cod_area = '';
                    this.$refs.area.disabled = true;
                    const campus = this.$refs.campus.value.trim().toLowerCase();
                    const index = this.array_campus.findIndex(item => item.descripcion.trim().toLowerCase() === campus);
                    if (index >= 0) {
                        this.filters.cod_campus = this.array_campus[index].id;
                        this.$refs.area.disabled = false;
                        this.$refs.area.focus();
                        this.loadArea(this.filters.cod_campus);
                    }
                    break;
                }
                case 'array_area': {
                    this.filters.cod_area = '';
                    const area = this.$refs.area.value.trim().toLowerCase();
                    const index_area = this.array_area.findIndex(
                        item => item.descripcion.trim().toLowerCase() === area
                    );
                    if (index_area >= 0) {
                        this.filters.cod_area = this.array_area[index_area].codigo;
                        this.$refs.proyectos.disabled = false;
                        this.$refs.proyectos.focus();
                    }
                    break;
                }
                case 'array_proyectos': {
                    this.filters.cod_proyecto = '';
                    const proyecto = this.$refs.proyectos.value.trim().toLowerCase();
                    const index_proyecto = this.array_proyectos.findIndex(
                        item => item.descripcion.trim().toLowerCase() === proyecto
                    );
                    if (index_proyecto >= 0) {
                        this.filters.cod_proyecto = this.array_proyectos[index_proyecto].codigoproyecto;
                    }
                    break;
                }
            }
        },
        viewDetalleProyecto(/** @type {Object} */ proyecto) {
            this.filtroDetalle = {
                desde: this.desde,
                hasta: this.hasta,
                filters: this.filters,
            };

            this.ProySelected = proyecto;
            this.showModalProyDatail = true;
        },
        async deleteSOC(/** @type {Number} */ id) {
            const result = await Swal.fire({
                title: '¿Estas seguro?',
                text: '¿Está seguro que desea eliminar la Solicitud de Orden de Compra?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                allowOutsideClick: false,
                confirmButtonText: 'Si, eliminar',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    method: 'POST',
                    url: '/api/deleteFULLSOC',
                    data: JSON.stringify({ id }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (response.success === 1) {
                    versaAlert({
                        title: 'Exito',
                        message: response.message,
                        type: 'success',
                        callback: () => {
                            this.loadSocByDates();
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
        consultaGeneral(data, owner_user) {
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
                                    title="Ver Archivos"
                                    name="pasarella"
                                    data-value='{"accion": "viewFiles", "id": ${row.id}, "from": "consulta"  }'>
                                    <i class=" fa fa-server" aria-hidden="true"></i>
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-info btn-sm"
                                    title="Ver Aprobadores"
                                    name="pasarella"
                                    data-value='{"accion": "viewAprobators", "id": ${row.id} }'>
                                    <i class="fa fa-users" aria-hidden="true"></i>
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-warning btn-sm"
                                    title="Modificar Proyecto SOC"
                                    name="pasarella"
                                    data-value='{"accion": "showModalEditProy", "item": ${JSON.stringify(row)}}'>
                                    <i class="fa fa-recycle" aria-hidden="true"></i>
                                </button>
                                ${row['countcGestion'] !== '0'
                                    ? html`
                                          <button
                                              type="button"
                                              class="btn btn-sm btn-warning"
                                              name="pasarella"
                                              data-value='{"accion":"viewCGestion", "id":${row.id}}'
                                              title="Ver Centro de Gestion">
                                              <i class="fas fa-table"></i>
                                          </button>
                                      `
                                    : ''}
                                ${Number(row['estado_solicitante']) === 2 && Number(row['estado_cgestion']) === 2
                                    ? html`
                                          <button
                                              type="button"
                                              class="btn btn-warning btn-sm"
                                              title="Devolver a Pendiente OC"
                                              name="pasarella"
                                              data-value='{"accion": "devolverEstado", "id": ${row.id}, "estado":"Generando OC" }'>
                                              <i class="fa fa-reply"></i>
                                          </button>
                                      `
                                    : ''}
                                ${row['estado_solicitante'] === '9' && row['estado_cgestion'] === '1'
                                    ? html`
                                          <button
                                              type="button"
                                              class="btn btn-warning btn-sm"
                                              title="Devolver a su estado anterior"
                                              name="pasarella"
                                              data-value='{"accion": "devolverEstadoAnterior", "id": ${row.id}, "estado":"Generando OC" }'>
                                              <i class="fa fa-reply-all"></i>
                                          </button>
                                      `
                                    : ''}
                                ${owner_user.rol === '1'
                                    ? html`
                                          <button
                                              type="button"
                                              class="btn btn-danger btn-sm"
                                              title="Eliminar SOC completamente"
                                              name="pasarella"
                                              data-value='{"accion": "deleteSOC", "id": ${row.id} }'>
                                              <i class="fa fa-trash" aria-hidden="true"></i>
                                          </button>
                                      `
                                    : ''}
                            </div>
                        `,
                    },
                    { data: 'tipo_soc' },
                    { data: 'solicitante' },
                    { data: 'rut_proveedor' },
                    { data: 'nombre_proveedor' },
                    {
                        data: 'descripcion',
                        render: (data, type, row, meta) => html`
                            <div
                                name="descripcion_consulta_cgestion"
                                id="descripcion_${meta.row}"
                                data-value='{"rowIndex":${meta.row}}'>
                                <span data-value='{"rowIndex":${meta.row}}' class="text-wrap md:text-balance">
                                    ${data}
                                </span>
                            </div>
                        `,
                    },
                    { data: 'created_at' },
                    { data: 'desc_campus' },
                    { data: 'desc_area' },
                    { data: 'cod_proyecto' },
                    { data: 'desc_proyecto' },
                    { data: 'total_solicitud' },
                    { data: 'utilizado' },
                    { data: 'disponible' },
                    { data: 'desc_estado' },
                    { data: 'grupo_estado' },
                    { data: 'mantencion_ot' },
                    { data: 'desc_caracteristicas' },
                    { data: 'desc_area_encargada' },
                    { data: 'desc_equipo' },
                    { data: 'desc_tipo_solicitud' },
                    { data: 'observacion' },
                    { data: 'orden_compra' },
                    { data: 'fecha_upload_oc' },
                    { data: 'hes_migo' },
                    { data: 'fecha_request' },
                    { data: 'monto_solicitado' },
                    { data: 'observacion_rh' },
                    { data: 'nombre_user_hesmigo' },
                    { data: 'fecha_response' },
                    { data: 'nombre_user_response' },
                    { data: 'factura_asociada' },
                    { data: 'tipo_oc' },
                    { data: 'desc_condicion1' },
                    { data: 'desc_condicion2' },
                    { data: 'count_presupuestos' },
                    { data: 'participante_1_nombre' },
                    { data: 'participante_2_nombre' },
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
        },
        aperturadoPorCGesiton(data, owner_user) {
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
                                    title="Ver Archivos"
                                    name="pasarella"
                                    data-value='{"accion": "viewFiles", "id": ${row.id}, "from":"consulta" }'>
                                    <i class=" fa fa-server" aria-hidden="true"></i>
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-info btn-sm"
                                    title="Ver Aprobadores"
                                    name="pasarella"
                                    data-value='{"accion": "viewAprobators", "id": ${row['id']} }'>
                                    <i class="fa fa-users" aria-hidden="true"></i>
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-warning btn-sm"
                                    title="Modificar Proyecto SOC"
                                    name="pasarella"
                                    data-value='{"accion": "showModalEditProy", "item": ${JSON.stringify(row)}}'>
                                    <i class="fa fa-recycle" aria-hidden="true"></i>
                                </button>

                                ${row['estado_solicitante'] === '2' && row['estado_cgestion'] === '2'
                                    ? html`
                                          <button
                                              type="button"
                                              class="btn btn-warning btn-sm"
                                              title="Devolver a Pendiente OC"
                                              name="pasarella"
                                              data-value='{"accion": "devolverEstado", "id": ${row.id}, "estado":"Generando OC" }'>
                                              <i class="fa fa-reply"></i>
                                          </button>
                                      `
                                    : ''}
                                ${owner_user.rol === '1'
                                    ? html`
                                          <button
                                              type="button"
                                              class="btn btn-danger btn-sm"
                                              title="Eliminar SOC completamente"
                                              name="pasarella"
                                              data-value='{"accion": "deleteSOC", "id": ${row.id} }'>
                                              <i class="fa fa-trash" aria-hidden="true"></i>
                                          </button>
                                      `
                                    : ''}
                            </div>
                        `,
                    },
                    { data: 'tipo_soc' },
                    { data: 'solicitante' },
                    { data: 'rut_proveedor' },
                    { data: 'nombre_proveedor' },
                    {
                        data: 'descripcion',
                        render: (data, type, row, meta) => html`
                            <div
                                name="descripcion_consulta_cgestion"
                                id="descripcion_${meta.row}"
                                data-value='{"rowIndex":${meta.row}}'>
                                <span class="text-wrap md:text-balance">${data}</span>
                            </div>
                        `,
                    },
                    { data: 'created_at' },
                    { data: 'desc_campus' },
                    { data: 'desc_area' },
                    { data: 'cod_proyecto' },
                    { data: 'desc_proyecto' },
                    { data: 'total_solicitud' },
                    { data: 'utilizado' },
                    { data: 'disponible' },
                    { data: 'desc_estado' },
                    { data: 'grupo_estado' },
                    { data: 'mantencion_ot' },
                    { data: 'desc_caracteristicas' },
                    { data: 'desc_area_encargada' },
                    { data: 'desc_equipo' },
                    { data: 'desc_tipo_solicitud' },
                    { data: 'observacion' },
                    { data: 'orden_compra' },
                    { data: 'fecha_upload_oc' },
                    { data: 'hes_migo' },
                    { data: 'fecha_request' },
                    { data: 'monto_solicitado' },
                    { data: 'observacion_rh' },
                    { data: 'nombre_user_hesmigo' },
                    { data: 'fecha_response' },
                    { data: 'nombre_user_response' },
                    { data: 'factura_asociada' },
                    { data: 'cod_cgestion' },
                    { data: 'desc_cgestion' },
                    { data: 'monto_dist_cgestion' },
                    { data: 'count_presupuestos' },
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
        },
        consultaPorProyecto(data) {
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
                    { data: 'codigoproyecto' },
                    {
                        data: 'codigoproyecto',
                        render: (data, type, row) => html`
                            <button
                                type="button"
                                class="btn btn-success btn-sm"
                                title="Ver Archivos"
                                name="pasarella"
                                data-value='{"accion": "viewDetalleProyecto", "id": ${JSON.stringify(row)}}'>
                                <i class="fa fa-eye" aria-hidden="true"></i>
                            </button>
                        `,
                    },
                    { data: 'descripcion' },
                    { data: 'presupuesto_proy' },
                    { data: 'monto_soc' },
                    {
                        data: 'monto_soc',
                        render: (data, type, row) => {
                            let porc_soc =
                                (Number(row.monto_soc.replaceAll(',', '')) /
                                    Number(row.presupuesto_proy.replaceAll(',', ''))) *
                                100;
                            if (porc_soc > 100 || porc_soc < 0) {
                                porc_soc = 100;
                            }
                            porc_soc = Math.round(porc_soc);
                            return html`
                                <div class="flex justify-center">
                                    <div class="relative w-20 h-20">
                                        <svg class="w-full h-full" viewBox="0 0 100 100">
                                            <!-- Background circle -->
                                            <circle
                                                class="text-gray-200 stroke-current"
                                                stroke-width="10"
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="transparent"></circle>
                                            <!-- Progress circle -->
                                            <circle
                                                class="text-indigo-500  progress-ring__circle stroke-current"
                                                stroke-width="10"
                                                stroke-linecap="round"
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="transparent"
                                                stroke-dasharray="251.2"
                                                stroke-dashoffset="calc(251.2 - (251.2 *${porc_soc}) / 100)"></circle>

                                            <!-- Center text -->
                                            <text
                                                x="50"
                                                y="50"
                                                font-family="Verdana"
                                                font-size="14"
                                                text-anchor="middle"
                                                alignment-baseline="middle">
                                                ${porc_soc}%
                                            </text>
                                        </svg>
                                    </div>
                                </div>
                            `;
                        },
                    },
                    { data: 'monto_utilizado_soc' },
                    {
                        data: 'monto_utilizado_soc',
                        render: (data, type, row) => {
                            let porc =
                                (Number(row.monto_utilizado_soc.replaceAll(',', '')) /
                                    Number(row.presupuesto_proy.replaceAll(',', ''))) *
                                100;
                            if (porc > 100 || porc < 0) {
                                porc = 100;
                            }
                            porc = Math.round(porc);

                            return html`
                                <div class="flex justify-center">
                                    <div class="relative w-20 h-20">
                                        <svg class="w-full h-full" viewBox="0 0 100 100">
                                            <!-- Background circle -->
                                            <circle
                                                class="text-gray-200 stroke-current"
                                                stroke-width="10"
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="transparent"></circle>
                                            <!-- Progress circle -->
                                            <circle
                                                class="text-indigo-500  progress-ring__circle stroke-current"
                                                stroke-width="10"
                                                stroke-linecap="round"
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="transparent"
                                                stroke-dasharray="251.2"
                                                stroke-dashoffset="calc(251.2 - (251.2 *${porc}) / 100)"></circle>

                                            <!-- Center text -->
                                            <text
                                                x="50"
                                                y="50"
                                                font-family="Verdana"
                                                font-size="14"
                                                text-anchor="middle"
                                                alignment-baseline="middle">
                                                ${porc}%
                                            </text>
                                        </svg>
                                    </div>
                                </div>
                            `;
                        },
                    },
                    { data: 'saldo_soc' },
                    { data: 'presupuesto_disponible_soc' },
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
        },
        async updateDescripcionSOC(/** @type {Object} */ data) {
            const response = await versaFetch({
                method: 'POST',
                url: '/api/updateDescripcionSOC',
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (response.success === 1) {
                versaAlert({
                    title: 'Exito',
                    message: response.message,
                    type: 'success',
                });
                return;
            }
            versaAlert({
                title: 'Error',
                message: response.message,
                type: 'error',
            });
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
            <div class="card-header px-1">
                <div class="row">
                    <div class="col-md-3">
                        <select class="form-control" id="tipoConsulta" v-model="tipoConsulta">
                            <option>General</option>
                            <option>General Aperturado por CGestión</option>
                            <option>Por Proyecto</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <input class="form-control" type="date" v-model="desde" v-bind:max="hasta" id="desde" />
                    </div>
                    <div class="col-md-3">
                        <input class="form-control" type="date" v-model="hasta" v-bind:min="desde" id="hasta" />
                    </div>
                    <div class="col-md-1">
                        <button
                            type="button"
                            class="btn btn-success btn-sm"
                            title="Procesar Busqueda..."
                            @click="loadSocByDates">
                            <i class="fa fa-search" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="form-group col-md-2">
                        <!-- Campus -->
                        <label for="campus">Campus</label>
                        <input type="text" size="10" id="campus" disabled v-model="filters.cod_campus" />
                        <input
                            class="form-control"
                            list="array_campus"
                            id="list_campus"
                            autocomplete="off"
                            ref="campus"
                            @change="getCodList('array_campus')"
                            v-model="filters.desc_campus" />
                        <datalist id="array_campus">
                            <option v-for="item in array_campus" :value="item.descripcion" :value2="item.id" />
                        </datalist>
                    </div>
                    <div class="form-group col-4">
                        <!-- Area -->
                        <label for="area">Area</label>
                        <input type="text" size="10" id="area" disabled v-model="filters.cod_area" />
                        <input
                            class="form-control"
                            list="array_area"
                            id="list_area"
                            ref="area"
                            autocomplete="off"
                            disabled
                            @change="getCodList('array_area')"
                            v-model="filters.desc_area" />
                        <datalist id="array_area">
                            <option v-for="item in array_area" :value="item.descripcion" :value2="item.codigo"></option>
                        </datalist>
                    </div>
                    <div class="form-group col-4">
                        <!-- Proyecto -->
                        <label for="proyecto">Proyecto</label>
                        <input type="text" size="10" id="proyecto" disabled v-model="filters.cod_proyecto" />
                        <input
                            class="form-control"
                            list="array_proyectos"
                            id="list_proyectos"
                            ref="proyectos"
                            autocomplete="off"
                            @change="getCodList('array_proyectos')"
                            v-model="filters.desc_proyecto" />
                        <datalist id="array_proyectos">
                            <option v-for="item in array_proyectos" :value="item.descripcion">
                                {{ item.codigoproyecto }}
                            </option>
                        </datalist>
                    </div>
                </div>
            </div>
            <div class="card-body px-1">
                <div class="col col-md-12">
                    <showDetalleUsoProyecto
                        :showModal="showModalProyDatail"
                        :proyecto="ProySelected"
                        :filters="filtroDetalle"
                        @accion="accion" />
                    <ModCodProyectoSOC :showModal="showModalEditProy" :soc="socSelected" @accion="accion" />
                    <table class="table table-bordered table-striped table-hover" id="tableResult"></table>
                </div>
            </div>
        </div>
    `,
});
Vue.component('Por_PendSOLHESMIGO', {
    emits: ['accion'],
    props: {
        porPendSOLHESMIGO: {
            type: Array,
            default: [],
        },
    },
    setup(props) {
        const showModalRHESMIGO = ref(false);
        const socSelected = ref({});
        const ivaLocal = computed(() => 1 + parseFloat(usePPalStore.state.IVA));
        const porPendSOLHESMIGO = computed(() => props.porPendSOLHESMIGO);
        const dataFiltrada = ref([]);
        const filter = ref('');

        watch(porPendSOLHESMIGO, newVal => {
            dataFiltrada.value = newVal;
        });

        watch(showModalRHESMIGO, value => {
            if (!value) {
                socSelected.value = {};
            }
        });

        const setFilter = () => {
            if (filter.value !== '') {
                dataFiltrada.value = porPendSOLHESMIGO.value.filter(item => {
                    for (const key in item) {
                        if (
                            typeof item[key] === 'string' &&
                            item[key].toLowerCase().includes(filter.value.toLowerCase())
                        ) {
                            return true;
                        }
                    }
                });
            } else {
                dataFiltrada.value = porPendSOLHESMIGO.value;
            }
        };

        return {
            showModalRHESMIGO,
            socSelected,
            ivaLocal,
            filter,
            dataFiltrada,
            setFilter,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                closeModal: () => {
                    this.showModalRHESMIGO = false;
                },
                showSolicitarHESMIGO: () => {
                    this.socSelected = accion.soc;
                    this.showModalRHESMIGO = true;
                },
                loadSOCByState: () =>
                    this.$emit('accion', {
                        accion: 'loadSOCByState',
                        estado_cgestion: accion.id,
                    }),
                default: () => this.$emit('accion', accion),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
    },
    template: html`
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Pendiente por Solicitar HES/MIGO</h3>
            </div>
            <div class="card-body table-responsive">
                <div class="row mb-2">
                    <div>
                        <div class="input-group">
                            <input
                                type="text"
                                class="form-control"
                                id="txtFilter_porPendSOLHESMIGO"
                                @keyup.enter="setFilter"
                                placeholder="Ingrese y presione 'Enter' para buscar"
                                v-model="filter" />
                            <div class="input-group-append">
                                <span class="input-group-text cursor-pointer" @click="setFilter">
                                    <i class="fas fa-search"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row table-responsive">
                    <requestHESMIGO
                        :showModal="showModalRHESMIGO"
                        origen="enProceso"
                        @accion="accion"
                        :soc="socSelected" />
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>SOC Nº</th>
                                <th width="10px">Solicitante</th>
                                <th>Fecha</th>
                                <th width="10px">Glosa</th>
                                <th>Campus</th>
                                <th width="10px">Proyecto</th>
                                <th>Rut Proveedor</th>
                                <th>Monto SOC</th>
                                <th width="10px">Observación</th>
                                <th>OT</th>
                                <th>Tipo OC</th>
                                <th>Condición 1</th>
                                <th>Condición 2</th>
                                <th>Observación CG</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="item, key in dataFiltrada"
                                :key="item.id"
                                :class="item.prioridad_cg == 1 ? 'bg-blue-400':''">
                                <td>{{ item.id }}</td>
                                <td>{{ item.solicitante }}</td>
                                <td>{{ item.created_at }}</td>
                                <td>{{ item.descripcion }}</td>
                                <td>{{ item.desc_campus }}</td>
                                <td>
                                    {{ item.desc_proyecto !== null ? item.cod_proyecto + '-' + item.desc_proyecto:'' }}
                                </td>
                                <td>
                                    <i
                                        :class="item.proveedor_asociado == '1'?'bi bi-patch-check-fill text-primary':'bi bi-patch-check text-warning'"
                                        style="font-size:1.2rem"
                                        :title="item.asociado"></i>
                                    {{ item.rutproveedor }} - {{ item.nombre_proveedor }}
                                </td>
                                <td class="text-right">
                                    <p class="p-0 m-0">
                                        Neto: {{ item.monto / (ivaLocal) | format_number_n_decimal(0)}}
                                    </p>
                                    <p class="p-0 m-0">Total: {{ item.monto | format_number_n_decimal(0) }}</p>
                                </td>
                                <td>{{ item.observacion }}</td>

                                <td>{{ item.mantencion_ot }}</td>

                                <td>{{ item.tipo_oc }}</td>
                                <td>{{ item.desc_condicion1 }}</td>
                                <td>{{ item.desc_condicion2 }}</td>

                                <td @dblclick="editarObservaCG(item.id)">
                                    <div v-if="item.editObservacionCG == 0">{{ item.observacion_cg }}</div>
                                    <div v-else>
                                        <inputEditable
                                            :id.Number="key"
                                            from="tableResultPorOC"
                                            :data="item.observacion_cg"
                                            :field="item.id"
                                            @accion="accion" />
                                    </div>
                                </td>
                                <td>
                                    <div class="grid items-center gap-y-1">
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-info"
                                            @click="accion({
                                            id: item.id,
                                            accion: 'viewFiles',
                                            from: 'PorSOLHESMIGO'
                                        })"
                                            title="Ver Presupuestos">
                                            <i class="fas fa-server"></i>
                                        </button>

                                        <button
                                            type="button"
                                            class="btn btn-sm btn-info"
                                            @click="accion({
                                            id: item.id,
                                            accion: 'viewAprobators'
                                        })"
                                            title="Ver Aprobadores">
                                            <i class="fas fa-users"></i>
                                        </button>
                                        <button
                                            v-if="item.countcGestion > 0"
                                            type="button"
                                            class="btn btn-sm btn-warning"
                                            @click="accion({id:item.id, accion:'viewCGestion'})"
                                            title="Ver Centro de Gestion">
                                            <i class="fas fa-table"></i>
                                        </button>
                                        <button
                                            v-if="item.estado_cgestion == 2 || item.estado_cgestion == 4"
                                            type="button"
                                            class="btn btn-sm btn-success"
                                            @click="accion({
                                                    soc: item,
                                                    accion: 'showSolicitarHESMIGO',
                                                })"
                                            title="Solicitar HES/MIGO">
                                            <i class="far fa-paper-plane"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,
});

Vue.component('showDetalleUsoProyecto', {
    components: { newModal },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
        proyecto: {
            type: Object,
            default: {},
        },
        filters: {
            type: Object,
            default: {},
        },
    },
    setup(props) {
        const proy = computed(() => props.proyecto);
        const showModal = computed(() => props.showModal);
        const filters = computed(() => props.filters);

        const data = ref([]);

        const getDetalleSOCProyectos = () => {
            versaFetch({
                method: 'POST',
                url: '/api/getDetalleSOCProyectos',
                data: JSON.stringify({
                    idProy: proy.value.codigoproyecto,
                    filters: filters.value,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }).then((/** @type {Object} */ response) => {
                data.value = [];
                if (response.success === 1) {
                    data.value = response.data;
                }
            });
        };

        watch(
            showModal,
            val => {
                if (val) {
                    getDetalleSOCProyectos();
                }
            },
            { immediate: true }
        );

        return {
            proy,
            data,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            this.$emit('accion', accion);
        },
    },
    template: html`
        <newModal :showModal="showModal" idModal="DetalleUsoProyecto" @accion="accion">
            <template v-slot:title>
                Detalle de Uso de Proyecto: {{ proy.codigoproyecto }} - {{ proy.descripcion }}
            </template>
            <template v-slot:body>
                <table class="table table-bordered ">
                    <thead>
                        <th>SOC</th>
                        <th>Orden de Compra</th>
                        <th>Rut Proveedor</th>
                        <th>Nombre Proveedor</th>
                        <th>Monto SOC</th>
                        <th>Monto Utilizado</th>
                        <th>Saldo SOC</th>
                        <th>Porcentaje Disponible</th>
                    </thead>
                    <tbody>
                        <tr v-for="item in data">
                            <td>{{ item.id }}</td>
                            <td>{{ item.orden_compra }}</td>
                            <td>{{ item.rut_proveedor }}</td>
                            <td>{{ item.nombre_proveedor }}</td>
                            <td class="text-right">{{ item.monto_soc | format_number_n_decimal }}</td>
                            <td class="text-right">{{ item.monto_utilizado_soc | format_number_n_decimal }}</td>
                            <td class="text-right">{{ item.saldo_soc | format_number_n_decimal }}</td>
                            <td class="flex justify-center">
                                <div class="relative w-20 h-20">
                                    <svg class="w-full h-full" viewBox="0 0 100 100">
                                        <!-- Background circle -->
                                        <circle
                                            class="text-gray-200 stroke-current"
                                            stroke-width="10"
                                            cx="50"
                                            cy="50"
                                            r="40"
                                            fill="transparent"></circle>
                                        <!-- Progress circle -->
                                        <circle
                                            class="text-indigo-500  progress-ring__circle stroke-current"
                                            stroke-width="10"
                                            stroke-linecap="round"
                                            cx="50"
                                            cy="50"
                                            r="40"
                                            fill="transparent"
                                            stroke-dasharray="251.2"
                                            :stroke-dashoffset="'calc(251.2 - (251.2 *'+item.porc_disponible_soc+') / 100)'"></circle>

                                        <!-- Center text -->
                                        <text
                                            x="50"
                                            y="50"
                                            font-family="Verdana"
                                            font-size="14"
                                            text-anchor="middle"
                                            alignment-baseline="middle">
                                            {{ item.porc_disponible_soc | format_number_n_decimal }}%
                                        </text>
                                    </svg>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-secondary" @click="accion({accion: 'closeModal'})">Cerrar</button>
            </template>
        </newModal>
    `,
});
Vue.component('ModCodProyectoSOC', {
    components: { newModal },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
        soc: {
            type: Object,
            default: {},
            required: true,
        },
    },
    setup(props) {
        const showModal = computed(() => props.showModal);
        const soc = computed(() => props.soc);
        const proyectos = inject('array_proyectos');

        const newProyecto = reactive({
            cod_proyecto: '',
            desc_proyecto: '',
        });

        watch(showModal, val => {
            if (val) {
                newProyecto.cod_proyecto = '';
                newProyecto.desc_proyecto = '';
            }
        });

        return {
            showModal,
            soc,
            proyectos,
            newProyecto,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            this.$emit('accion', accion);
        },
        getCodList(/** @type {String} */ lista) {
            if (lista === 'proyectos') {
                const proyecto = this.$refs.proyectos.value.trim().toLowerCase();
                const index_proyecto = this.proyectos.findIndex(
                    item => item.descripcion.trim().toLowerCase() === proyecto
                );
                if (index_proyecto >= 0) {
                    this.newProyecto.cod_proyecto = this.proyectos[index_proyecto].codigoproyecto;
                }
            }
        },
        async updateCodProyecto() {
            const params = {
                id: this.soc.id,
                cod_proyecto: this.newProyecto.cod_proyecto,
            };
            const result = await Swal.fire({
                title: '¿Estas seguro?',
                text: '¿Está seguro que desea cambiar el Proyecto de la SOC?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                allowOutsideClick: false,
                confirmButtonText: 'Si, cambiar',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    method: 'POST',
                    url: '/api/updateCodProyectoSOC',
                    data: JSON.stringify(params),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (response.success === 1) {
                    versaAlert({
                        title: 'Exito',
                        message: response.message,
                        type: 'success',
                        callback: () => {
                            this.accion({ accion: 'closeModal' });
                            this.$emit('accion', {
                                accion: 'loadSocByDates',
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
        <newModal :showModal="showModal" idModal="ModCodProyectoSOC" @accion="accion">
            <template v-slot:title>SOC N° {{ soc.id }}</template>
            <template v-slot:body>
                <form>
                    <strong>Proyecto Actual</strong>
                    <hr />
                    <div class="row ml-3">
                        <div class="form-group col-4">
                            <label for="cod_proyecto">Codigo Proyecto</label>
                            <input
                                type="text"
                                class="form-control"
                                id="cod_proyecto"
                                v-model="soc.cod_proyecto"
                                disabled />
                        </div>
                        <div class="form-group col-8">
                            <label for="desc_proyecto">Descripcion Proyecto</label>
                            <input
                                type="text"
                                class="form-control"
                                id="desc_proyecto"
                                v-model="soc.desc_proyecto"
                                disabled />
                        </div>
                    </div>
                    <strong>Nuevo Proyecto</strong>
                    <hr />
                    <div class="row ml-3">
                        <div class="form-group col-12">
                            <label for="proyecto">Proyecto</label>
                            <input type="text" size="10" id="proyecto" disabled v-model="newProyecto.cod_proyecto" />
                            <input
                                class="form-control"
                                list="array_proyectos"
                                id="list_proyectos"
                                ref="proyectos"
                                autocomplete="off"
                                @change="getCodList('proyectos')"
                                v-model="newProyecto.desc_proyecto" />
                            <datalist id="proyectos">
                                <option v-for="item in proyectos" :value="item.descripcion">
                                    {{ item.codigoproyecto }}
                                </option>
                            </datalist>
                        </div>
                    </div>
                </form>
            </template>
            <template v-slot:footer>
                <div class="flex justify-between">
                    <button type="button" class="btn btn-secondary" @click="accion({accion: 'closeModal'})">
                        Cerrar
                    </button>
                    <button type="button" class="btn btn-success" @click="updateCodProyecto">Guardar</button>
                </div>
            </template>
        </newModal>
    `,
});

Vue.component('uploadOC', {
    components: { newModal },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
        socId: {
            type: Number,
            default: 0,
        },
    },
    setup(props) {
        const showModal = computed(() => props.showModal);
        const socId = computed(() => props.socId);
        const Files = ref([]);
        const showBtnSave = computed(() => !(Files.value.length === 0 || Files.value[0].data.OC.length !== 10));

        const showLoader = computed(() => usePPalStore.getters.getShowLoader);

        watch(showModal, val => {
            if (!val) {
                Files.value = [];
            }
        });

        const sendOCFetch = async () => {
            const fData = new FormData();
            fData.append('id', socId.value);
            fData.append('OC', Files.value[0].data.OC);
            fData.append('file', Files.value[0].file);
            const response = await versaFetch({
                url: '/api/sendOC',
                method: 'POST',
                data: fData,
            });
            return response;
        };

        return {
            showModal,
            Files,
            showBtnSave,
            socId,
            sendOCFetch,
            showLoader,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            this.$emit('accion', accion);
        },
        getFiles(files: AccionData) {
            this.Files.push({
                name: files.files.file.name,
                file: files.files.file,
                type: files.files.file.type,
                size: files.files.file.size,
                selected: false,
                data: {
                    OC: '',
                },
            });
        },
        sendOC() {
            usePPalStore.commit('setShowLoader', true);
            this.sendOCFetch().then((/** @type {Object} */ data) => {
                if (data.success === 1) {
                    this.accion({ accion: 'closeModal' });
                    this.File = [];
                    Swal.fire({
                        icon: 'success',
                        title: 'Orden de Compra Enviada',
                        text: data.message,
                    });
                    this.$emit('accion', {
                        accion: 'loadSOCByState',
                        estado_cgestion: 1,
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al enviar Orden de Compra',
                        text: data.message,
                    });
                }
                usePPalStore.commit('setShowLoader', false);
            });
        },
    },
    template: html`
        <newModal :showModal="showModal" idModal="UploadOC" @accion="accion">
            <template v-slot:title>Cargar Orden de Compra</template>
            <template v-slot:body>
                <div class="col col-md-12">
                    <div class="row">
                        <dropZone @accion="getFiles" />
                    </div>
                    <div class="row mt-2" v-if="Files.length > 0">
                        <div class="form-group col col-md-4">
                            <label for="file">Archivo</label>
                            <input type="text" class="form-control" id="file" v-model="Files[0].name" disabled />
                        </div>

                        <div class="form-group col col-md-4">
                            <label for="OC">Orden de Compra</label>
                            <input type="text" class="form-control" id="OC" v-model="Files[0].data.OC" />
                        </div>

                        <button
                            v-if="showBtnSave"
                            type="button"
                            class="btn btn-success btn-block"
                            @click="sendOC"
                            :disabled="showLoader">
                            <i class="fas fa-save"></i>
                            Enviar Orden de Compra
                            <span v-if="showLoader" class="loader"></span>
                        </button>
                    </div>
                </div>
            </template>
            <template v-slot:footer></template>
        </newModal>
    `,
});

Vue.component('tableResultPorOC', {
    emits: ['accion'],
    props: {
        data: {
            type: Array,
            default: [],
        },
        tabOrigen: {
            type: String,
            default: 'Pendientes',
        },
    },
    setup(props) {
        const data = computed(() => props.data);

        const ivaLocal = computed(() => 1 + parseFloat(usePPalStore.state.IVA));

        watch(data, val => {
            val.forEach(item => {
                item.prioridad_cg = item.prioridad_cg === '1';
            });
        });

        return {
            data,
            ivaLocal,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                cancelUpdate: () => {
                    this.data.forEach(item => {
                        item.editObservacionCG = 0;
                    });
                },
                updateData: () => {
                    this.data.forEach(item => {
                        if (item.id == accion.field) {
                            item.observacion_cg = accion.newData;
                            item.editObservacionCG = 0;
                        }
                    });
                    this.$emit('accion', {
                        id: accion.field,
                        observacion_cg: accion.newData,
                        accion: 'updateObservacionCG',
                    });
                },
                default: () => {
                    this.$emit('accion', accion);
                },
            };
            const fn = actions[accion.accion] || actions.default;
            if (typeof fn === 'function') {
                fn();
            }
        },
        editarObservaCG(/** @type {Number} */ id) {
            this.data.forEach(item => {
                item.editObservacionCG = 0;
                if (item.id === id) {
                    item.editObservacionCG = 1;
                }
            });
        },
    },
    template: `
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Prio.</th>
                    <th>SOC Nº</th>
                    <th width="10px">Solicitante</th>
                    <th>Fecha</th>
                    <th width="10px">Glosa</th>
                    <th>Campus</th>
                    <th width="10px">Proyecto</th>
                    <th>Rut Proveedor</th>
                    <th>Monto SOC</th>
                    <th width="10px">Observación</th>
                    <th>OT</th>
                    <th>Tipo OC</th>
                    <th>Condición 1</th>
                    <th>Condición 2</th>
                    <th>Observación CG</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="item, key in data"
                    :key="item.id"
                    :class="{'bg-blue-400': item.prioridad_cg == 1, 'text-primary': item.tipo_soc === 'Contractual'}">
                    <td class="text-center">
                        <iCheck
                            :key="'prioridad_cg'+key"
                            :id="'prioridad_cg'+key"
                            label=""
                            v-model.bool="item.prioridad_cg"
                            iClass="icheck-primary"
                            @accion="accion"
                            @change="accion({id: item.id,prioridad: item.prioridad_cg,accion: 'updatePrioridadCGSOC'})" />
                    </td>
                    <td>{{ item.id }}</td>
                    <td>{{ item.solicitante }}</td>
                    <td>{{ item.created_at }}</td>
                    <td>{{ item.descripcion }}</td>
                    <td>{{ item.desc_campus }}</td>
                    <td>
                        {{ item.desc_proyecto !== null ? item.cod_proyecto + '-'+ item.desc_proyecto:'' }}
                    </td>
                    <td>
                        <i :class="item.proveedor_asociado == '1'?'bi bi-patch-check-fill text-primary':'bi bi-patch-check text-warning'"
                            style="font-size:1.2rem"
                            :title="item.asociado"></i>
                        {{ item.rutproveedor }} - {{ item.nombre_proveedor }}
                    </td>
                    <td class="text-right">
                        <p class="p-0 m-0">
                            Neto: {{ item.monto / (ivaLocal) |
                            format_number_n_decimal(0)}}
                        </p>
                        <p class="p-0 m-0">
                            Total: {{ item.monto | format_number_n_decimal(0) }}
                        </p>
                    </td>
                    <td>{{ item.observacion }}</td>

                    <td>{{ item.mantencion_ot }}</td>

                    <td>{{ item.tipo_oc }}</td>
                    <td>{{ item.desc_condicion1 }}</td>
                    <td>{{ item.desc_condicion2 }}</td>

                    <td @dblclick="editarObservaCG(item.id)">
                        <div v-if="item.editObservacionCG == 0">
                            {{ item.observacion_cg }}
                        </div>
                        <div v-else>
                            <inputEditable
                                :id.Number="key"
                                from="tableResultPorOC"
                                :data="item.observacion_cg"
                                :field="item.id"
                                @accion="accion" />
                        </div>
                    </td>
                    <td>
                        <div class="grid items-center gap-y-1">
                            <button
                                type="button"
                                class="btn btn-sm btn-info"
                                @click="accion({
                                        id: item.id,
                                        accion: 'viewFiles',
                                        from: 'PorOC'
                                    })"
                                title="Ver Presupuestos">
                                <i class="fas fa-server"></i>
                            </button>
                            <button
                                type="button"
                                class="btn btn-sm btn-success"
                                @click="accion({
                                        id: item.id,
                                        accion: 'uploadOC'
                                    })"
                                title="Cargar Orden de compra">
                                <i class="fas fa-upload"></i>
                            </button>
                            <button
                                type="button"
                                class="btn btn-sm btn-info"
                                @click="accion({
                                        id: item.id,
                                        accion: 'viewAprobators'
                                    })"
                                title="Ver Aprobadores">
                                <i class="fas fa-users"></i>
                            </button>
                            <button
                                v-if="item.countcGestion > 0"
                                type="button"
                                class="btn btn-sm btn-warning"
                                @click="accion({id:item.id, accion:'viewCGestion'})"
                                title="Ver Centro de Gestion">
                                <i class="fas fa-table"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    `,
});
Vue.component('tableResultPorHESMIGO', {
    emits: ['accion'],
    props: {
        data: {
            type: Array,
            default: [],
        },
    },
    setup(props) {
        const data = computed(() => props.data);

        const showLoader = computed(() => usePPalStore.state.showLoader);

        return {
            data,
            showLoader,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                cancelUpdate: () => {
                    this.data.forEach(item => {
                        item.editObservacionCG = 0;
                    });
                },
                updateData: () => {
                    const item = this.data.find(item => item.id == accion.field);
                    if (item) {
                        item.observacion_cg = accion.newData;
                        item.observacion_cg_rh = accion.newData;
                        item.editObservacionCG = 0;
                        this.$emit('accion', {
                            id: accion.field,
                            observacion_cg: accion.newData,
                            accion: 'updateObservacionCG',
                            id_hesmigo: item.id_hesmigo,
                        });
                    }
                },
                default: () => {
                    this.$emit('accion', accion);
                },
            };
            const fn = actions[accion.accion] || actions.default;
            if (typeof fn === 'function') {
                fn();
            }
        },
        editarObservaCG(/** @type {Number} */ id) {
            this.data.forEach(item => {
                item.editObservacionCG = 0;
                if (item.id === id) {
                    item.editObservacionCG = 1;
                }
            });
        },
    },
    template: html`
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th colspan="9"></th>
                    <th colspan="3" class="text-center">Solicitud HES/MIGO</th>
                    <th class="text-center"></th>
                </tr>
                <tr>
                    <th>SOC Nº</th>
                    <th>Solicitante</th>
                    <th>Fecha</th>
                    <th>Glosa</th>
                    <th>Campus</th>
                    <th>Proyecto</th>
                    <th>Rut Proveedor</th>
                    <th>Monto SOC</th>
                    <th>Orden Compra</th>
                    <th>Fecha</th>
                    <th>Monto Solicitado</th>
                    <th>Usuario Solicitante</th>
                    <th>Observación</th>
                    <th>Observación CG</th>
                    <th>HES/MIGO</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="(item,key) in data"
                    :key="item.id"
                    :class="{'bg-blue-400': item.prioridad_cg == 1, 'text-primary': item.tipo_soc === 'Contractual'}">
                    <td>{{ item.id }}</td>
                    <td>{{ item.solicitante }}</td>
                    <td>{{ item.created_at }}</td>
                    <td>{{ item.descripcion }}</td>
                    <td>{{ item.desc_campus }}</td>
                    <td>{{ item.desc_proyecto !== null ? item.cod_proyecto + '-' + item.desc_proyecto:'' }}</td>
                    <td>
                        <i
                            :class="item.proveedor_asociado == '1'?'bi bi-patch-check-fill text-primary':'bi bi-patch-check text-warning'"
                            style="font-size:1.2rem"
                            :title="item.asociado"></i>
                        {{ item.rutproveedor }} - {{ item.nombre_proveedor }}
                    </td>
                    <td class="text-right">{{ item.total_solicitud | format_number_n_decimal(0) }}</td>
                    <td>{{ item.orden_compra }}</td>
                    <td>{{ item.fecha_request }}</td>
                    <td>
                        {{ item.monto_solicitado | format_number_n_decimal(0) }} | {{
                        item.monto_solicitado/item.total_solicitud*100 | format_number_n_decimal(2) }}%
                    </td>
                    <td>{{ item.nombre_request }}</td>
                    <td>{{ item.observacion_request }}</td>
                    <td @dblclick="editarObservaCG(item.id)">
                        <div v-if="item.editObservacionCG == 0">
                            {{ item.observacion_cg_rh ? item.observacion_cg_rh : item.observacion_cg }}
                        </div>
                        <div v-else>
                            <inputEditable
                                :id.Number="key"
                                from="tableResultPorOC"
                                :data="item.observacion_cg_rh ? item.observacion_cg_rh : item.observacion_cg"
                                :field="item.id"
                                @accion="accion" />
                        </div>
                    </td>
                    <td class="text-center">
                        <div v-if="item.nombre_aprueba_cg == null" class="grid items-center gap-y-1">
                            <button
                                type="button"
                                class="btn btn-sm"
                                :class="{'btn-success': item.supera_cinco == 0, 'btn-warning': item.supera_cinco == 1}"
                                @click="accion({
                                id: item.id,
                                accion: 'aprobHESMIGO'
                            })"
                                :title="item.supera_cinco == 1 ? 'Solicitud HES/MIGO supera 5%' : 'Solicitar Aprobación HES/MIGO'">
                                <i class="fas fa-check-circle"></i>
                            </button>
                            <button
                                type="button"
                                class="btn btn-sm btn-info"
                                @click="accion({
                                        id: item.id,
                                        accion: 'viewFiles',
                                        from: 'PorHESMIGO'
                                    })"
                                title="Ver Presupuestos">
                                <i class="fas fa-server"></i>
                            </button>
                            <button
                                type="button"
                                class="btn btn-sm btn-info"
                                @click="accion({
                                        id: item.id,
                                        accion: 'viewAprobators'
                                    })"
                                title="Ver Aprobadores">
                                <i class="fas fa-users"></i>
                            </button>
                            <button
                                v-if="item.countcGestion > 0"
                                type="button"
                                class="btn btn-sm btn-warning"
                                @click="accion({id:item.id, accion:'viewCGestion'})"
                                title="Ver Centro de Gestion">
                                <i class="fas fa-table"></i>
                            </button>
                        </div>
                        <div v-else>
                            <div v-if="!showLoader" class="form-group">
                                <span>
                                    Aprobado por: {{ item.nombre_aprueba_cg }} - {{ item.fecha_aprueba_cg }} {{ }}
                                </span>
                                <div class="input-group">
                                    <input
                                        type="text"
                                        :id="item.id+'_hesmigo'"
                                        class="form-control"
                                        v-model.trim="item.hesmigo_input"
                                        placeholder="Ingrese HES/MIGO" />
                                    <div class="input-group-append">
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-success"
                                            @click="accion({
                                            id: item.id,
                                            hesmigo: item.hesmigo_input,
                                            id_hesmigo: item.id_hesmigo,
                                            accion: 'sendHESMIGO'
                                        })">
                                            <i class="fas fa-save"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <span v-if="showLoader" class="loader"></span>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    `,
});
Vue.component('tablePorFacturar', {
    emits: ['accion'],
    props: {
        data: {
            type: Array,
            default: [],
        },
    },
    setup(props) {
        const functionPasarella = computed(() => usePPalStore.state.functionsPasarella);

        const montoOld = ref(0);
        const data = computed(() => props.data);

        watch(data, val => {
            //eliminar los eventos ON, si la data cambia
            $('#tablePorFacturar').off('dblclick', 'div[name="monto_solicitud"]');
            $('#tablePorFacturar').off('dblclick', 'div[name="observacion_cg"]');
            $('#tablePorFacturar').off('click', 'button[name="pasarella"]');

            if ($('#tablePorFacturar').find('tr').children().length > 0) {
                $('#tablePorFacturar').DataTable().destroy();
            }

            $('#tablePorFacturar').DataTable({
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
                data: val,
                columns: [
                    { data: 'soc_encabezado_id' },
                    { data: 'orden_compra' },
                    {
                        data: 'total_orden_compra',
                        render: (data, type, row, meta) => html`
                            <div
                                name="total_orden_compra"
                                id="total_orden_compra_row_${meta.row}"
                                data-value='{"rowIndex":${meta.row}}'
                                class="text-right">
                                <span>${format_number_n_decimal_us(data, 0)}</span>
                            </div>
                        `,
                    },
                    { data: 'hes_migo' },
                    {
                        data: 'monto_solicitado',
                        render: (data, type, row, meta) => html`
                            <div
                                name="monto_solicitud"
                                id="monto_solicitud_row_${meta.row}"
                                data-value='{"rowIndex":${meta.row}}'
                                class="text-right">
                                <span>${format_number_n_decimal_us(data, 0)}</span>
                            </div>
                        `,
                    },
                    { data: 'nombre_user_solicitante' },
                    { data: 'fecha_request' },
                    { data: 'fecha_response' },
                    { data: 'nombre_proveedor' },
                    {
                        data: 'observacion_cg',
                        render: (data, type, row, meta) => html`
                            <div
                                class="h-full w-full"
                                name="observacion_cg"
                                id="observacion_cg_row_${meta.row}"
                                data-value='{"rowIndex":${meta.row}}'>
                                <span class="text-wrap md:text-balance">
                                    ${row.observacion_cg_rh
                                        ? row.observacion_cg_rh
                                        : row.observacion_cg == ''
                                          ? '&nbsp;&nbsp;&nbsp;&nbsp;'
                                          : row.observacion_cg}
                                </span>
                            </div>
                        `,
                    },
                    { data: 'ultima_solicitd_factura' },
                    {
                        data: 'ultima_solicitd_factura',
                        render: (data, type, row, meta) => html`
                            ${row['ultima_solicitd_factura'] != null
                                ? html`
                                      <span class="badge badge-success" id="dt_span_fecha${meta.row}">
                                          <p class="p-0 m-0">Ultima Solicitud:</p>
                                          <p class="p-0 m-0">${row['ultima_solicitd_factura']}</p>
                                      </span>
                                  `
                                : html`
                                      <span class="badge badge-success" id="dt_span_fecha${meta.row}"></span>
                                  `}
                            <a
                                class="btn btn-sm btn-primary"
                                title="Enviar Correo"
                                name="pasarella"
                                data-value='{"accion":"getMailTo","item":${JSON.stringify(
                                    row
                                )}, "rowIndex":${meta.row} }'>
                                <i class="fas fa-envelope"></i>
                            </a>

                            <button
                                type="button"
                                class="btn btn-sm btn-info"
                                name="pasarella"
                                data-value='{"accion":"viewFiles", "id":${row.soc_encabezado_id}, "rowIndex":${meta.row}, "from": "PorFACTURAR"}'
                                title="Ver Presupuestos">
                                <i class="fas fa-server"></i>
                            </button>

                            ${row.countcGestion != 0
                                ? html`
                                      <button
                                          type="button"
                                          class="btn btn-sm btn-warning"
                                          name="pasarella"
                                          data-value='{"accion":"viewCGestion", "id":${row.soc_encabezado_id}, "rowIndex":${meta.row}}'
                                          title="Ver Centro de Gestion">
                                          <i class="fas fa-table"></i>
                                      </button>
                                  `
                                : html``}
                        `,
                    },
                ],
                info: true,
                searching: true,
                paging: true,
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
                autoWidth: true,
            });

            $('#tablePorFacturar').DataTable().columns.adjust().draw();

            //activar el editar monto solicitado
            $('#tablePorFacturar').on('dblclick', 'div[name="monto_solicitud"]', function () {
                const value = $(this).data('value');
                const rowIndex = value.rowIndex || 0;
                const dt = $('#tablePorFacturar').DataTable();

                /** @type Object */
                const item = dt.row(rowIndex).data();
                if (!$(this).hasClass('editing')) {
                    $(this).addClass('editing');
                    $(this).html(html`
                        <div class="input-group" id="customInput_${rowIndex}">
                            <input
                                type="number"
                                name="editMontoSolicitado_${rowIndex}"
                                value="${item.monto_solicitado}"
                                class="form-control" />
                            <div class="input-group-append">
                                <button
                                    type="button"
                                    class="btn btn-sm btn-success"
                                    data-value='{"id": ${item.id},"rowIndex": ${rowIndex}}'
                                    id="saveMontoSolicitado_${rowIndex}">
                                    <i class="fas fa-save"></i>
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-sm btn-danger"
                                    name="cancelUpdateMontoSolicitado"
                                    data-value='{"id": ${item.id},"rowIndex": ${rowIndex}}'>
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    `);
                }
            });
            // evento para guardar el monto solicitado
            $('#tablePorFacturar').on('click', 'button[id^="saveMontoSolicitado"]', function (event) {
                event.preventDefault();
                const value = $(this).data('value');

                const rowIndex = value.rowIndex;

                const inputValue = $(`input[name="editMontoSolicitado_${rowIndex}"]`).val();

                if (inputValue === undefined || inputValue === '' || inputValue === 0) {
                    versaAlert({
                        title: 'Error',
                        message: 'Debe ingresar un monto valido',
                        type: 'error',
                    });
                    event.stopPropagation();
                    return;
                }

                const dt = $('#tablePorFacturar').DataTable();
                /** @type Object */
                const item = dt.row(rowIndex).data();

                if (inputValue != item.monto_solicitado) {
                    item.monto_solicitado = inputValue;
                    $(`#monto_solicitud_row_${rowIndex}`).html(html`
                        <span>${format_number_n_decimal_us(inputValue, 0)}</span>
                    `);
                    $(`div[name="monto_solicitud"]`).removeClass('editing');

                    // crear boton virtual para enviar datos a pasarella
                    const btn = document.createElement('button');
                    btn.setAttribute('type', 'button');
                    btn.setAttribute('name', 'pasarella');
                    btn.setAttribute(
                        'data-value',
                        JSON.stringify({
                            id: item.id,
                            monto_solicitado: item.monto_solicitado,
                            id_encabezado_soc: item.soc_encabezado_id,
                            accion: 'updateMontoSolicitado',
                        })
                    );
                    btn.style.display = 'none';
                    document.body.appendChild(btn);
                    btn.click();

                    // eliminar boton virtual
                    btn.remove();

                    event.stopPropagation();
                }
            });
            // evento para cancelar la edicion del monto solicitado
            $('#tablePorFacturar').on('click', 'button[name="cancelUpdateMontoSolicitado"]', function (event) {
                const value = $(this).data('value');

                const rowIndex = value.rowIndex;
                const dt = $('#tablePorFacturar').DataTable();
                /** @type Object */
                const item = dt.row(rowIndex).data();

                $(`#monto_solicitud_row_${rowIndex}`).html(html`
                    <span>${format_number_n_decimal_us(item.monto_solicitado, 0)}</span>
                `);
                $(`div[name="monto_solicitud"]`).removeClass('editing');
                event.preventDefault();
                event.stopPropagation();
            });

            // activar la edicion de la observacion CG
            $('#tablePorFacturar').on('dblclick', 'div[name="observacion_cg"]', function () {
                const value = $(this).data('value');
                const rowIndex = value.rowIndex || 0;
                const dt = $('#tablePorFacturar').DataTable();

                /** @type Object */
                const item = dt.row(rowIndex).data();
                if (!$(this).hasClass('editing')) {
                    $(this).addClass('editing');
                    $(this).html(html`
                        <div class="input-group" id="customInput_observacion_${rowIndex}">
                            <input
                                type="text"
                                name="editObservacion_cg_${rowIndex}"
                                value="${item.observacion_cg_rh ? item.observacion_cg_rh : item.observacion_cg}"
                                class="form-control" />
                            <div class="input-group-append">
                                <button
                                    type="button"
                                    class="btn btn-sm btn-success"
                                    data-value='{"id": ${item.id},"rowIndex": ${rowIndex}}'
                                    name="saveObservacion_cg"
                                    id="saveObservacion_cg_${rowIndex}">
                                    <i class="fas fa-save"></i>
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-sm btn-danger"
                                    name="cancelUpdateObservacion_cg"
                                    data-value='{"id": ${item.id},"rowIndex": ${rowIndex}}'>
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    `);
                }
            });
            // evento para cancelar la edicion de la observacion CG
            $('#tablePorFacturar').on('click', 'button[name="cancelUpdateObservacion_cg"]', function (event) {
                const value = $(this).data('value');

                const rowIndex = value.rowIndex;
                const dt = $('#tablePorFacturar').DataTable();
                /** @type Object */
                const item = dt.row(rowIndex).data();

                $(`#observacion_cg_row_${rowIndex}`).html(html`
                    <span>
                        ${item.observacion_cg_rh
                            ? item.observacion_cg_rh
                            : item.observacion_cg == ''
                              ? '&nbsp;&nbsp;&nbsp;&nbsp;'
                              : item.observacion_cg}
                    </span>
                `);
                $(`div[name="observacion_cg"]`).removeClass('editing');
                event.preventDefault();
                event.stopPropagation();
            });
            // evento para guardar la observacion CG
            $('#tablePorFacturar').on('click', 'button[name="saveObservacion_cg"]', function (event) {
                event.preventDefault();

                //desactivar la edicion

                const value = $(this).data('value');

                const rowIndex = value.rowIndex;
                const inputValue = $(`input[name="editObservacion_cg_${rowIndex}"]`).val();

                if (inputValue === undefined) return;

                const dt = $('#tablePorFacturar').DataTable();
                /** @type Object */
                const item = dt.row(rowIndex).data();

                item.observacion_cg_rh = inputValue;
                item.observacion_cg = inputValue;

                $(`#observacion_cg_row_${rowIndex}`).html(html`
                    <span>${String(inputValue).trim() === '' ? '&nbsp;&nbsp;&nbsp;&nbsp;' : inputValue}</span>
                `);
                $(`div[name="observacion_cg"]`).removeClass('editing');

                // crear boton virtual para enviar datos a pasarella
                const btn = document.createElement('button');
                btn.setAttribute('type', 'button');
                btn.setAttribute('name', 'pasarella');
                btn.setAttribute(
                    'data-value',
                    JSON.stringify({
                        observacion_cg: String(inputValue).trim(),
                        id: item.soc_encabezado_id,
                        accion: 'updateObservacionCG',
                        id_hesmigo: item.id,
                    })
                );
                btn.style.display = 'none';
                document.body.appendChild(btn);
                btn.click();

                // eliminar boton virtual
                btn.remove();

                event.stopPropagation();
            });

            // agregar clase a la fila si la prioridad es 1
            const dt = $('#tablePorFacturar').DataTable();
            dt.rows().every(function () {
                const row = this.node();
                const data = this.data();
                if (data.prioridad_cg == 1) {
                    $(row).addClass('bg-blue-400');
                }

                //agregar clase grid item-center gap-y-1 a la ultima columna
                const cell = dt.cell(row, -1).node();
                $(cell).addClass('grid items-center gap-y-1');

                // ajustar sólo la ultima columna
                dt.columns.adjust().draw();
            });
        });

        const UpdateMontoHESMIGO = async (/** @type {Object} */ params) => {
            const response = await versaFetch({
                url: '/api/updateMontoHESMIGO',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id: params.id,
                    monto_solicitado: params.monto_solicitado,
                    id_encabezado_soc: params.id_encabezado_soc,
                }),
            });
            return response;
        };

        const updateUltimaSolicitdFactura = async (/** @type {Object} */ params) => {
            const response = await versaFetch({
                url: '/api/updateUltimaSolicitdFactura',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id: params.id,
                }),
            });
            return response;
        };

        return {
            data,
            montoOld,
            UpdateMontoHESMIGO,
            updateUltimaSolicitdFactura,
            functionPasarella,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                updateMontoSolicitado: () => {
                    this.updateMontoSolicitado(accion);
                },
                cancelUpdateMontoSolicitado: () => this.cancelUpdateMontoSolicitado(accion.item),
                // default: () => this.$emit('accion', accion),
                getMailTo: () => this.getMailTo(accion),
            };
            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        async getMailTo(/** @type {Object} */ accion) {
            const item = accion.item;
            const rowIndex = accion.rowIndex;

            const subject = `Factura Orden de Compra: ${item.orden_compra}`;
            const body = `Estimado(a): ${item.nombre_proveedor},
            %0A
            %0A
            Adjunto Orden de Compra y número de HES (Hoja de Entrada) para generar la factura. Favor incluir estos datos en la Referencia del documento.
            %0A
            %0A
            OC: ${item.orden_compra}
            %0A
            HES: ${item.hes_migo}
            %0A
            MONTO TOTAL FACTURA IVA INCLUIDO: ${Number(item.monto_solicitado).toLocaleString('es-ES')}
            %0A
            %0A
            Una vez emitida la factura, enviar a los correos que están en copia, incluido el mío, para procesar el pago correspondiente.
            %0A
            %0A
            ****NOTA****
            %0A
            SI YA SE EMITIÓ FACTURA CON ESTA INFORMACION, FAVOR ADJUNTAR EN ESTE CORREO..
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
                    rut: item.rutproveedor,
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
            this.updateUltimaSolicitdFacturaBtn(item, rowIndex);
            a.remove();
        },
        updateUltimaSolicitdFacturaBtn(/** @type {Object} */ item, /** @type {Number} */ rowIndex) {
            this.updateUltimaSolicitdFactura(item).then((/** @type {Object} */ data) => {
                if (data.success === 1) {
                    const date = new Date();
                    $(`#dt_span_fecha${rowIndex}`).text(
                        `Ultima Solicitud: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
                    );
                }
            });
        },
        showEditarMontoSolicitado(/** @type {Object} */ item) {
            this.data.map((/** @type {Object} */ item) => {
                item.showInput = 0;
            });
            item.showInput = 1;
            this.montoOld = item.monto_solicitado;
        },
        cancelUpdateMontoSolicitado(/** @type {Object} */ item) {
            item.monto_solicitado = this.montoOld;
            item.showInput = 0;
        },
        updateMontoSolicitado(/** @type {Object} */ params) {
            this.UpdateMontoHESMIGO({
                id: params.id,
                id_encabezado_soc: params.id_encabezado_soc,
                monto_solicitado: params.monto_solicitado,
            }).then(
                /** @type {Object} */ data => {
                    if (data.success === 1) {
                        this.data.map((/** @type {Object} */ item) => {
                            item.showInput = 0;
                        });
                        Swal.fire({
                            icon: 'success',
                            title: 'Monto Actualizado',
                            text: data.message,
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error al actualizar monto',
                            text: data.message,
                        });
                    }
                }
            );
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
        <table class="table table-bordered" id="tablePorFacturar">
            <thead>
                <tr>
                    <th>NºSOC</th>
                    <th>Orden de Compra</th>
                    <th>Valor O.Compra</th>
                    <th>HES / MIGO</th>
                    <th>Monto Solicitado</th>
                    <th>Nombre Solicitante</th>
                    <th>Fecha Solicitada</th>
                    <th>Fecha Enviada</th>
                    <th>Nombre Proveedor</th>
                    <th>Observación CG</th>
                    <th>Ultima SOL Factura</th>
                    <th width="10%">Acciones</th>
                </tr>
            </thead>
        </table>
    `,
});

Vue.component('tipoSocFiltro', {
    props: {
        from: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const tipoSocSelected = ref('todos');
        const from = computed(() => props.from);
        const array_tipo_soc = [{ value: 'OC General' }, { value: 'Contractual' }];

        return {
            array_tipo_soc,
            from,
            tipoSocSelected,
        };
    },
    methods: {
        returnSelected(value) {
            this.tipoSocSelected = value;
            this.$emit('accion', {
                accion: 'filterTable',
                tipoSocSelected: value,
                from: this.from,
            });
        },
    },
    template: html`
        <div class="d-flex">
            <strong class="mr-2">Filtrar por:</strong>
            <div class="btn-group btn-group-toggle" data-toggle="buttons">
                <label class="btn btn-secondary" :class="tipoSocSelected === 'todos'? 'active':''">
                    <input
                        type="radio"
                        name="options_todos"
                        :id="'opt_'+from+'_0'"
                        autocomplete="off"
                        checked
                        @click="returnSelected('todos')" />
                    Todos
                </label>
                <label
                    v-for="(item,index) in array_tipo_soc"
                    class="btn btn-secondary"
                    :class="tipoSocSelected === item.value? 'active':''">
                    <input
                        type="radio"
                        :name="'options_'+from"
                        :id="'opt_'+from+'_'+index+1"
                        autocomplete="off"
                        @click="returnSelected(item.value)" />
                    {{ item.value }}
                </label>
            </div>

            <button type="button" class="btn btn-sm btn-success ml-1" @click="returnSelected('exportExcel')">
                Exportar a Excel
            </button>
        </div>
    `,
});

Vue.component('requestHESMIGO', {
    components: { newModal },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
            required: true,
        },
        soc: {
            type: Object,
            required: true,
        },
        origen: {
            type: String,
            default: 'Pendientes',
        },
    },
    setup(props) {
        const showModal = computed(() => props.showModal);
        const soc = ref({});
        const disponible = ref(0);
        const solicitado = ref(0);
        const observacion = ref('');
        const solicitadoFormat = ref(0);

        const optionSelected = ref('');
        const files = ref([]);
        const showAddFiles = ref(false);
        const typeFiles = computed(() => usePPalStore.state.FileTypeValid);

        const porcentaje = reactive({
            max: 100,
            min: 1,
            value: 0,
        });

        const optionsRadio = ref([
            {
                id: 0,
                value: 'completo',
                label: 'Solicitar Total Disponible',
                disabled: false,
            },
            {
                id: 1,
                value: 'ingresa',
                label:
                    soc.value.tipo_soc !== 'Contractual'
                        ? 'Ingresar Porcentaje a Solicitar'
                        : 'Ingresar Monto a Solicitar',
                disabled: false,
            },
            {
                id: 2,
                value: 'retencion',
                label: 'Utilizar Retención',
                disabled: disponible.value == 0,
            },
        ]);

        const socProps = computed(() => JSON.parse(JSON.stringify(props.soc)));

        // Aqui cuadramos el valor de la retencion y el disponible
        watch(socProps, (/** @type {Object} */ value) => {
            if (value.retiene_5_porc_soc == 0) {
                optionsRadio.value = optionsRadio.value.filter(item => item.value !== 'retencion');
            }

            if (value.tipo_soc === 'Contractual') {
                optionsRadio.value[1].label = 'Ingresar Monto a Solicitar';
            }

            if (Object.keys(value).length === 0) {
                disponible.value = 0;
                return;
            }
            soc.value = JSON.parse(JSON.stringify(value));

            soc.value['retencion'] = 0;
            if (Number(soc.value.total_solicitud) > TOPE_RETENCION && soc.value.retiene_5_porc_soc == 1) {
                soc.value['retencion'] = Number(Number(soc.value.total_solicitud) * 0.05).toFixed(0);
            }

            disponible.value = Number(soc.value.total_solicitud) - Number(soc.value.total_solicitado);

            if (disponible.value - soc.value.retencion > 0) {
                disponible.value = disponible.value - soc.value.retencion;
                optionsRadio.value.map(item => {
                    if (item.value === 'retencion') {
                        item.disabled = true;
                    } else {
                        item.disabled = false;
                    }

                    porcentaje.min = 1;
                    porcentaje.max = (disponible.value / soc.value.total_solicitud) * 100;
                    porcentaje.value = porcentaje.max;
                });
                optionSelected.value = 'ingresa';
            } else {
                optionsRadio.value.map(item => {
                    if (item.value === 'retencion') {
                        item.disabled = false;
                    } else {
                        item.disabled = true;
                    }

                    porcentaje.min = 1;
                    porcentaje.max = (disponible.value / soc.value.total_solicitud) * 100;
                    porcentaje.value = porcentaje.max;
                });
                optionSelected.value = 'retencion';
            }

            solicitado.value = 0;
            solicitadoFormat.value = 0;
            observacion.value = '';
        });

        watch(optionSelected, (/** @type {String} */ value) => {
            if (value === 'completo') {
                porcentaje.value = porcentaje.max;

                if (soc.value.tipo_soc === 'Contractual') {
                    solicitado.value = disponible.value;
                }
            }
            if (value === 'retencion') {
                porcentaje.value = porcentaje.max;
            }
        });

        // Aqui cuadramos el valor del solicitado
        watch(
            porcentaje,
            (/** @type {Object} */ value) => {
                if (value.value > 100) {
                    value.value = 100;
                }
                if (value.value < 0) {
                    value.value = 1;
                }

                if (soc.value.retencion > 0 && optionSelected.value !== 'retencion' && value.value > 95) {
                    value.value = 95;
                }

                solicitado.value = Math.floor(soc.value.total_solicitud * (value.value / 100));
                solicitadoFormat.value = format_number_n_decimal(solicitado.value, 0);
            },
            {
                deep: true,
            }
        );

        const showAlert = computed(
            () =>
                !(optionSelected.value === 'retencion' && disponible.value == 0) &&
                (solicitado.value <= 0 || solicitado.value > disponible.value)
        );

        const sendRequestHESMIGO = async (/** @type {Object} */ params) => {
            const formData = new FormData();
            formData.append('id', params.id);
            formData.append('monto', params.monto);
            formData.append('token_files', params.token_files);
            formData.append('observacion', params.observacion);
            for (const file of files.value) {
                formData.append('files[]', file.file);
            }

            const response = await versaFetch({
                url: '/api/requestHESMIGO',
                method: 'POST',
                data: formData,
            });
            return response;
        };

        const origen = computed(() => props.origen);

        const showLoader = computed(() => usePPalStore.state.showLoader);

        watch(showModal, (/** @type {Boolean} */ value) => {
            if (!value) {
                porcentaje.min = 1;
                porcentaje.max = 100;
                porcentaje.value = 0;
                solicitado.value = 0;
                observacion.value = '';
                files.value = [];
            }
        });

        return {
            showModal,
            soc,
            disponible,
            solicitado,
            optionSelected,
            showAlert,
            sendRequestHESMIGO,
            showLoader,
            origen,
            observacion,
            files,
            showAddFiles,
            typeFiles,
            socProps,
            optionsRadio,
            porcentaje,
            solicitadoFormat,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                solicitarHESMIGO: () => this.solicitarHESMIGO(accion),
                changeShowFiles: () => {
                    this.showAddFiles = !this.showAddFiles;
                },
                addFiles: () => {
                    this.files = accion.files;
                    this.showAddFiles = false;
                },
                DeleteFiles: () => this.deleteFiles(accion.file),
                default: () => {
                    this.optionSelected = '';
                    this.solicitado = 0;
                    this.soc = {};
                    this.$emit('accion', accion);
                },
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        getType(file) {
            const type = this.typeFiles.find(item => item.type === file.type);
            if (type == undefined) return 'fas fa-file fa-2x text-secondary';
            return `${type.color} ${type.icon}`;
        },
        solicitarHESMIGO(/** @type {Object} */ params) {
            if (this.showAlert) {
                return;
            }

            usePPalStore.commit('setShowLoader', true);

            this.sendRequestHESMIGO({
                id: params.soc.id,
                monto: params.monto,
                token_files: params.soc.token_files,
                observacion: this.observacion,
            }).then((/** @type {Object} */ data) => {
                if (data.success === 1) {
                    Swal.fire('Enviado!', data.message, 'success');
                    this.$emit('accion', {
                        accion: 'loadSOCByState',
                        id: this.origen === 'misParticipaciones' ? 99 : 2,
                    });
                    this.$emit('accion', {
                        accion: 'closeModal',
                    });
                } else {
                    Swal.fire('Error!', data.message, 'error');
                }
                usePPalStore.commit('setShowLoader', false);
            });
        },
        deleteFiles(/** @type {Object} */ file) {
            this.files = this.files.filter(item => item.archivo !== file.archivo);
        },
    },
    template: html`
        <newModal
            :idModal="origen+'_requestHESMIGO'"
            :showModal="showModal"
            :draggable.bool="true"
            @accion="accion"
            :key="origen+'_requestHESMIGO'"
            size="max-w-6xl">
            <template v-slot:title>Solicitar HES/MIGO</template>
            <template v-slot:body>
                <div class="col col-md-12">
                    <div class="row">
                        <div class="form-group col-3 mb-0">
                            <label>Total de SOC</label>
                            <p class="form-control disabled mb-0 text-right">
                                {{ soc.total_solicitud | format_number_n_decimal(0) }}
                            </p>
                        </div>
                        <div v-if="soc.retencion > 0" class="form-group col-3 mb-0">
                            <label>Retención Monto Superior (5%)</label>
                            <p class="form-control disabled mb-0 text-right">
                                {{ soc.retencion | format_number_n_decimal(0) }}
                            </p>
                        </div>
                        <div class="form-group col-3 mb-0">
                            <label>Monto Utilizado</label>
                            <p class="form-control disabled mb-0 text-right">
                                {{ soc.total_solicitado | format_number_n_decimal(0) }}
                            </p>
                        </div>
                        <div class="form-group col-3 mb-0">
                            <label>Monto Disponible</label>
                            <p class="form-control disabled mb-0 text-right">
                                {{ disponible | format_number_n_decimal(0) }}
                            </p>
                        </div>
                    </div>
                    <hr />
                    <div class="row">
                        <iRadio
                            label="Seleccione una opción"
                            :options="optionsRadio"
                            v-model="optionSelected"
                            :horizontalList="true"
                            :id="origen" />
                    </div>
                    <div class="row">
                        <div class="form-group col-5">
                            <label :for="origen+'_porcentajeHESMIGO'">
                                <p class="mb-0" v-if="soc.tipo_soc !== 'Contractual'">
                                    Ingrese el % para pedir HES/MIGO
                                </p>
                                <p class="mb-0" v-else>Ingrese el Monto para pedir HES/MIGO</p>
                            </label>
                            <!-- Input para solicitar HES/MIGO por Porcentaje -->
                            <div class="flex mb-2" v-if="soc.tipo_soc !== 'Contractual'">
                                <div class="input-group col-5">
                                    <input
                                        type="number"
                                        class="form-control"
                                        :id="origen+'_porcentajeHESMIGO'"
                                        :min="porcentaje.min"
                                        :max="porcentaje.max"
                                        v-model.number="porcentaje.value"
                                        :disabled="optionSelected === 'completo'" />
                                    <div class="input-group-append">
                                        <span class="input-group-text">%</span>
                                    </div>
                                </div>

                                <div class="input-group col-7">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">$</span>
                                    </div>
                                    <input
                                        type="text"
                                        disabled="disabled"
                                        class="form-control text-right"
                                        :id="origen+'_montoHESMIGO'"
                                        :value="solicitadoFormat" />
                                </div>
                            </div>
                            <!-- Input para solicitar HES/MIGO por Monto -->
                            <div class="flex mb-2" v-else>
                                <div class="input-group col-7">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">$</span>
                                    </div>
                                    <input
                                        :disabled="optionSelected === 'completo'"
                                        type="text"
                                        class="form-control text-right"
                                        :id="origen+'_montoHESMIGO'"
                                        v-model="solicitado" />
                                </div>
                            </div>
                            <div class="alert alert-warning alert-dismissible" v-if="showAlert">
                                <strong>Advertencia!</strong>
                                El monto ingresado no puede ser menor o igual a 0, ni mayor al disponible.
                            </div>
                        </div>
                        <div class="form-group col-3">
                            <label :for="origen+'_montoHESMIGO'">Observación</label>
                            <textarea
                                class="form-control"
                                :id="origen+'_observacionHESMIGO'"
                                rows="3"
                                v-model="observacion"></textarea>
                        </div>
                        <div class="form-group col-4">
                            <label>
                                Adjuntar Archivos (opcional)
                                <a class="btn" @click="accion({accion:'changeShowFiles'})">
                                    <span class="badge bg-success">
                                        <i class="bi bi-plus"></i>
                                    </span>
                                    <i class="fas fa-file"></i>
                                    Agregar
                                </a>
                            </label>
                            <div class="d-flex flex-wrap">
                                <div v-for="file in files" class="border-primary">
                                    <span
                                        class="badge bg-danger p-0 ml-1"
                                        @click="accion({accion:'DeleteFiles', file})"
                                        style="cursor:pointer;">
                                        <i class="bi bi-trash"></i>
                                    </span>
                                    <i :class="getType(file)+' fa-2x'"></i>
                                    {{file.archivo}}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row" v-if="showAddFiles">
                        <dropZone @accion="accion" :multiple="true" :nfilesMultiple="5" :files="files" />
                    </div>
                </div>
            </template>
            <template v-slot:footer>
                <div class="flex justify-between">
                    <button
                        v-if="!showAlert"
                        type="button"
                        class="btn btn-success"
                        @click="accion({ accion: 'solicitarHESMIGO', soc: soc, monto: solicitado,})"
                        :disabled="showLoader">
                        Solicitar
                        <span v-if="showLoader" class="loader"></span>
                    </button>
                    <button type="button" class="btn btn-default" @click="accion({accion: 'closeModal'})">
                        Cerrar
                    </button>
                </div>
            </template>
        </newModal>
    `,
});

Vue.component('comparativo', comparativo);
Vue.component('participantes', participantes);
Vue.component('cgestion', cgestion);
const appSOCCG = new Vue({
    el: '#ppal',
    delimiters: ['${', '}'],
    store: usePPalStore,
    methods: {
        ...Vuex.mapMutations(['SET_FUNCTIONS_PASARELLA']),
        pasarella: function (param) {
            this.SET_FUNCTIONS_PASARELLA(param);
        },
    },
    setup() {
        const userSistema = ref([]);
        const loading = ref(false);

        provide('loading', loading);

        usePPalStore.dispatch('loadBaseParticipantes').then((/** @type {Array} */ response) => {
            userSistema.value = response;
        });
        provide('userSistema', userSistema);

        return {
            loading,
        };
    },
    template: html`
        <div>
            <div class="content-header" id="contentHeader">
                <div class="container-fluid">
                    <div class="row mb-2">
                        <div class="col-sm-6">
                            <h1 class="m-0 text-dark">
                                <i class="fas fa-comments-dollar"></i>
                                Solicitud Orden de Compra - Control de Gestión
                                <loader v-if="loading"></loader>
                            </h1>
                        </div>
                        <div class="col-sm-6">
                            <ol class="breadcrumb float-sm-right">
                                <li class="breadcrumb-item">
                                    <a href="/portal">Home</a>
                                </li>
                                <li class="breadcrumb-item active">Dashboard</li>
                                <li class="breadcrumb-item d-flex">
                                    <configUserCgestion />
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main content -->
            <div class="content">
                <ppal />
            </div>
        </div>
    `,
});

import eventDelegator from '@/jscontrollers/composables/eventDelegator';

eventDelegator.register('pasarella_controldegestion', 'click', function (event) {
    pasarella(appSOCCG, event);
});
