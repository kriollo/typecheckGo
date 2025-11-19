import newModal from '@/jscontrollers/components/newModal';
import {
    addDias,
    format_number_n_decimal,
    getDiaActual,
    pasarella,
    versaFetch,
} from '@/jscontrollers/composables/utils';
import {
    fetchAprobatorsById,
    fetchCGestionBySOCId,
    fetchDeleteSOCById,
    fetchFilesById,
    fetchReSendMailAprobator,
    TOPE_RETENCION,
} from '@/jscontrollers/solicitudordencompra/composableSOC.js';
import { usePPalStore } from '@/jscontrollers/usePPalStore.js';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm.js';

import dropZone from '@/jscontrollers/components/dropZone.js';
import iCheck from '@/jscontrollers/components/iCheck.js';
import iRadio from '@/jscontrollers/components/iRadio.js';
import modal from '@/jscontrollers/components/modal.js';
import eventDelegator from '@/jscontrollers/composables/eventDelegator';
import { cgestion } from '@/jscontrollers/solicitudordencompra/componentsSOC';
/* eslint-disable */
const dz = dropZone;
const md = modal;
const ir = iRadio;
const ic = iCheck;
/* eslint-enable */

const { ref, computed, watch, reactive } = Vue;

const LIMITE_REQUEST_HESMIGO_CONTRACTUAL = 1.05;

