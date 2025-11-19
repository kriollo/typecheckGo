import { fecthCampus } from '@/jscontrollers/composables/fetching.js';
import { versaAlert } from '@/jscontrollers/composables/utils';
import {
    fetchImportDataFile,
    fetchSaveDependecia,
    fetchSaveEdificio,
    fetchSavePiso,
} from '@/jscontrollers/geda/fechGeda.js';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm.js';

import customTable from '@/jscontrollers/components/customTable.js';
import iCheck from '@/jscontrollers/components/iCheck.js';
import modal from '@/jscontrollers/components/modal.js';
import newModal from '@/jscontrollers/components/newModal';
import uploadFileExcel from '@/jscontrollers/components/uploadFileExcel.js';
/* eslint-disable */
const ic = iCheck;
const md = modal;
const ct = customTable;
const ufe = uploadFileExcel;
/* eslint-enable */

Vue.component('ppal', {
    setup() {
        const refreshDataEdificios = Vue.ref(false);
        const refreshDataPisos = Vue.ref(false);
        const refreshDataDependencias = Vue.ref(false);
        const otherFiltersEdificios = Vue.ref('');
        const otherFiltersPisos = Vue.ref('');
        const otherFiltersDependencias = Vue.ref('');
        const campus = Vue.ref([]);
        const campusSelected = Vue.ref('');
        const showModalEdificio = Vue.ref(false);
        const showModalPiso = Vue.ref(false);
        const showModalDependencia = Vue.ref(false);
        const edificioSel = Vue.ref({});
        const pisoSel = Vue.ref({});

        const showModalUploadFile = Vue.ref(false);
        const fromUploadFile = Vue.ref('');

        const getCampus = async () => {
            campus.value = [{ id: 0, descripcion: 'Todos' }];
            const campusData = (await fecthCampus()) as unknown as any[];
            campus.value = [...campus.value, ...campusData];
        };
        getCampus();

        const edificioSelected = Vue.ref({
            cod_campus: '',
            id: '',
            descripcion: '',
        });
        const pisoSelected = Vue.ref({
            id: '',
            descripcion: '',
        });
        const dependenciaSelected = Vue.ref({
            codigo: '',
            descripcion: '',
        });

        Vue.watchEffect(() => {
            if (edificioSel.value.id !== undefined) {
                otherFiltersPisos.value = `id_edificio = ${edificioSel.value.id}`;
            }
            if (pisoSel.value.id !== undefined) {
                otherFiltersDependencias.value = `tu.cod_campus = ${edificioSel.value.cod_campus} and tu.id_edificio = ${pisoSel.value.id_edificio} and tu.id_piso = ${pisoSel.value.id}`;
            }
        });

        return {
            refreshDataEdificios,
            refreshDataPisos,
            otherFiltersEdificios,
            otherFiltersPisos,
            campus,
            campusSelected,
            showModalEdificio,
            edificioSelected,
            edificioSel,
            pisoSel,
            showModalPiso,
            pisoSelected,
            showModalUploadFile,
            fromUploadFile,
            refreshDataDependencias,
            otherFiltersDependencias,
            showModalDependencia,
            dependenciaSelected,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                closeModalUploadFileExcel: () => this.accion({ accion: 'closeModal' }),
                closeModal: () => {
                    this.showModalEdificio = false;
                    this.showModalPiso = false;
                    this.showModalUploadFile = false;
                    this.showModalDependencia = false;
                },
                EditarEdificio: () => this.EditarEdificio(accion.item),
                newEdificio: () => this.newEdificio(),
                refreshDataEdificios: () => (this.refreshDataEdificios = !this.refreshDataEdificios),
                refreshDataPisos: () => (this.refreshDataPisos = !this.refreshDataPisos),
                changeEstado: () => this.changeEstado(accion.item),
                VerPisos: () => this.viewPisos(accion.item),
                editarPiso: () => this.editarPiso(accion.item),
                newPiso: () => this.newPiso(),
                changeEstadoPiso: () => this.changeEstadoPiso(accion.item),
                loadExcel: () => this.importXlsx(accion.data, accion.from),
                VerDependencias: () => this.viewDependencias(accion.item),
                newDependencia: () => this.newDependencia(),
                refreshDataDependencias: () => (this.refreshDataDependencias = !this.refreshDataDependencias),
                EditarDependencia: () => this.EditarDependencia(accion.item),
                changeEstadoDependencia: () => this.changeEstadoDependencia(accion.item),
                default: () => {},
            };

            const selectedAction = actions[accion.accion] || actions.default;
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        otherFiltersEdificioss(campus) {
            this.otherFiltersEdificios = campus.id == '0' ? '' : `cod_campus = ${campus.id}`;
            this.refreshDataEdificios = !this.refreshDataEdificios;

            this.campusSelected = campus.id;
            this.edificioSel = {};
            this.pisoSel = {};
        },
        newEdificio() {
            const newEdificio = JSON.parse(JSON.stringify(this.edificioSelected));
            for (const key in newEdificio) {
                newEdificio[key] = '';
            }
            this.edificioSelected = newEdificio;
            this.showModalEdificio = true;
        },
        EditarEdificio(/** @type {Object} */ data) {
            this.edificioSelected = JSON.parse(JSON.stringify(data));
            this.showModalEdificio = true;
        },
        changeEstado(/** @type {Object} */ data) {
            const edificio = {
                id: data.id,
                estado: !data.estado,
            };

            fetchSaveEdificio('/api/geda/changeEstadoEdificio', edificio).then(response => {
                if (response.success === 1) {
                    versaAlert({
                        title: '¡Éxito!',
                        message: response.message,
                        type: 'success',
                        AutoClose: true,
                        callback: () => {
                            this.refreshDataEdificios = !this.refreshDataEdificios;

                            if (this.edificioSel?.id === edificio.id) {
                                this.edificioSel = {};
                            }
                        },
                    });
                } else {
                    versaAlert({
                        title: '¡Error!',
                        message: response.message,
                        type: 'error',
                        AutoClose: true,
                    });
                }
            });
        },
        viewPisos(/** @type {Object} */ data) {
            this.edificioSel = data;
            this.refreshDataPisos = !this.refreshDataPisos;
        },
        closeTablePisos() {
            this.edificioSel = {};
            this.pisoSel = {};
        },
        newPiso() {
            const newPiso = JSON.parse(JSON.stringify(this.pisoSelected));
            for (const key in newPiso) {
                newPiso[key] = '';
            }

            this.pisoSelected = newPiso;
            this.pisoSelected.id_edificio = this.edificioSel.id;
            this.showModalPiso = true;
        },
        editarPiso(/** @type {Object} */ data) {
            this.pisoSelected = JSON.parse(JSON.stringify(data));
            this.showModalPiso = true;
        },
        changeEstadoPiso(/** @type {Object} */ data) {
            const piso = {
                id: data.id,
                estado: !data.estado,
            };

            fetchSavePiso('/api/geda/changeEstadoPiso', piso).then(response => {
                if (response.success === 1) {
                    versaAlert({
                        title: '¡Éxito!',
                        message: response.message,
                        type: 'success',
                        AutoClose: true,
                        callback: () => {
                            this.refreshDataPisos = !this.refreshDataPisos;
                        },
                    });
                } else {
                    versaAlert({
                        title: '¡Error!',
                        message: response.message,
                        type: 'error',
                        AutoClose: true,
                    });
                }
            });
        },
        async importXlsx(data, from) {
            if (data.length === 0) {
                let url = '';
                let dataToSend = {};

                switch (from) {
                    case 'edificio':
                        dataToSend = {
                            data,
                            primeraLinea: false,
                            campus: this.campusSelected,
                        };
                        url = '/api/geda/importDataEdificios';
                        break;
                    case 'piso':
                        dataToSend = {
                            data,
                            primeraLinea: false,
                            campus: this.campusSelected,
                            edificio: this.edificioSel.id,
                        };
                        url = '/api/geda/importDataPisos';
                        break;
                    case 'dependencia':
                        dataToSend = {
                            data,
                            primeraLinea: false,
                            campus: this.edificioSel.cod_campus,
                            edificio: this.pisoSel.id_edificio,
                            piso: this.pisoSel.id,
                        };
                        url = '/api/geda/importDataDependencias';
                        break;
                }
                const response = await fetchImportDataFile(url, dataToSend);
                if (response.success === 1) {
                    versaAlert({
                        title: '¡Éxito!',
                        message: response.message,
                        type: 'success',
                        AutoClose: true,
                        callback: () => {
                            switch (from) {
                                case 'edificio':
                                    this.refreshDataEdificios = !this.refreshDataEdificios;
                                    break;
                                case 'piso':
                                    this.refreshDataPisos = !this.refreshDataPisos;
                                    break;
                                case 'dependencia':
                                    this.refreshDataDependencias = !this.refreshDataDependencias;
                                    break;
                            }
                            this.accion({ accion: 'closeModal' });
                        },
                    });
                } else {
                    versaAlert({
                        title: '¡Error!',
                        message: response.message,
                        type: 'error',
                        AutoClose: true,
                    });
                }
            } else {
                versaAlert({
                    title: '¡Error!',
                    message: 'No se encontraron registros en el archivo',
                    type: 'error',
                    AutoClose: true,
                });
            }
        },
        showModalUploadFileEdificios(from) {
            this.fromUploadFile = from;
            this.showModalUploadFile = true;
        },
        viewDependencias(/** @type {Object} */ data) {
            this.pisoSel = data;
            this.refreshDataDependencias = !this.refreshDataDependencias;
        },
        closeTableDepenencias() {
            this.pisoSel = {};
        },
        newDependencia() {
            const newDependencia = JSON.parse(JSON.stringify(this.dependenciaSelected));
            for (const key in newDependencia) {
                newDependencia[key] = '';
            }
            this.dependenciaSelected = newDependencia;
            this.showModalDependencia = true;
        },
        EditarDependencia(/** @type {Object} */ data) {
            this.dependenciaSelected = JSON.parse(JSON.stringify(data));
            this.showModalDependencia = true;
        },
        changeEstadoDependencia(/** @type {Object} */ data) {
            const dependencia = {
                id: data.id,
                estado: !data.estado,
            };

            fetchSaveDependecia('/api/geda/changeEstadoDependencia', dependencia).then(response => {
                if (response.success === 1) {
                    versaAlert({
                        title: '¡Éxito!',
                        message: response.message,
                        type: 'success',
                        AutoClose: true,
                        callback: () => {
                            this.refreshDataDependencias = !this.refreshDataDependencias;
                        },
                    });
                } else {
                    versaAlert({
                        title: '¡Error!',
                        message: response.message,
                        type: 'error',
                        AutoClose: true,
                    });
                }
            });
        },
    },
    template: html`
        <div class="col col-md-12">
            <div class="card card-info card-outline card-outline-tabs">
                <div class="card-header p-0 border-bottom-0"></div>
                <div class="card-body">
                    <uploadFileExcel
                        :from="fromUploadFile"
                        :showModal="showModalUploadFile"
                        @accion="accion"
                        key="uploadFile"
                        v-if="campusSelected !== '' && campusSelected !== 0" />

                    <div class="row p-0 m-0">
                        <div
                            class="col"
                            :class="edificioSel.id === undefined ? 'col-md-12':(pisoSel.id === undefined ? 'col-md-6':'hidden')">
                            <div class="flex pb-2">
                                <ul class="flex flex-row md:justify-center gap-2 overflow-x-auto m-0 mb-1">
                                    <li
                                        class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center cursor-pointer"
                                        :class="campusSelected == item.id ? 'black:focus:ring-orange-300 hover:bg-orange-700 bg-orange-500 dark:bg-orange-500  dark:hover:bg-orange-600 dark:focus:ring-orange-700':'focus:ring-blue-300 hover:bg-indigo-700 bg-indigo-500 dark:bg-indigo-500  dark:hover:bg-indigo-600 dark:focus:ring-indigo-700'"
                                        @click="otherFiltersEdificioss(item)"
                                        v-for="item in campus">
                                        {{ item.descripcion }}
                                    </li>
                                </ul>
                            </div>
                            <customTable
                                id="edificios"
                                :externalFilters="otherFiltersEdificios"
                                :refresh="refreshDataEdificios"
                                @accion="accion"
                                key="edificios"
                                titleTable="Listado de Edificios"
                                url="/api/getEdificiosPaginate">
                                <template v-slot:headerButtons>
                                    <button
                                        class="btn btn-primary"
                                        @click="showModalUploadFileEdificios('edificio')"
                                        v-if="campusSelected !== '' && campusSelected !== 0">
                                        <i class="fas fa-arrow-alt-circle-up"></i>
                                        Subir Archivo
                                    </button>
                                    <button
                                        type="button"
                                        class="btn btn-success"
                                        @click="accion({ accion: 'newEdificio' })">
                                        <i class="fas fa-plus"></i>
                                        Agregar
                                    </button>
                                </template>
                            </customTable>
                            <formEdificio
                                :campus="campus"
                                :campusSelected="Number(campusSelected)"
                                :edificio="edificioSelected"
                                :showModal="showModalEdificio"
                                @accion="accion" />
                        </div>
                        <div
                            class="col"
                            :class="pisoSel.id === undefined ? 'col-md-6':'col-md-6'"
                            v-if="edificioSel.id !== undefined">
                            <customTable
                                id="pisos"
                                :externalFilters="otherFiltersPisos"
                                :refresh="refreshDataPisos"
                                :titleTable="'Listado de Pisos <strong> - Edificio: ' + edificioSel.descripcion "
                                @accion="accion"
                                key="pisos"
                                url="/api/geda/getPisosPaginate">
                                <template v-slot:headerButtons>
                                    <button
                                        class="btn btn-primary"
                                        @click="showModalUploadFileEdificios('piso')"
                                        v-if="campusSelected !== '' && campusSelected !== 0">
                                        <i class="fas fa-arrow-alt-circle-up"></i>
                                        Subir Archivo
                                    </button>
                                    <button
                                        type="button"
                                        class="btn btn-success"
                                        @click="accion({ accion: 'newPiso' })">
                                        <i class="fas fa-plus"></i>
                                        Agregar
                                    </button>
                                    <button class="btn btn-secondary" @click="closeTablePisos">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </template>
                            </customTable>
                            <formPiso
                                :campus="Number(campusSelected)"
                                :piso="pisoSelected"
                                :showModal="showModalPiso"
                                @accion="accion" />
                        </div>
                        <div class="col col-md-6" v-if="pisoSel.id !== undefined">
                            <customTable
                                id="dependencias"
                                :externalFilters="otherFiltersDependencias"
                                :refresh="refreshDataDependencias"
                                :titleTable="'Listado de Dependencias: <strong> - Piso: ' + pisoSel?.descripcion "
                                @accion="accion"
                                key="dependencias"
                                url="/api/geda/getDependenciasPaginate">
                                <template v-slot:headerButtons>
                                    <button
                                        class="btn btn-primary"
                                        @click="showModalUploadFileEdificios('dependencia')"
                                        v-if="campusSelected !== '' && campusSelected !== 0">
                                        <i class="fas fa-arrow-alt-circle-up"></i>
                                        Subir Archivo
                                    </button>
                                    <button
                                        type="button"
                                        class="btn btn-success"
                                        @click="accion({ accion: 'newDependencia' })">
                                        <i class="fas fa-plus"></i>
                                        Agregar
                                    </button>
                                    <button class="btn btn-secondary" @click="closeTableDepenencias">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </template>
                            </customTable>
                            <formDependencia
                                :dependencia="dependenciaSelected"
                                :edificio="edificioSel"
                                :piso="pisoSel"
                                :showModal="showModalDependencia"
                                @accion="accion" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});

Vue.component('formEdificio', {
    components: { newModal },
    emits: ['accion'],
    props: {
        edificio: {
            type: Object,
        },
        campus: {
            type: Array,
            default: () => [],
        },
        campusSelected: {
            type: Number,
            default: 0,
            required: true,
        },
        showModal: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const campus = Vue.computed(() => props.campus);
        const edificioSel = Vue.computed(() => props.edificio);
        const campusSelected = Vue.computed(() => props.campusSelected);
        const showModal = Vue.computed(() => props.showModal);

        const formEdificio = Vue.ref({});
        const campusSelect = Vue.ref([]);

        Vue.watch(campus, val => {
            campusSelect.value = val.filter(item => item.id !== 0);
        });

        Vue.watchEffect(() => {
            formEdificio.value = edificioSel.value;
            if (formEdificio.value?.estado !== undefined) {
                formEdificio.value.estado = formEdificio.value.estado == 1;
            }
            if (formEdificio.value.cod_campus !== '' && formEdificio.value.cod_campus !== 0) {
                return;
            }
            if (campusSelected.value !== '' && campusSelected.value !== 0) {
                formEdificio.value.cod_campus = campusSelected.value;
            } else {
                formEdificio.value.cod_campus = '';
            }
        });

        return {
            campusSelect,
            showModal,
            formEdificio,
        };
    },
    methods: {
        accion(accion) {
            const actions = {
                closeModal: () => this.$emit('accion', { accion: 'closeModal' }),
                default: () => {},
            };

            const selectedAction = actions[accion.accion] || actions.default;
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        saveEdificio() {
            const edificio = {
                cod_campus: this.formEdificio.cod_campus,
                id: this.formEdificio.id,
                descripcion: this.formEdificio.descripcion,
                estado: this.formEdificio.estado ? 1 : 0,
            };

            fetchSaveEdificio('/api/geda/saveEdificio', edificio).then(response => {
                if (response.success === 1) {
                    this.$emit('accion', { accion: 'closeModal' });
                    versaAlert({
                        title: '¡Éxito!',
                        message: response.message,
                        type: 'success',
                        AutoClose: true,
                        callback: () => {
                            this.$emit('accion', {
                                accion: 'refreshDataEdificios',
                            });
                        },
                    });
                } else {
                    versaAlert({
                        title: '¡Error!',
                        message: response.message,
                        type: 'error',
                        AutoClose: true,
                    });
                }
            });
        },
    },
    template: html`
        <newModal
            :showModal="showModal"
            @accion="accion"
            idModal="modalEdificio"
            key="modalEdificio"
            sizeModal="modal-xs">
            <template v-slot:title>Edificio</template>
            <template v-slot:body>
                <form>
                    <div class="form-group">
                        <label for="cod_campus">Campus</label>
                        <select
                            id="cod_campus"
                            class="form-control"
                            :disabled="!(formEdificio.cod_campus === '')"
                            autofocus
                            required
                            v-model="formEdificio.cod_campus">
                            <option :selected="item.id == campusSelected" :value="item.id" v-for="item in campusSelect">
                                {{ item.descripcion }}
                            </option>
                        </select>
                    </div>
                    <div class="form-group" v-if="formEdificio.id !=''">
                        <label for="cod_edificio">Código</label>
                        <input
                            id="cod_edificio"
                            type="text"
                            class="form-control"
                            disabled
                            placeholder="Código del edificio"
                            required
                            v-model="formEdificio.id" />
                    </div>
                    <div class="form-group">
                        <label for="descripcion">Descripción</label>
                        <input
                            id="descripcion"
                            type="text"
                            class="form-control"
                            placeholder="Descripción del edificio"
                            required
                            v-model="formEdificio.descripcion" />
                    </div>
                    <div class="form-group" v-if="formEdificio.id !=''">
                        <iCheck
                            :id="'checkEstadoEdificio'+formEdificio.id"
                            label="Activado"
                            v-model="formEdificio.estado" />
                    </div>
                </form>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-secondary" @click="accion({ accion: 'closeModal' })">
                    Cerrar
                </button>
                <button type="button" class="btn btn-success" @click="saveEdificio">Guardar</button>
            </template>
        </newModal>
    `,
});

Vue.component('formPiso', {
    components: { newModal },
    emits: ['accion'],
    props: {
        piso: {
            type: Object,
        },
        showModal: {
            type: Boolean,
            default: false,
        },
        campus: {
            type: Number,
            required: true,
        },
    },
    setup(props) {
        const pisoSel = Vue.computed(() => props.piso);
        const showModal = Vue.computed(() => props.showModal);
        const campusSel = Vue.computed(() => props.campus);

        const formPiso = Vue.ref({});

        Vue.watchEffect(() => {
            formPiso.value = pisoSel.value;
            if (formPiso.value?.estado !== undefined) {
                formPiso.value.estado = formPiso.value.estado == 1;
            }
        });

        return {
            formPiso,
            showModal,
            campusSel,
        };
    },
    methods: {
        accion(accion) {
            const actions = {
                closeModal: () => this.$emit('accion', { accion: 'closeModal' }),
                default: () => {},
            };

            const selectedAction = actions[accion.accion] || actions.default;
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        savePiso() {
            const piso = {
                cod_campus: this.campusSel,
                id_edificio: this.formPiso.id_edificio,
                id: this.formPiso.id,
                descripcion: this.formPiso.descripcion,
                estado: this.formPiso.estado ? 1 : 0,
            };

            fetchSavePiso('/api/geda/savePiso', piso).then(response => {
                if (response.success === 1) {
                    this.$emit('accion', { accion: 'closeModal' });
                    versaAlert({
                        title: '¡Éxito!',
                        message: response.message,
                        type: 'success',
                        AutoClose: true,
                        callback: () => {
                            this.$emit('accion', {
                                accion: 'refreshDataPisos',
                            });
                        },
                    });
                } else {
                    versaAlert({
                        title: '¡Error!',
                        message: response.message,
                        type: 'error',
                        AutoClose: true,
                    });
                }
            });
        },
    },
    template: html`
        <newModal :showModal="showModal" @accion="accion" idModal="modalPiso" key="modalPiso" sizeModal="modal-md">
            <template v-slot:title>Piso</template>
            <template v-slot:body>
                <form>
                    <input type="hidden" v-model="formPiso.id_edificio" />
                    <div class="form-group" v-if="formPiso.id !==''">
                        <label for="cod_piso">Código</label>
                        <input
                            id="cod_piso"
                            type="text"
                            class="form-control"
                            disabled
                            placeholder="Código del piso"
                            required
                            v-model="piso.id" />
                    </div>
                    <div class="form-group">
                        <label for="descripcion">Descripción</label>
                        <input
                            id="descripcion"
                            type="text"
                            class="form-control"
                            placeholder="Descripción del piso"
                            required
                            v-model="piso.descripcion" />
                    </div>
                    <div class="form-group" v-if="formPiso.id !==''">
                        <iCheck
                            :checked="formPiso.estado"
                            :id="'checkEstadoPiso'+formPiso.id"
                            label="Activado"
                            v-model="formPiso.estado" />
                    </div>
                </form>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-secondary" @click="accion({ accion: 'closeModal' })">
                    Cerrar
                </button>
                <button type="button" class="btn btn-success" @click="savePiso">Guardar</button>
            </template>
        </newModal>
    `,
});

Vue.component('formDependencia', {
    components: { newModal },
    emits: ['accion'],
    props: {
        dependencia: {
            type: Object,
        },
        showModal: {
            type: Boolean,
            default: false,
        },
        piso: {
            type: Object,
            required: true,
        },
        edificio: {
            type: Object,
            required: true,
        },
    },
    setup(props) {
        const dependenciaSel = Vue.computed(() => props.dependencia);
        const showModal = Vue.computed(() => props.showModal);
        const pisoSel = Vue.computed(() => props.piso);
        const edificioSel = Vue.computed(() => props.edificio);

        const formDependencia = Vue.ref({});

        Vue.watchEffect(() => {
            formDependencia.value = dependenciaSel.value;
            if (formDependencia.value?.estado !== undefined) {
                formDependencia.value.estado = formDependencia.value.estado == 1;
            }
        });

        return {
            formDependencia,
            showModal,
            pisoSel,
            edificioSel,
            dependenciaSel,
        };
    },
    methods: {
        accion(accion) {
            const actions = {
                closeModal: () => this.$emit('accion', { accion: 'closeModal' }),
                default: () => {},
            };

            const selectedAction = actions[accion.accion] || actions.default;
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        saveDependencia() {
            const params = {
                cod_campus: this.edificioSel.cod_campus,
                id_edificio: this.pisoSel.id_edificio,
                id_piso: this.pisoSel.id,
                codigo: this.formDependencia.codigo,
                descripcion: this.formDependencia.descripcion,
                estado: this.formDependencia.estado ? 1 : 0,
                id: this.formDependencia.id ?? '',
                oldCodigo: this.dependenciaSel.codigo ?? '',
            };

            fetchSaveDependecia('/api/geda/saveDependencia', params).then(response => {
                if (response.success === 1) {
                    this.$emit('accion', { accion: 'closeModal' });
                    versaAlert({
                        title: '¡Éxito!',
                        message: response.message,
                        type: 'success',
                        AutoClose: true,
                        callback: () => {
                            this.$emit('accion', {
                                accion: 'refreshDataDependencias',
                            });
                        },
                    });
                } else {
                    versaAlert({
                        title: '¡Error!',
                        message: response.message,
                        type: 'error',
                        AutoClose: true,
                    });
                }
            });
        },
    },
    template: html`
        <newModal
            :showModal="showModal"
            @accion="accion"
            idModal="modalDependencia"
            key="modalDependencia"
            sizeModal="modal-md">
            <template v-slot:title>Dependencia</template>
            <template v-slot:body>
                <form>
                    <input type="hidden" v-model="formDependencia.id_piso" />
                    <div class="form-group">
                        <label for="cod_dependencia">Código</label>
                        <input
                            id="cod_dependencia"
                            type="text"
                            class="form-control"
                            placeholder="Código de la dependencia"
                            required
                            v-model="formDependencia.codigo" />
                    </div>
                    <div class="form-group">
                        <label for="descripcion">Descripción</label>
                        <input
                            id="descripcion"
                            type="text"
                            class="form-control"
                            placeholder="Descripción de la dependencia"
                            required
                            v-model="formDependencia.descripcion" />
                    </div>
                    <div class="form-group" v-if="formDependencia?.id !=='' && formDependencia?.id !== undefined ">
                        <iCheck
                            :checked="formDependencia.estado"
                            :id="'checkEstadoDependencia'+formDependencia.id"
                            label="Activado"
                            v-model="formDependencia.estado" />
                    </div>
                </form>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-secondary" @click="accion({ accion: 'closeModal' })">
                    Cerrar
                </button>
                <button type="button" class="btn btn-success" @click="saveDependencia">Guardar</button>
            </template>
        </newModal>
    `,
});

Vue.component('crumb', {
    template: html`
        <div class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1 class="m-0 text-dark">
                            <i class="far fa-building"></i>
                            Mantenedor de Maestro Edificios
                        </h1>
                    </div>
                    <div class="col-sm-6">
                        <ol class="breadcrumb float-sm-right">
                            <li class="breadcrumb-item">
                                <a href="/portal">Home</a>
                            </li>
                            <li class="breadcrumb-item">
                                <a href="/geda/gestiona">Gestión de Activos</a>
                            </li>

                            <li class="breadcrumb-item active">Maestro Edificios</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    `,
});

const _mstrEdificios = new Vue({
    el: '#ppal',
    delimiters: ['${', '}'],
});