Vue.component('ppal', {
    setup() {
        const estado = {
            1: 'pendientes',
            2: 'aprobadas',
            3: 'rechazadas',
            4: 'aprobadas',
            99: 'misParticipaciones',
        };

        const tabOrigen = {
            Pendientes: 1,
            'En Proceso': 2,
            Rechazadas: 3,
            misParticipaciones: 99,
        };

        const state = reactive({
            Pendiente: 0,
            Aprobadas: 0,
            Rechazadas: 0,
            misParticipaciones: 0,
        });

        const result = reactive({
            pendientes: [],
            aprobadas: [],
            rechazadas: [],
            misParticipaciones: [],
        });

        const loadState = async () => {
            const data = (await versaFetch({
                url: '/api/getResumeSOCsByIdUserSolicitante',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })) as unknown as Array<{
                estado_solicitante: number | string;
                total: number;
            }>;

            state.Pendiente = 0;
            state.Aprobadas = 0;
            state.Rechazadas = 0;
            state.misParticipaciones = 0;

            state.Pendiente += +(data.find(item => item.estado_solicitante == 1)?.total ?? 0);
            state.Aprobadas += +(data.find(item => item.estado_solicitante == 2)?.total ?? 0);
            state.Rechazadas += +(data.find(item => item.estado_solicitante == 3)?.total ?? 0);
            state.misParticipaciones += +(
                data.find(item => item.estado_solicitante == 'misParticipaciones')?.total ?? 0
            );
        };

        const loadSOCByState = async (/** @type {Number} */ state) => {
            const data = await versaFetch({
                url: '/api/getSOCsByEstado',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    estado_solicitante: state,
                }),
            });
            result[estado[state]] = data;
            loadState();
        };
        loadSOCByState(1);

        const endSOCManual = async (/** @type {Object} */ params) => {
            const data = await versaFetch({
                url: '/api/endSOCManual',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id: params.id,
                }),
            });
            return data;
        };

        return {
            tabOrigen,
            state,
            result,
            loadSOCByState,
            endSOCManual,
        };
    },
    methods: {
        accion(/** @type {Object} */ state) {
            const actions = {
                loadSOCByState: () => this.loadSOCByState(state.id),
                endSOC: () => this.endSOC(state),
            };

            const selectedAction = actions[state.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        async endSOC(/** @type {Object} */ params) {
            const result = await Swal.fire({
                title: '¿Estas seguro?',
                text: '¡No podrás revertir esto!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33d33',
                confirmButtonText: 'Si, finalizar!',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const data = await this.endSOCManual(params);
                if (data.success == 1) {
                    Swal.fire('Finalizada!', data.message, 'success');
                    const estado = Object.keys(this.tabOrigen).find(key => key == params.tabOrigen);
                    this.loadSOCByState(this.tabOrigen[estado]);
                } else {
                    Swal.fire('Error!', data.message, 'error');
                }
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
                                id="custom-tabs-Por_Aprobar-tab"
                                data-toggle="pill"
                                href="#Por_Aprobar"
                                role="tab"
                                aria-controls="Por_Aprobar-tab"
                                aria-selected="true"
                                @click="loadSOCByState(1)">
                                Solicitudes
                            </a>
                        </li>
                        <li class="nav-item">
                            <a
                                class="nav-link"
                                id="custom-tabs-Por_Entregar-tab"
                                data-toggle="pill"
                                href="#Por_Entregar"
                                role="tab"
                                aria-controls="Por_Entregar-tab"
                                aria-selected="false"
                                @click="loadSOCByState(2)">
                                En Proceso ( {{ state.Aprobadas }} )
                            </a>
                        </li>
                        <li class="nav-item">
                            <a
                                class="nav-link"
                                id="custom-tabs-Rechazadas-tab"
                                data-toggle="pill"
                                href="#Rechazadas"
                                role="tab"
                                aria-controls="Rechazadas-tab"
                                aria-selected="false"
                                @click="loadSOCByState(3)">
                                Rechazadas ( {{ state.Rechazadas }} )
                            </a>
                        </li>
                        <li class="nav-item">
                            <a
                                class="nav-link"
                                id="custom-tabs-miParticipacion-tab"
                                data-toggle="pill"
                                href="#miParticipacion"
                                role="tab"
                                aria-controls="miParticipacion-tab"
                                aria-selected="false"
                                @click="loadSOCByState(99)">
                                Mis Participaciones ( {{ state.misParticipaciones }} )
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
                    </ul>
                </div>
                <div class="card-body">
                    <div class="tab-content" id="custom-tabs-four-tabContent">
                        <div
                            class="tab-pane fade active show"
                            id="Por_Aprobar"
                            role="tabpanel"
                            aria-labelledby="Por_Aprobar-tab">
                            <por-aprobar :porAprobar="result.pendientes" @accion="accion"></por-aprobar>
                        </div>
                        <div class="tab-pane fade" id="Por_Entregar" role="tabpanel" aria-labelledby="Por_Entregar-tab">
                            <en-proceso :enProceso="result.aprobadas" @accion="accion"></en-proceso>
                        </div>
                        <div class="tab-pane fade" id="Rechazadas" role="tabpanel" aria-labelledby="Rechazadas-tab">
                            <rechazadas :rechazadas="result.rechazadas" @accion="accion"></rechazadas>
                        </div>
                        <div
                            class="tab-pane fade"
                            id="miParticipacion"
                            role="tabpanel"
                            aria-labelledby="miParticipacion-tab">
                            <mis-participaciones
                                :misParticipaciones="result.misParticipaciones"
                                @accion="accion"></mis-participaciones>
                        </div>
                        <div class="tab-pane fade" id="Consulta" role="tabpanel" aria-labelledby="Consulta-tab">
                            <consulta></consulta>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});

Vue.component('por-aprobar', {
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
        const filter = ref('');
        const aprobators = ref([]);
        const files = ref([]);
        const cgestion = ref([]);

        const showModal = ref(false);
        const ShowModalFiles = ref(false);
        const showModalCGestion = ref(false);

        watch(porAprobar, newVal => {
            dataFiltrada.value = newVal;
        });

        const getCGestion = async (/** @type {Number} */ id) => fetchCGestionBySOCId(id);

        const getAprobators = async (/** @type {Number} */ id) => fetchAprobatorsById(id);

        const deleteSOCById = async (/** @type {Number} */ id) => fetchDeleteSOCById(id);

        const viewAllFiles = async (/** @type {Number} */ id) => fetchFilesById(id);

        const reSendMailAprobator = async (/** @type {Object} */ params) => fetchReSendMailAprobator(params);

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
            dataFiltrada,
            filter,
            setFilter,
            showModal,
            aprobators,
            getAprobators,
            deleteSOCById,
            viewAllFiles,
            files,
            ShowModalFiles,
            reSendMailAprobator,
            showModalCGestion,
            cgestion,
            getCGestion,
        };
    },
    methods: {
        ...Vuex.mapMutations(['setShowLoader']),
        accion(/** @type {Object} */ accion) {
            const actions = {
                viewAprobators: () => this.viewAprobators(accion.id),
                viewFiles: () => this.viewFiles(accion.id),
                edit: () => this.edit(accion),
                delete: () => this.delete(accion.id),
                closeModal: () => {
                    this.showModal = false;
                    this.ShowModalFiles = false;
                    this.showModalCGestion = false;
                },
                reSendEmail: () => this.reSendEmail(accion),
                loadSOCByState: () => this.$emit('accion', accion),
                viewCGestion: () => this.viewCGestion(accion.id),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        viewAprobators(/** @type {Number} */ id) {
            this.aprobators = [];
            this.getAprobators(id).then((/** @type {Object} */ data) => {
                if (data.success == 1) {
                    this.aprobators = data.data;
                    this.showModal = true;
                }
            });
        },
        edit(/** @type {Object} */ params) {
            location.href = `/solicitudordencompra/editsolicitudordencompra/${params.token_files}?id=${params.id}`;
        },
        async delete(/** @type {Number} */ id) {
            const result = await Swal.fire({
                title: '¿Estas seguro?',
                text: '¡No podrás revertir esto!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33d33',
                confirmButtonText: 'Si, eliminar!',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const data = await this.deleteSOCById(id);
                if (data.success == 1) {
                    Swal.fire('Eliminado!', data.message, 'success');
                    this.$emit('accion', {
                        accion: 'loadSOCByState',
                        id: 1,
                    });
                } else {
                    Swal.fire('Error!', data.message, 'error');
                }
            }
        },
        viewFiles(/** @type {number} */ id) {
            this.files = [];
            this.viewAllFiles(id).then((/** @type {Object} */ data) => {
                this.files = data;
                this.ShowModalFiles = true;
            });
        },
        async reSendEmail(/** @type {Object} */ params) {
            const data = await this.reSendMailAprobator(params);
            if (data.success == 1) {
                Swal.fire('Enviado!', data.message, 'success');
                this.setShowLoader(false);
                this.showModal = false;
                this.$emit('accion', {
                    accion: 'loadSOCByState',
                    id: 1,
                });
            } else {
                Swal.fire('Error!', data.message, 'error');
            }
        },
        async viewCGestion(/** @type {Number} */ id) {
            this.cgestion = [];
            const data = await this.getCGestion(id);
            this.cgestion = data;
            this.showModalCGestion = true;
        },
    },
    template: html`
        <div class="card">
            <participantes :participantes="aprobators" :showModal="showModal" @accion="accion" origen="pendientes" />
            <comparativo :files="files" :showModal="ShowModalFiles" @accion="accion" origen="pendientes" />

            <cgestion
                key="pendientes_cgestion"
                id="pendientes_cgestion"
                :cgestion="cgestion"
                :showModal="showModalCGestion"
                @accion="accion" />

            <div class="card-header">
                <h3 class="card-title">Pendiente por Aprobar</h3>
            </div>
            <div class="card-body">
                <div class="row mb-2">
                    <div>
                        <div class="input-group">
                            <input
                                type="text"
                                class="form-control"
                                id="txtFilter_porAprobar"
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
                    <tableResult
                        :data="dataFiltrada"
                        tabOrigen="Pendientes"
                        @accion="accion"
                        key="pendientes"></tableResult>
                </div>
            </div>
        </div>
    `,
});
Vue.component('en-proceso', {
    emits: ['accion'],
    props: {
        enProceso: {
            type: Array,
            default: [],
        },
    },
    setup(props) {
        const ShowModalFiles = ref(false);
        const showModalRHESMIGO = ref(false);
        const showModalAprob = ref(false);
        const showModalCGestion = ref(false);

        const files = ref([]);
        const socSelected = ref({});
        const aprobators = ref([]);
        const cgestion = ref([]);

        const dataFiltrada = ref([]);
        const filter = ref('');

        const getCGestion = async (/** @type {Number} */ id) => fetchCGestionBySOCId(id);

        const getAprobators = async (/** @type {Number} */ id) => fetchAprobatorsById(id);

        const viewAllFiles = async (/** @type {Number} */ id) => fetchFilesById(id);

        const enProceso = computed(() => props.enProceso);

        watch(enProceso, newVal => {
            dataFiltrada.value = newVal;
        });

        watch(showModalRHESMIGO, value => {
            if (!value) {
                socSelected.value = {};
            }
        });

        const reSendMailCGestionAPI = async (/** @type {Object} */ params) => {
            const response = await versaFetch({
                url: '/api/reSendMailCGestion',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    soc_encabezado_id: params.id,
                    estado_solicitante: params.estado_solicitante,
                    estado_cgestion: params.estado_cgestion,
                }),
            });
            return response;
        };

        const setFilter = () => {
            if (filter.value !== '') {
                dataFiltrada.value = enProceso.value.filter(item => {
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
                dataFiltrada.value = enProceso.value;
            }
        };

        return {
            dataFiltrada,
            filter,
            setFilter,
            reSendMailCGestionAPI,
            files,
            viewAllFiles,
            ShowModalFiles,
            showModalRHESMIGO,
            socSelected,
            showModalAprob,
            aprobators,
            getAprobators,
            showModalCGestion,
            cgestion,
            getCGestion,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                reSendMailCGestion: () => this.reSendMailCGestion(accion),
                viewFiles: () => this.viewFiles(accion.id),
                closeModal: () => {
                    this.ShowModalFiles = false;
                    this.showModalRHESMIGO = false;
                    this.showModalAprob = false;
                    this.socSelected = {};
                    this.showModalCGestion = false;
                },
                showSolicitarHESMIGO: () => {
                    this.socSelected = accion.soc;
                    this.showModalRHESMIGO = true;
                },
                loadSOCByState: () => this.$emit('accion', accion),
                endSOC: () => this.$emit('accion', accion),
                viewAprobators: () => this.viewAprobators(accion.id),
                viewCGestion: () => this.viewCGestion(accion.id),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        reSendMailCGestion(/** @type {Object} */ params) {
            usePPalStore.commit('setShowLoader', true);
            this.reSendMailCGestionAPI(params).then((/** @type {Object} */ data) => {
                if (data.success == 1) {
                    Swal.fire('Enviado!', data.message, 'success');
                } else {
                    Swal.fire('Error!', data.message, 'error');
                }
                usePPalStore.commit('setShowLoader', false);
            });
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
                if (data.success == 1) {
                    this.aprobators = data.data;
                    this.showModalAprob = true;
                }
            });
        },
        viewCGestion(/** @type {Number} */ id) {
            this.cgestion = [];
            this.getCGestion(id).then((/** @type {Object} */ data) => {
                this.cgestion = data;
                this.showModalCGestion = true;
            });
        },
    },
    template: html`
        <div class="card">
            <participantes
                :participantes="aprobators"
                :showModal="showModalAprob"
                @accion="accion"
                key="enProceso"
                origen="enProceso" />
            <comparativo :files="files" :showModal="ShowModalFiles" @accion="accion" origen="enProceso" />
            <requestHESMIGO :showModal="showModalRHESMIGO" origen="enProceso" @accion="accion" :soc="socSelected" />
            <cgestion
                key="enProceso_cgestion"
                id="enProceso_cgestion"
                :cgestion="cgestion"
                :showModal="showModalCGestion"
                @accion="accion" />

            <div class="card-header">
                <h3 class="card-title">En Proceso</h3>
            </div>
            <div class="card-body">
                <div class="row mb-2">
                    <div>
                        <div class="input-group">
                            <input
                                type="text"
                                class="form-control"
                                id="txtFilter_enProceso"
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
                    <tableResult :data="dataFiltrada" tabOrigen="En Proceso" @accion="accion"></tableResult>
                </div>
            </div>
        </div>
    `,
});
Vue.component('rechazadas', {
    emits: ['accion'],
    props: {
        rechazadas: {
            type: Array,
            default: [],
        },
    },
    setup(props) {
        const rechazadas = computed(() => props.rechazadas);
        const dataFiltrada = ref([]);
        const filter = ref('');

        watch(rechazadas, newVal => {
            dataFiltrada.value = newVal;
        });

        const setFilter = () => {
            if (filter.value !== '') {
                dataFiltrada.value = rechazadas.value.filter(item => {
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
                dataFiltrada.value = rechazadas.value;
            }
        };
        const aprobators = ref([]);
        const files = ref([]);
        const cgestion = ref([]);

        const showModal = ref(false);
        const ShowModalFiles = ref(false);
        const showModalCGestion = ref(false);

        const getCGestion = async (/** @type {Number} */ id) => fetchCGestionBySOCId(id);

        const getAprobators = async (/** @type {Number} */ id) => fetchAprobatorsById(id);

        const deleteSOCById = async (/** @type {Number} */ id) => fetchDeleteSOCById(id);

        const viewAllFiles = async (/** @type {Number} */ id) => fetchFilesById(id);

        const reSendMailAprobator = async (/** @type {Object} */ params) => fetchReSendMailAprobator(params);

        return {
            dataFiltrada,
            filter,
            setFilter,
            showModal,
            aprobators,
            getAprobators,
            deleteSOCById,
            viewAllFiles,
            files,
            ShowModalFiles,
            reSendMailAprobator,
            showModalCGestion,
            cgestion,
            getCGestion,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                viewAprobators: () => this.viewAprobators(accion.id),
                viewFiles: () => this.viewFiles(accion.id),
                edit: () => this.edit(accion),
                delete: () => this.delete(accion.id),
                closeModal: () => {
                    this.showModal = false;
                    this.ShowModalFiles = false;
                },
                reSendEmail: () => this.reSendEmail(accion),
                loadSOCByState: () => this.$emit('accion', accion),
                viewCGestion: () => this.viewCGestion(accion.id),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        viewAprobators(/** @type {Number} */ id) {
            this.aprobators = [];
            this.getAprobators(id).then((/** @type {Object} */ data) => {
                if (data.success == 1) {
                    this.aprobators = data.data;
                    this.showModal = true;
                }
            });
        },
        edit(/** @type {Object} */ params) {
            location.href = `/solicitudordencompra/editsolicitudordencompra/${params.token_files}?id=${params.id}`;
        },
        async delete(/** @type {Number} */ id) {
            const result = await Swal.fire({
                title: '¿Estas seguro?',
                text: '¡No podrás revertir esto!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33d33',
                confirmButtonText: 'Si, eliminar!',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const data = await this.deleteSOCById(id);
                if (data.success == 1) {
                    Swal.fire('Eliminado!', data.message, 'success');
                    this.$emit('accion', {
                        accion: 'loadSOCByState',
                        id: 3,
                    });
                } else {
                    Swal.fire('Error!', data.message, 'error');
                }
            }
        },
        viewFiles(/** @type {number} */ id) {
            this.files = [];
            this.viewAllFiles(id).then((/** @type {Object} */ data) => {
                this.files = data;
                this.ShowModalFiles = true;
            });
        },
        async reSendEmail(/** @type {Object} */ params) {
            if (params.estado_aprueba == 3) {
                const result = await Swal.fire({
                    title: '¿Estas seguro?',
                    text: 'Esta acción reenviará el correo al participante, para que realice las correcciones necesarias',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33d33',
                    confirmButtonText: 'Si, reenviar!',
                    cancelButtonText: 'Cancelar',
                });
                if (result.isConfirmed) {
                    const data = await this.reSendMailAprobator(params);
                    if (data.success == 1) {
                        Swal.fire('Enviado!', data.message, 'success');
                        this.showModal = false;
                        usePPalStore.commit('setShowLoader', false);
                        this.$emit('accion', {
                            accion: 'loadSOCByState',
                            id: 3,
                        });
                    } else {
                        Swal.fire('Error!', data.message, 'error');
                        usePPalStore.commit('setShowLoader', false);
                    }
                } else {
                    usePPalStore.commit('setShowLoader', false);
                }
            }
        },
        viewCGestion(/** @type {Number} */ id) {
            this.cgestion = [];
            this.getCGestion(id).then((/** @type {Object} */ data) => {
                this.cgestion = data;
                this.showModalCGestion = true;
            });
        },
    },
    template: html`
        <div class="card">
            <participantes
                :participantes="aprobators"
                :showModal="showModal"
                @accion="accion"
                key="rechaAprob"
                origen="rechazadas" />
            <comparativo :files="files" :showModal="ShowModalFiles" @accion="accion" origen="rechazadas" />
            <cgestion
                key="enProceso_cgestion"
                id="enProceso_cgestion"
                :cgestion="cgestion"
                :showModal="showModalCGestion"
                @accion="accion" />
            <div class="card-header">
                <h3 class="card-title">Rechazadas</h3>
            </div>
            <div class="card-body">
                <div class="row mb-2">
                    <div>
                        <div class="input-group">
                            <input
                                type="text"
                                class="form-control"
                                id="txtFilter_rechazada"
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
                    <tableResult
                        :data="dataFiltrada"
                        tabOrigen="Rechazadas"
                        @accion="accion"
                        key="rechazadas"></tableResult>
                </div>
            </div>
        </div>
    `,
});
Vue.component('misParticipaciones', {
    emits: ['accion'],
    props: {
        misParticipaciones: {
            type: Array,
            default: [],
        },
    },
    setup(props) {
        const misParticipaciones = computed(() => props.misParticipaciones);
        const dataFiltrada = ref([]);
        const filter = ref('');

        watch(misParticipaciones, newVal => {
            dataFiltrada.value = newVal;
        });

        const setFilter = () => {
            if (filter.value !== '') {
                dataFiltrada.value = misParticipaciones.value.filter(item => {
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
                dataFiltrada.value = misParticipaciones.value;
            }
        };

        const aprobators = ref([]);
        const files = ref([]);
        const socSelected = ref({});
        const cgestion = ref([]);

        const showModal = ref(false);
        const ShowModalFiles = ref(false);
        const showModalRHESMIGO = ref(false);
        const showModalCGestion = ref(false);

        const getCGestion = async (/** @type {Number} */ id) => fetchCGestionBySOCId(id);

        const getAprobators = async (/** @type {Number} */ id) => fetchAprobatorsById(id);

        const viewAllFiles = async (/** @type {Number} */ id) => fetchFilesById(id);

        return {
            dataFiltrada,
            filter,
            setFilter,
            showModal,
            aprobators,
            getAprobators,
            viewAllFiles,
            files,
            ShowModalFiles,
            showModalRHESMIGO,
            socSelected,
            showModalCGestion,
            cgestion,
            getCGestion,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                aprobar: () => this.prepareURL(accion),
                rechazar: () => this.prepareURL(accion),
                viewAprobators: () => this.viewAprobators(accion.id),
                viewFiles: () => this.viewFiles(accion.id),
                closeModal: () => {
                    this.showModal = false;
                    this.ShowModalFiles = false;
                    this.showModalRHESMIGO = false;
                    this.showModalCGestion = false;
                    this.socSelected = {};
                },
                showSolicitarHESMIGO: () => {
                    this.socSelected = accion.soc;
                    this.showModalRHESMIGO = true;
                },
                loadSOCByState: () => this.$emit('accion', accion),
                endSOC: () => this.$emit('accion', accion),
                viewCGestion: () => this.viewCGestion(accion.id),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        prepareURL(/** @type {{ token_participante: String; email_participante: String; accion: String }} */ accion) {
            let urlAccion = '';
            if (accion.accion === 'aprobar') {
                urlAccion = 'SOC_aprobacion';
            } else if (accion.accion === 'rechazar') {
                urlAccion = 'SOC_rechazo';
            }
            const baseUrl = window.location.href;
            const newBaseUrl = new URL(baseUrl);
            const url = `${newBaseUrl.origin}/externo/${urlAccion}?token=${accion.token_participante}&participante=${accion.email_participante}`;
            this.executeURL(url);
        },
        executeURL(/** @type {String} */ url) {
            const newWindow = window.open(url, '_blank');
            newWindow.addEventListener('load', () => {
                this.$emit('accion', {
                    accion: 'loadSOCByState',
                    id: 99,
                });
            });
        },
        viewAprobators(/** @type {Number} */ id) {
            this.aprobators = [];
            this.getAprobators(id).then((/** @type {Object} */ data) => {
                if (data.success == 1) {
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
        viewCGestion(/** @type {Number} */ id) {
            this.cgestion = [];
            this.getCGestion(id).then((/** @type {Object} */ data) => {
                this.cgestion = data;
                this.showModalCGestion = true;
            });
        },
    },
    template: html`
        <div class="card">
            <participantes
                :participantes="aprobators"
                :showModal="showModal"
                @accion="accion"
                key="mpAprob"
                origen="misParticipaciones" />
            <comparativo :files="files" :showModal="ShowModalFiles" @accion="accion" origen="misParticipaciones" />
            <requestHESMIGO
                :showModal="showModalRHESMIGO"
                origen="misParticipaciones"
                @accion="accion"
                :soc="socSelected" />
            <cgestion
                key="pendientes_cgestion"
                id="pendientes_cgestion"
                :cgestion="cgestion"
                :showModal="showModalCGestion"
                @accion="accion" />
            <div class="card-header">
                <h3 class="card-title">Mis Participaciones</h3>
            </div>
            <div class="card-body">
                <div class="row mb-2">
                    <div>
                        <div class="input-group">
                            <input
                                type="text"
                                class="form-control"
                                id="txtFilter_misParticipaciones"
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
                    <tableResultMisParticipaciones
                        :data="dataFiltrada"
                        tabOrigen="misParticipaciones"
                        @accion="accion"
                        key="misParticipateciones"></tableResultMisParticipaciones>
                </div>
            </div>
        </div>
    `,
});
Vue.component('consulta', {
    setup() {
        const desde = ref(getDiaActual());
        const hasta = ref(getDiaActual());
        const tipoConsulta = ref('General');

        desde.value = addDias(hasta.value, -30);

        const functionPasarella = computed(() => usePPalStore.state.functionsPasarella);

        const owner_user = computed(() => usePPalStore.state.owner_user);

        const misParticipaciones = ref(false);
        const aprobators = ref([]);
        const files = ref([]);
        const cgestion = ref([]);

        const showModal = ref(false);
        const ShowModalFiles = ref(false);
        const showModalCGestion = ref(false);

        const getCGestion = async (/** @type {Number} */ id) => fetchCGestionBySOCId(id);

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
                    id_user: owner_user.value.id_user,
                    misParticipaciones: params.misParticipaciones,
                    tipoConsulta: tipoConsulta.value,
                }),
            });
            return response;
        };
        const getAprobators = async (/** @type {Number} */ id) => fetchAprobatorsById(id);

        const viewAllFiles = async (/** @type {Number} */ id) => fetchFilesById(id);

        return {
            desde,
            hasta,
            getSOCByDates,
            misParticipaciones,
            aprobators,
            showModal,
            files,
            ShowModalFiles,
            functionPasarella,
            getAprobators,
            viewAllFiles,
            showModalCGestion,
            cgestion,
            getCGestion,
            tipoConsulta,
            owner_user,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                viewAprobators: () => this.viewAprobators(accion.id),
                viewFiles: () => this.viewFiles(accion.id),
                closeModal: () => {
                    this.showModal = false;
                    this.ShowModalFiles = false;
                    this.showModalCGestion = false;
                },
                viewCGestion: () => this.viewCGestion(accion.id),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        loadSocByDates() {
            const owner_user = this.owner_user;
            this.getSOCByDates({
                desde: this.desde,
                hasta: this.hasta,
                misParticipaciones: this.misParticipaciones,
            }).then((/** @type {Object} */ data): void => {
                if (data.success == 1) {
                    if ($('#tableResult').find('tr').children().length > 0) {
                        $('#tableResult').find('tr').children().remove();
                        $('#tableResult').find('tbody').remove();
                        $('#tableResult').DataTable().destroy();
                        $('#tableResult').empty();
                    }

                    const consultaFn = {
                        General: () => this.consultaGeneral(data),
                        'Por Proyecto': () => this.consultaPorProyecto(data),
                        'General Aperturado por CGestión': () => this.aperturadoPorCGesiton(data, owner_user),
                    };
                    const selectedConsulta = consultaFn[this.tipoConsulta] || consultaFn['General'];
                    if (typeof selectedConsulta === 'function') {
                        selectedConsulta();
                    }

                    $('#tableResult').DataTable().columns.adjust().draw();
                }
            });
        },
        viewAprobators(/** @type {Number} */ id) {
            this.aprobators = [];
            this.getAprobators(id).then((/** @type {Object} */ data): void => {
                if (data.success == 1) {
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
        viewCGestion(/** @type {Number} */ id) {
            this.cgestion = [];
            this.getCGestion(id).then((/** @type {Object} */ data) => {
                this.cgestion = data;
                this.showModalCGestion = true;
            });
        },
        consultaGeneral(data) {
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
                                    data-value='{"accion": "viewFiles", "id": ${row.id} }'>
                                    <i class=" fa fa-server" aria-hidden="true"></i>
                                </button>
                                ${row.countcGestion !== '0'
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
                            </div>
                        `,
                    },
                    { data: 'tipo_soc' },
                    { data: 'solicitante' },
                    { data: 'rut_proveedor' },
                    { data: 'nombre_proveedor' },
                    { data: 'descripcion' },
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
                                    data-value='{"accion": "viewFiles", "id": ${row['id']} }'>
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

                                ${row['estado_solicitante'] == 2 && row['estado_cgestion'] == 2
                                    ? html`
                                          <button
                                              type="button"
                                              class="btn btn-warning btn-sm"
                                              title="Devolver a Pendiente OC"
                                              name="pasarella"
                                              data-value='{"accion": "devolverEstado", "id": ${row.id}, "estado":"Generando OC"}'>
                                              <i class="fa fa-reply"></i>
                                          </button>
                                      `
                                    : ''}
                                ${owner_user.rol == 1
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
                    { data: 'descripcion' },
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
            <div class="card-header px-1 py-1">
                <div class="row">
                    <div class="col-md-3">
                        <select class="form-control" id="tipoConsulta" v-model="tipoConsulta">
                            <option>General</option>
                            <option>General Aperturado por CGestión</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <input class="form-control" type="date" v-model="desde" v-bind:max="hasta" id="desde" />
                    </div>
                    <div class="col-md-3">
                        <input class="form-control" type="date" v-model="hasta" v-bind:min="desde" id="hasta" />
                    </div>
                    <div class="col-md-2">
                        <iCheck id="iMisParticipaciones" v-model="misParticipaciones" label="Mis Participaciones" />
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
            </div>
            <div class="card-body">
                <div class="col col-md-12">
                    <participantes
                        :participantes="aprobators"
                        :showModal="showModal"
                        @accion="accion"
                        origen="consulta" />
                    <comparativo :files="files" :showModal="ShowModalFiles" @accion="accion" origen="consulta" />
                    <cgestion
                        key="consulta_cgestion"
                        id="consulta_cgestion"
                        :cgestion="cgestion"
                        :showModal="showModalCGestion"
                        @accion="accion" />
                    <table class="table table-bordered table-striped table-hover" id="tableResult"></table>
                </div>
            </div>
        </div>
    `,
});

Vue.component('participantes', {
    components: { newModal },
    props: {
        participantes: {
            type: Array,
            default: [],
        },
        showModal: {
            type: Boolean,
            default: false,
        },
        origen: {
            type: String,
            default: 'Pendientes',
        },
    },
    setup(props) {
        const participantes = computed(() => props.participantes);

        const showLoading = computed(() => usePPalStore.state.showLoader);

        const showModalLocal = computed(() => props.showModal);

        return {
            participantes,
            showModalLocal,
            showLoading,
        };
    },
    methods: {
        ...Vuex.mapMutations(['setShowLoader']),
        accion(/** @type {Object} */ accion) {
            if (accion.accion == 'reSendEmail') {
                this.setShowLoader(true);
            }
            this.$emit('accion', accion);
        },
    },
    template: html`
        <newModal
            :idModal="origen+'_viewAprobatorsModal'"
            :showModal="showModalLocal"
            @accion="accion"
            size="max-w-5xl">
            <template v-slot:title>Paricipantes</template>
            <template v-slot:body>
                <table class="table table-bordered table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Aprueba</th>
                            <th>Finaliza</th>
                            <th class="text-center">Estado Aprobación</th>
                            <th>fecha Aprobación</th>
                            <th class="text-center">Reenviar alerta</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in participantes" :key="item.id">
                            <td>{{ item.nombre }} &lt;{{ item.email }}&gt;</td>
                            <td>{{ item.aprueba == 1 ? "Si":"No" }}</td>
                            <td>{{ item.finaliza == 1 ? "Si":"No" }}</td>
                            <td class="text-center">
                                <span v-if="item.aprueba == 1 && item.estado_aprueba == 1" class="badge badge-warning">
                                    Pendiente
                                </span>
                                <span v-if="item.aprueba == 1 && item.estado_aprueba == 2" class="badge badge-success">
                                    Aprobado
                                </span>
                                <span v-if="item.aprueba == 1 && item.estado_aprueba == 3" class="badge badge-danger">
                                    Rechazado
                                </span>
                            </td>
                            <td>{{ item.fecha_aprueba }}</td>
                            <td class="text-center">
                                <button
                                    v-if="item.estado_aprueba != 2 && origen != 'enProceso' && origen != 'misParticipaciones' && origen != 'consulta' && !showLoading "
                                    type="button"
                                    class="btn btn-sm btn-info"
                                    @click="accion({soc_encabezado_id: item.soc_encabezado_id,token_participante: item.token,estado_aprueba: item.estado_aprueba,accion:'reSendEmail'})"
                                    title="Reenviar Correo">
                                    <i class="fas fa-envelope"></i>
                                </button>

                                <span v-if="showLoading" class="loader"></span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-default" @click="accion({accion: 'closeModal'})">Cerrar</button>
            </template>
        </newModal>
    `,
});
Vue.component('comparativo', {
    components: { newModal },
    props: {
        files: {
            type: Array,
            default: [],
        },
        showModal: {
            type: Boolean,
            default: false,
        },
        origen: {
            type: String,
            default: 'Pendientes',
        },
    },
    setup(props) {
        const fileHESMIGO = ref([]);
        const files = computed(() => {
            const groupBy = (array, key) =>
                array.reduce((result, currentValue) => {
                    const keyValue = currentValue[key];
                    const descriptiveKey = `${keyValue}`; // Aquí puedes hacer la clave más descriptiva
                    result[descriptiveKey] = result[descriptiveKey] || [];
                    result[descriptiveKey].push(currentValue);
                    return result;
                }, {});
            const file = groupBy(props.files, 'tipoarchivo');

            if (file['HESMIGO'] != undefined) {
                fileHESMIGO.value = file['HESMIGO'];
                delete file['HESMIGO'];
            }
            return file;
        });

        const showModalLocal = computed(() => props.showModal);

        return {
            files,
            fileHESMIGO,
            showModalLocal,
        };
    },
    data() {
        return {
            typeFiles: usePPalStore.state.FileTypeValid,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            this.$emit('accion', accion);
        },
        getType(file) {
            const type = this.typeFiles.find(item => item.type === file.type);
            if (!type) return '';
            return `${type.color} ${type.icon}`;
        },
        getItemsFiles(key) {
            return this.files[key];
        },
        getFilesHESMIGObyID(id) {
            //filtrar por id donde la ruta contiene el id asi /id/
            return this.fileHESMIGO.filter(item => item.ruta.includes(`/${id}/`));
        },
    },
    template: html`
        <newModal :idModal="origen+'_viewFilesModal'" :showModal="showModalLocal" @accion="accion" size="max-w-5xl">
            <template v-slot:title>Documentos Asociados</template>
            <template v-slot:body>
                <div class="col col-md-12">
                    <fieldset v-for="tipoFile, key in files">
                        <legend>{{ key }}</legend>
                        <div class="row">
                            <table v-if="key == 'Presupuestos'" class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Archivo</th>
                                        <th>Proveedor</th>
                                        <th>Monto Presupuesto</th>
                                        <th>Seleccionado</th>
                                        <th>Observación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in getItemsFiles(key)">
                                        <td :class="item.seleccionado == 1 ? 'bg-selected':''">
                                            <i :class="getType(item)+' fa-2x'"></i>
                                            <a :href="item.ruta" target="_blank">{{ item.archivo }}</a>
                                        </td>
                                        <td :class="item.seleccionado == 1 ? 'bg-selected':''">
                                            <i
                                                :class="item.val_asociado == 1?'bi bi-patch-check-fill text-primary':'bi bi-patch-check text-warning'"
                                                style="font-size:1.2rem"></i>
                                            {{ item.nombreproveedor }}
                                        </td>
                                        <td class="text-right" :class="item.seleccionado == 1 ? 'bg-selected':''">
                                            {{ item.monto | format_number_n_decimal(0) }}
                                        </td>
                                        <td class="text-center" :class="item.seleccionado == 1 ? 'bg-selected':''">
                                            <i v-if="item.seleccionado == 1" class="fas fa-check-circle"></i>
                                            <i v-else class="fas fa-times-circle text-danger"></i>
                                        </td>
                                        <td :class="item.seleccionado == 1 ? 'bg-selected':''">
                                            {{ item.observacion }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table v-if="key == 'Orden de Compra'" class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Archivo</th>
                                        <th>Orden de Compra</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in getItemsFiles(key)">
                                        <td>
                                            <i :class="getType(item)+' fa-2x'"></i>
                                            <a :href="item.ruta" target="_blank">{{ item.archivo }}</a>
                                        </td>
                                        <td>{{ item.orden_compra }}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <table v-if="key == 'HES / MIGO'" class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>HES / MIGO</th>
                                        <th>Fecha Solicitud</th>
                                        <th>Monto Solicitado</th>
                                        <th>Solicitante</th>
                                        <th>Observación</th>
                                        <th>Factura Asociada</th>
                                        <th>Documento Asociados</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in getItemsFiles(key)">
                                        <td>{{ item.hes_migo }}</td>
                                        <td>{{ item.fecha_request }}</td>
                                        <td>{{ item.monto_solicitado | format_number_n_decimal(0) }}</td>
                                        <td>{{ item.nombre_solicitante }}</td>
                                        <td>{{ item.observacion }}</td>
                                        <td>
                                            <a v-if="item.ruta != null" :href="item.ruta" target="_blank" download>
                                                <i :class="getType(item)+' fa-2x'"></i>
                                                {{ item.factura_asociada }}
                                            </a>
                                            <span v-else>{{ item.factura_asociada }}</span>
                                        </td>
                                        <td class="d-flex flex-column p-0 px-1">
                                            <a
                                                v-for="file in getFilesHESMIGObyID(item.id)"
                                                :href="file.ruta"
                                                target="_blank"
                                                download>
                                                <i :class="getType(file)+' fa-2x'"></i>
                                                {{ file.archivo }}
                                            </a>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </fieldset>
                </div>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-default" @click="accion({accion: 'closeModal'})">Cerrar</button>
            </template>
        </newModal>
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

        const lastRequestHESMIGO = ref([]);
        const averageMontoRequestHESMIGO = ref(0);
        const averageMontoRequestHESMIGOSRecargo = ref(0);

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

        const showAlertContractual = computed(
            () => averageMontoRequestHESMIGO.value > 0 && solicitado.value > averageMontoRequestHESMIGO.value
        );

        const sendRequestHESMIGO = async (/** @type {Object} */ params) => {
            const formData = new FormData();
            formData.append('id', params.id);
            formData.append('monto', params.monto);
            formData.append('token_files', params.token_files);
            formData.append('observacion', params.observacion);
            formData.append('sendAlertContractual', showAlertContractual.value);
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

        const getLastRequestHESMIGO = async (idSoc: number) => {
            const response = await versaFetch({
                url: '/api/getLastSOCHesMigo',
                method: 'POST',
                data: { idSoc },
            });

            return response;
        };

        watch(showModal, (/** @type {Boolean} */ value) => {
            if (!value) {
                porcentaje.min = 1;
                porcentaje.max = 100;
                porcentaje.value = 0;
                solicitado.value = 0;
                observacion.value = '';
                files.value = [];
            } else {
                getLastRequestHESMIGO(soc.value.id).then((/** @type {Object} */ data) => {
                    lastRequestHESMIGO.value = data;
                    averageMontoRequestHESMIGO.value =
                        lastRequestHESMIGO.value.reduce((acc, item) => acc + Number(item.monto_solicitado), 0) /
                            lastRequestHESMIGO.value.length || 0;

                    averageMontoRequestHESMIGOSRecargo.value = averageMontoRequestHESMIGO.value;
                    //agregar el 5%, aproximado
                    averageMontoRequestHESMIGO.value = Math.floor(
                        averageMontoRequestHESMIGO.value * LIMITE_REQUEST_HESMIGO_CONTRACTUAL
                    );
                });
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
            lastRequestHESMIGO,
            averageMontoRequestHESMIGO,
            showAlertContractual,
            averageMontoRequestHESMIGOSRecargo,
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
            }).then((/** @type {Object} */ data): void => {
                if (data.success == 1) {
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
    template: `
        <newModal :idModal="origen+'_requestHESMIGO'" :showModal="showModal" :draggable.bool="true" @accion="accion" :key="origen+'_requestHESMIGO'" :size=" socProps.tipo_soc === 'Contractual' ? 'max-w-7xl' : 'max-w-5xl' ">
            <template v-slot:title>Solicitar HES/MIGO</template>
            <template v-slot:body>
                <div class="col" :class="{'col-md-7': lastRequestHESMIGO.length > 0, 'col-md-12': lastRequestHESMIGO.length === 0}">
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
                        <iRadio label="Seleccione una opción" :options="optionsRadio" v-model="optionSelected" :horizontalList="true" :id="origen"/>
                    </div>
                    <div class="row">
                        <div class="form-group col-5">
                            <label :for="origen+'_porcentajeHESMIGO'">
                                <p class="mb-0" v-if="soc.tipo_soc !== 'Contractual'">
                                    Ingrese el % para pedir HES/MIGO
                                </p>
                                <p class="mb-0" v-else>
                                    Ingrese el Monto para pedir HES/MIGO
                                </p>
                            </label>
                            <!-- Input para solicitar HES/MIGO por Porcentaje -->
                            <div class="flex mb-2" v-if="soc.tipo_soc !== 'Contractual'">
                                <div class="input-group col-5">
                                    <input type="number" class="form-control" :id="origen+'_porcentajeHESMIGO'" :min="porcentaje.min" :max="porcentaje.max" v-model.number="porcentaje.value"
                                        :disabled="optionSelected === 'completo'" />
                                    <div class="input-group-append">
                                        <span class="input-group-text">%</span>
                                    </div>
                                </div>

                                <div class="input-group col-7">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">$</span>
                                    </div>
                                    <input type="text" disabled="disabled" class="form-control text-right" :id="origen+'_montoHESMIGO'" :value="solicitadoFormat"/>
                                </div>
                            </div>
                            <!-- Input para solicitar HES/MIGO por Monto -->
                            <div class="flex mb-2" v-else>
                                <div class="input-group col-7">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">$</span>
                                    </div>
                                    <input :disabled="optionSelected === 'completo'" type="text" class="form-control text-right" :id="origen+'_montoHESMIGO'" v-model="solicitado" />
                                </div>
                            </div>
                            <div class="alert alert-warning alert-dismissible" v-if="showAlert">
                                <strong>Advertencia!</strong>
                                El monto ingresado no puede ser menor o igual a 0, ni mayor al disponible.
                            </div>
                        </div>
                        <div class="form-group col-3">
                            <label :for="origen+'_montoHESMIGO'">
                                Observación
                            </label>
                            <textarea class="form-control" :id="origen+'_observacionHESMIGO'" rows="3" v-model="observacion"></textarea>
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
                                    <span class="badge bg-danger p-0 ml-1" @click="accion({accion:'DeleteFiles', file})" style="cursor:pointer;">
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
                <div class="col col-md-5" v-if="lastRequestHESMIGO.length > 0">
                    <h5 class="mb-2">Última Solicitud HESMIGO</h5>
                    <div class="alert alert-warning alert-dismissible" v-if="showAlertContractual">
                        <strong>Advertencia!</strong>
                        El monto ingresado supera el 5% del valor promedio de las ultimas solicitudes de HES/MIGO.
                    </div>
                    <table v-if="lastRequestHESMIGO.length > 0" class="table table-bordered table-striped table-hover">
                        <thead>
                            <tr>
                                <th>HES/MIGO</th>
                                <th>Fecha</th>
                                <th>Solicitante</th>
                                <th>Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in lastRequestHESMIGO" :key="index">
                                <td>{{item.hes_migo}}</td>
                                <td>{{item.fecha_request | format_solo_fecha}}</td>
                                <td>{{item.solicitante}}</td>
                                <td>{{item.monto_solicitado | currency}}</td>
                            </tr>
                            <tr>
                                <td colspan="3" class="text-end">Promedio Últimas solicitudes:</td>
                                <td>{{ averageMontoRequestHESMIGOSRecargo | currency }}</td>
                            </tr>
                            <tr>
                                <td colspan="3" class="text-end">No puede superar:</td>
                                <td>{{ averageMontoRequestHESMIGO | currency }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>
            <template v-slot:footer>
                <button v-if="!showAlert" type="button" class="btn btn-success" @click="accion({
                                                                                    accion: 'solicitarHESMIGO',
                                                                                    soc: soc,
                                                                                    monto: solicitado,
                                                                                })" :disabled="showLoader">
                    Solicitar
                    <span v-if="showLoader" class="loader"></span>
                </button>
                <button type="button" class="btn btn-default" @click="accion({accion: 'closeModal'})">
                    Cerrar
                </button>
            </template>
        </newModal>
    `,
});

Vue.component('tableResult', {
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

        const showLoading = computed(() => usePPalStore.state.showLoader);

        return {
            data,
            showLoading,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            this.$emit('accion', accion);
        },
        getPorcentajeUtilizado(/** @type {Number} */ total_solicitud, /** @type {Number} */ total_solicitado) {
            total_solicitud = Number(total_solicitud);
            total_solicitado = Number(total_solicitado);
            const porcentaje = ((total_solicitud - total_solicitado) / total_solicitud) * 100;

            return porcentaje.toFixed(1);
        },
    },
    template: html`
        <table class="table table-bordered table-striped table-hover">
            <thead>
                <tr>
                    <th>SOC Nº</th>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Campus</th>
                    <th>Area</th>
                    <th>Proyecto</th>
                    <th>Observación</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="item in data" :key="item.id">
                    <td>{{ item.id }}</td>
                    <td>{{ item.created_at }}</td>
                    <td>{{ item.descripcion }}</td>
                    <td>{{ item.desc_campus }}</td>
                    <td>{{ item.desc_area }}</td>
                    <td>{{ item.desc_proyecto }}</td>
                    <td>{{ item.observacion }}</td>
                    <td>
                        <span class="badge" :class="{'badge-warning': item.estado_solicitante == 1,'badge-success': item.estado_solicitante == 2,'badge-danger': item.estado_solicitante == 3}">{{ item.desc_estado }}</a>
                        </span>
                        <div v-if="item.estado_cgestion == 2 || item.estado_cgestion == 4">
                            <p class="py-0 my-0">Total Solicitud: {{ item.total_solicitud | format_number_n_decimal(0) }}</p>
                            <p class="py-0 my-0">Monto Disponible: {{ item.total_solicitud - item.total_solicitado | format_number_n_decimal(0) }}</p>
                            <p class="py-0 my-0">
                                <div class="progress progress-md">
                                    <div class="progress-bar bg-primary" :style="'width:'+getPorcentajeUtilizado(item.total_solicitud,item.total_solicitado)+'%'">{{getPorcentajeUtilizado(item.total_solicitud,item.total_solicitado)}}%</div>
                                </div>
                            </p>
                        </div>
                    </td>
                    <td v-if="tabOrigen === 'Pendientes' " class="text-center">
                        <button type="button" class="btn btn-sm btn-info" @click="accion({id: item.id,accion: 'viewAprobators'})" title="Ver Aprobadores">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-info" @click="accion({id: item.id,accion: 'viewFiles'})" title="Ver Presupuestos">
                            <i class="fas fa-server"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-success" @click="accion({token_files: item.token_files,id: item.id,accion: 'edit'})" title="Editar Solicitud Orden de Compra">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" @click="accion({token_files: item.token_files,id: item.id,accion: 'delete'})" title="Eliminar Solicitud Orden de Compra">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button v-if="item.countcGestion > 0" type="button" class="btn btn-sm btn-warning" @click="accion({id:item.id, accion:'viewCGestion'})" title="Ver Centro de Gestion">
                            <i class="fas fa-table"></i>
                        </button>
                    </td>
                    <td v-if="tabOrigen === 'En Proceso' " class="text-center">
                        <button type="button" class="btn btn-sm btn-info" @click="accion({id: item.id,accion: 'viewAprobators'})" title="Ver Aprobadores">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button v-if="(item.estado_cgestion == 1 || item.estado_cgestion == 3) && !showLoading" type="button" class="btn btn-sm btn-info" @click="accion({id: item.id,estado_solicitante : item.estado_solicitante,estado_cgestion : item.estado_cgestion,accion: 'reSendMailCGestion'})" title="Enviar Recordatorio">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <span v-if="showLoading" class="loader"></span>

                        <button v-if="item.estado_cgestion == 2 || item.estado_cgestion == 4" type="button" class="btn btn-sm btn-success" @click="accion({soc: item,accion: 'showSolicitarHESMIGO'})" title="Solicitar HES/MIGO">
                            <i class="far fa-paper-plane"></i>
                        </button>
                        <button v-if="item.estado_cgestion == 2 || item.estado_cgestion == 4" type="button" class="btn btn-sm btn-info" @click="accion({id: item.id,accion: 'viewFiles'})" title="Ver Presupuestos">
                            <i class="fas fa-server"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-warning" @click="accion({id: item.id,accion: 'endSOC',tabOrigen: tabOrigen,})"
                            title="Finalizar SOC">
                            <i class="far fa-window-close"></i>
                        </button>
                        <button v-if="item.countcGestion > 0" type="button" class="btn btn-sm btn-warning" @click="accion({id:item.id, accion:'viewCGestion'})"
                            title="Ver Centro de Gestion">
                            <i class="fas fa-table"></i>
                        </button>
                    </td>
                    <td v-if="tabOrigen === 'Rechazadas' " class="text-center">
                        <button type="button" class="btn btn-sm btn-info" @click="accion({id: item.id,accion: 'viewAprobators'})" title="Ver Aprobadores">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-info" @click="accion({id: item.id,accion: 'viewFiles'})" title="Ver Presupuestos">
                            <i class="fas fa-server"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-success" @click="accion({token_files: item.token_files,id: item.id,accion: 'edit'})" title="Editar Solicitud Orden de Compra">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" @click="accion({token_files: item.token_files,id: item.id,accion: 'delete'})" title="Eliminar Solicitud Orden de Compra">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button v-if="item.countcGestion > 0" type="button" class="btn btn-sm btn-warning" @click="accion({id:item.id, accion:'viewCGestion'})"
                            title="Ver Centro de Gestion">
                            <i class="fas fa-table"></i>
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    `,
});
Vue.component('tableResultMisParticipaciones', {
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

        const tabOrigen = computed(() => props.tabOrigen);

        return {
            data,
            tabOrigen,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            this.$emit('accion', accion);
        },
    },
    template: html`
        <table class="table table-bordered table-striped table-hover">
            <thead>
                <tr>
                    <th>SOC Nº</th>
                    <th>Solicitante</th>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Campus</th>
                    <th>Area</th>
                    <th>Proyecto</th>
                    <th>Observación</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="item in data" :key="item.id" :class="item.tipo_soc === 'Contractual' ? 'text-primary':''">
                    <td>{{ item.id }}</td>
                    <td>{{ item.solicitante }}</td>
                    <td>{{ item.created_at }}</td>
                    <td>{{ item.descripcion }}</td>
                    <td>{{ item.desc_campus }}</td>
                    <td>{{ item.desc_area }}</td>
                    <td>{{ item.desc_proyecto }}</td>
                    <td>{{ item.observacion }}</td>
                    <td>
                        <span class="badge" :class="{'badge-warning': item.estado_solicitante == 1, 'badge-success': item.estado_solicitante == 2, 'badge-danger': item.estado_solicitante == 3 }">{{ item.desc_estado }}</a>
                        </span>
                        <div v-if="item.estado_cgestion == 2 || item.estado_cgestion == 4">
                            Monto Disponible: {{ item.total_solicitud - item.total_solicitado | format_number_n_decimal(0) }}
                        </div>
                    </td>
                    <td class="text-center">
                        <div class="d-flex mb-1 justify-content-center">
                            <button v-if="item.aprueba == 1 && item.estado_aprueba == 1" type="button" class="btn btn-sm btn-success mr-1" @click="accion({token_participante: item.token_participante,email_participante: item.email_participante,accion: 'aprobar'})" title="Aprobar">
                                <i class="fas fa-check"></i>&nbsp;Aprobar
                            </button>
                            <button v-if="item.aprueba == 1 && item.estado_aprueba == 1" type="button" class="btn btn-sm btn-danger" @click="accion({token_participante: item.token_participante,email_participante: item.email_participante,accion: 'rechazar'})" title="Rechazar">
                                <i class="fas fa-times"></i>&nbsp;Rechazar
                            </button>
                        </div>
                        <button v-if="(item.estado_cgestion == 2 || item.estado_cgestion == 4) && item.finaliza == 1" type="button" class="btn btn-sm btn-success"
                            @click="accion({soc: item,tabOrigen: tabOrigen,accion: 'showSolicitarHESMIGO'})"
                            title="Solicitar HES/MIGO">
                            <i class="far fa-paper-plane"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-info" @click="accion({id: item.id,accion: 'viewAprobators'})"
                            title="Ver Aprobadores">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-info" @click="accion({id: item.id,accion: 'viewFiles'})"
                            title="Ver Presupuestos">
                            <i class="fas fa-server"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-warning" @click="accion({id: item.id,accion: 'endSOC',tabOrigen:tabOrigen})"
                            title="Finalizar SOC">
                            <i class="far fa-window-close"></i>
                        </button>
                        <button v-if="item.countcGestion > 0" type="button" class="btn btn-sm btn-warning" @click="accion({id:item.id, accion:'viewCGestion'})"
                            title="Ver Centro de Gestion">
                            <i class="fas fa-table"></i>
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    `,
});

Vue.component('cgestion', cgestion);

const appSOCppal = new Vue({
    el: '#ppal',
    delimiters: ['${', '}'],
    store: usePPalStore,
    methods: {
        ...Vuex.mapMutations(['SET_FUNCTIONS_PASARELLA']),
        pasarella: function (param) {
            this.SET_FUNCTIONS_PASARELLA(param);
        },
    },
});

eventDelegator.register('pasarella_principalsolicitante', 'click', function (event) {
    pasarella(appSOCppal, event);
});
