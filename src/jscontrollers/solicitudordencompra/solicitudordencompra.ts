import {
    fecthCampus,
    fetchCGestion,
    fetchCondicion1,
    fetchCondicion2,
    fetchGetContactosProveedor,
    fetchgetProveedores,
    fetchProyectos,
} from '@/jscontrollers/composables/fetching.js';
import { checkEmailFormat, versaAlert, versaFetch } from '@/jscontrollers/composables/utils';
import { TOPE_RETENCION } from '@/jscontrollers/solicitudordencompra/composableSOC.js';
import { useStoreSOC } from '@/jscontrollers/solicitudordencompra/useStoreSOC.js';
import { usePPalStore } from '@/jscontrollers/usePPalStore.js';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm.js';

import iCheck from '@/jscontrollers/components/iCheck';
import inputDataList from '@/jscontrollers/components/inputDataList';
import loader from '@/jscontrollers/components/loading';
import modal from '@/jscontrollers/components/modal';
import newModal from '@/jscontrollers/components/newModal';

import dropZone from '@/jscontrollers/components/dropZone';
import { AccionData, actionsType } from 'versaTypes';

/* eslint-disable */
const dropz = dropZone;
const idl = inputDataList;
const m = modal;
const ic = iCheck;
const ld = loader;
/* eslint-enable */

const { ref, computed, reactive, watch, provide, inject, onMounted } = Vue;

Vue.component('ppal', {
    setup() {
        const array_files = computed(() => useStoreSOC.state.files);
        const fileSelected = ref({});
        const ShowDataPresupuesto = ref(false);

        const proveedores = ref([]);
        provide('proveedores', proveedores);

        const formLoadEdit = ref({});

        const progresoCompletitud = computed(() => useStoreSOC.state.progesoCompletitud);

        const url = window.location.href;
        const urlParams = new URL(url);
        const id = urlParams.searchParams.get('id');
        if (id !== null) {
            useStoreSOC.dispatch('getSOCByIdFullStore', id).then((/** @type {any} */ response) => {
                formLoadEdit.value = response.formulario;

                useStoreSOC.commit('setFormulario', response.formulario);

                useStoreSOC.commit('setProgresoCompletitud', {
                    key: 'formulario',
                    status: true,
                });

                if (typeof response.participantes !== 'boolean') {
                    for (const item of response.participantes) {
                        item.aprueba = item.aprueba == '1';
                        item.finaliza = item.finaliza == '1';
                        useStoreSOC.commit('setParticipantes', item);
                    }
                }

                for (const item of response.archivos) {
                    item.seleccionado = item.seleccionado == '1';
                    item.send_to_contact = item.send_to_contact == '1';
                    item.proveedor_verificado = item.val_asociado == '1';
                    useStoreSOC.commit('setFiles', [
                        {
                            name: item.archivo,
                            file: {},
                            data: item,
                            selected: false,
                            type: item.type,
                        },
                    ]);
                }
                useStoreSOC.commit('setProgresoCompletitud', {
                    key: 'archivos',
                    status: true,
                });

                useStoreSOC.commit('setIdFormulario', id);
                useStoreSOC.commit('setCGestion', response.cgestion);
            });
        } else {
            formLoadEdit.value = { ...useStoreSOC.state.formulario };
        }

        return {
            array_files,
            fileSelected,
            ShowDataPresupuesto,
            progresoCompletitud,
            formLoadEdit,
        };
    },
    methods: {
        /**
         * @param {File} file
         */
        selectedFile(file) {
            this.fileSelected = file;
            this.ShowDataPresupuesto = true;
            useStoreSOC.commit('setFileSelected', file);
        },
        /**
         * @param {{ accion: any; key: string | number; file: String; data: Array; value: boolean }} accion
         */
        accion(accion) {
            switch (accion.accion) {
                case 'nextPage':
                case 'prevPage':
                    this.$refs[accion.key].querySelector('a').click();
                    break;
                case 'ShowDataPresupuesto':
                    this.ShowDataPresupuesto = accion.value;
                    break;
                case 'setFileSelected':
                    this.fileSelected = accion.value;
                    break;
            }
        },
    },
    template: html`
        <div class="card card-info card-outline card-outline-tabs">
            <div class="card-header p-0 border-bottom-0">
                <ul id="custom-tabs-four-tab" class="nav nav-tabs" role="tablist">
                    <li class="nav-item" ref="formularioLi">
                        <a
                            id="formulario"
                            class="nav-link active"
                            aria-controls="formulario-tab"
                            aria-selected="true"
                            data-toggle="pill"
                            href="#content_formulario"
                            role="tab">
                            <i
                                :class="progresoCompletitud.formulario ? 'text-success bi bi-check-circle':'text-warning bi bi-dash-circle'"></i>
                            Ingrese los datos solicitados
                        </a>
                    </li>
                    <li class="nav-item" ref="participantesLi">
                        <a
                            id="participantes"
                            class="nav-link"
                            :class="!progresoCompletitud.formulario ? 'disabled':'' "
                            aria-controls="participantes-tab"
                            aria-selected="false"
                            data-toggle="pill"
                            href="#content_participantes"
                            role="tab">
                            <i
                                :class="progresoCompletitud.participantes ? 'text-success bi bi-check-circle':'text-warning bi bi-dash-circle'"></i>
                            Participantes
                        </a>
                    </li>
                    <li class="nav-item" ref="archivosLi">
                        <a
                            id="archivos"
                            class="nav-link"
                            :class="!progresoCompletitud.formulario ? 'disabled':'' "
                            aria-controls="archivos-tab"
                            aria-selected="false"
                            data-toggle="pill"
                            href="#content_archivos"
                            role="tab">
                            <i
                                :class="progresoCompletitud.archivos ? 'text-success bi bi-check-circle':'text-warning bi bi-dash-circle'"></i>
                            Cargar Archivos...
                        </a>
                    </li>
                </ul>
            </div>
            <div class="card-body">
                <div id="custom-tabs-four-tabContent" class="tab-content">
                    <div
                        id="content_formulario"
                        class="tab-pane fade active show"
                        aria-labelledby="formulario-tab"
                        role="tabpanel">
                        <BarraNav @accion="accion" nextPage="participantesLi" prevPage="none" ubicacion="formulario" />
                        <formulario :formLoadEdit="formLoadEdit" />
                    </div>
                    <div
                        id="content_participantes"
                        class="tab-pane fade"
                        aria-labelledby="participantes-tab"
                        role="tabpanel">
                        <BarraNav
                            @accion="accion"
                            nextPage="archivosLi"
                            prevPage="formularioLi"
                            ubicacion="participantes" />
                        <participantes />
                    </div>
                    <div id="content_archivos" class="tab-pane fade" aria-labelledby="archivos-tab" role="tabpanel">
                        <BarraNav @accion="accion" nextPage="none" prevPage="participantesLi" ubicacion="archivos" />
                        <div class="row">
                            <files @accion="accion" @selectedFile="selectedFile" />
                            <dataPresupuesto :file="fileSelected" @accion="accion" v-if="ShowDataPresupuesto" />
                            <comparativo v-if="ShowDataPresupuesto === false" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});

Vue.component('BarraNav', {
    props: {
        ubicacion: {
            type: String,
            required: true,
        },
        nextPage: {
            type: String,
            default: 'none',
        },
        prevPage: {
            type: String,
            default: 'none',
        },
    },
    setup(props) {
        const ubicacion = computed(() => props.ubicacion);
        const progresoCompletitud = computed(() => useStoreSOC.state.progesoCompletitud);

        const disLeft = ref(true);
        const disRight = ref(true);

        switch (ubicacion.value) {
            case 'formulario':
                disLeft.value = true;
                disRight.value = !progresoCompletitud.value.formulario;
                break;
            case 'participantes':
                disLeft.value = false;
                disRight.value = !progresoCompletitud.value.participantes;
                break;
            case 'archivos':
                disLeft.value = false;
                disRight.value = !progresoCompletitud.value.archivos;
                break;
            case 'comparativos':
                disLeft.value = false;
                disRight.value = true;
        }

        return {
            disLeft,
            disRight,
            ubicacion,
            progresoCompletitud,
        };
    },
    watch: {
        'progresoCompletitud.formulario': function (val) {
            if (this.ubicacion !== 'formulario') return;
            this.disLeft = true;
            this.disRight = !val;
        },
        'progresoCompletitud.participantes': function (val) {
            if (this.ubicacion !== 'participantes') return;

            this.disLeft = false;
            this.disRight = !val;
        },
        'progresoCompletitud.archivos': function () {
            if (this.ubicacion !== 'archivos') return;
            this.disLeft = false;
            this.disRight = true;
        },
    },
    methods: {
        cmdNextPage() {
            this.$emit('accion', {
                accion: 'nextPage',
                key: this.nextPage,
            });
        },
        cmdPrevPage() {
            this.$emit('accion', {
                accion: 'prevPage',
                key: this.prevPage,
            });
        },
    },
    template: html`
        <div class="row mb-2">
            <button class="btn bg-success mr-1" :disabled="disLeft" @click="cmdPrevPage">
                <i class="bi bi-arrow-left fa-1x"></i>
            </button>
            <button class="btn bg-success" :disabled="disRight" @click="cmdNextPage">
                <i class="bi bi-arrow-right fa-1x"></i>
            </button>
        </div>
    `,
});

Vue.component('formulario', {
    props: {
        formLoadEdit: {
            type: Object,
            required: true,
        },
    },
    setup(props) {
        const array_campus = ref([]);
        const array_area = ref([]);
        const array_proyectos = ref([]);
        const array_codigoequipo = ref([]);
        const array_tiposolicitud = ref([]);
        const array_caracteristica = ref([]);
        const array_areaencargada = ref([]);
        const array_condicion1 = ref([]);
        const array_condicion2 = ref([]);
        const array_tipo_oc = [{ value: 'resultado' }, { value: 'Inversión' }];
        const array_tipo_soc = [{ value: 'OC General' }, { value: 'Contractual' }];

        const proveedores = inject('proveedores');

        const formulario = reactive({ ...useStoreSOC.state.formulario });

        const area = ref(null);
        const showBlockMantenimiento = ref(false);

        const loadDatas = async () => {
            const response = await Promise.all([
                fecthCampus(),
                fetchProyectos({ estado: '1', origen: 'SOC' }),
                fetchgetProveedores({ estado: '1' }),
                fetchCondicion1(),
                fetchCondicion2(),
            ]);

            const [campus, proyectos, fproveedores, condicion_1, condicion_2] = response;

            array_campus.value = campus;
            array_proyectos.value = proyectos;
            proveedores.value = fproveedores;
            array_condicion1.value = condicion_1;
            array_condicion2.value = condicion_2;
        };
        loadDatas();

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

        const loadCodigosEquipos = async () => {
            const data = await versaFetch({
                url: '/api/getCodigosEquipos',
                method: 'GET',
            });
            array_codigoequipo.value = data;
        };
        const loadTiposSolicitud = async () => {
            const data = await versaFetch({
                url: '/api/getTipoSolicitudOrdenCompra',
                method: 'GET',
            });
            array_tiposolicitud.value = data;
        };
        const loadCaracteristica = async () => {
            const data = await versaFetch({
                url: '/api/getCaracteristicasSolicitudOrdenCompra',
                method: 'GET',
            });
            array_caracteristica.value = data;
        };
        const loadAreaEncargada = async () => {
            const data = await versaFetch({
                url: '/api/getMantencionAreaEncargada',
                method: 'GET',
            });
            array_areaencargada.value = data;
        };

        let disableWatch = false;

        const formLoadEdit = computed(() => props.formLoadEdit);
        watch(formLoadEdit, (/** @type {Object} */ val) => {
            disableWatch = true;
            for (const key in val) {
                formulario[key] = val[key];
                if (key === 'desc_campus') {
                    loadArea(formulario.cod_campus);
                    if (area.value != null) area.value.disabled = false;
                }
                if (key === 'desc_area') {
                    if (val[key].toLowerCase().includes('mantencion')) {
                        showBlockMantenimiento.value = true;
                    }
                }
            }
            disableWatch = false;
        });

        watch(showBlockMantenimiento, (/** @type {Boolean} */ val) => {
            if (val) {
                Promise.all([
                    loadCodigosEquipos(),
                    loadTiposSolicitud(),
                    loadCaracteristica(),
                    loadAreaEncargada(),
                ]).then(() => {});
            } else {
                formulario.mantencion_cod_tiposolicitud = '';
                formulario.mantencion_cod_caracteristica = '';
                formulario.mantencion_cod_areaencargada = '';
                formulario.mantencion_cod_equipo = '';
            }
        });

        watch(
            () => formulario,
            () => {
                if (disableWatch) return;
                const keys = Object.keys(formulario);
                let progreso = 0;
                for (const key of keys) {
                    if (key === 'cod_proyecto' || key === 'id' || key === 'desc_proyecto') {
                        progreso++;
                        continue;
                    }
                    if (
                        !showBlockMantenimiento.value &&
                        (key === 'mantencion_ot' ||
                            key === 'mantencion_cod_equipo' ||
                            key === 'mantencion_cod_tiposolicitud' ||
                            key === 'mantencion_cod_caracteristica' ||
                            key === 'mantencion_cod_areaencargada' ||
                            key === 'desc_equipo' ||
                            key === 'desc_areaencargada')
                    ) {
                        progreso++;
                        continue;
                    }
                    if ((key === 'cod_condicion1' || key === 'cod_condicion2') && formulario[key] == 0) {
                        continue;
                    } else if (formulario[key] !== '') {
                        progreso++;
                    }
                    if (key === 'orden_compra') {
                        progreso++;
                    }
                }

                useStoreSOC.commit('setProgresoCompletitud', {
                    key: 'formulario',
                    status: progreso === keys.length,
                });
                useStoreSOC.commit('setFormulario', formulario);
            },
            {
                deep: true,
            }
        );

        const progresoCompletitud = computed(() => useStoreSOC.state.progesoCompletitud);

        return {
            formulario,
            array_campus,
            array_area,
            array_proyectos,
            array_codigoequipo,
            array_areaencargada,
            loadArea,
            showBlockMantenimiento,
            array_tiposolicitud,
            array_caracteristica,
            progresoCompletitud,
            area,
            array_tipo_oc,
            array_condicion1,
            array_condicion2,
            array_tipo_soc,
        };
    },
    methods: {
        getCodList(/** @type {String} */ lista) {
            switch (lista) {
                case 'array_campus': {
                    this.formulario.cod_campus = '';
                    this.formulario.cod_area = '';
                    this.$refs.area.disabled = true;
                    const campus = this.$refs.campus.value.trim().toLowerCase();
                    const index = this.array_campus.findIndex(item => item.descripcion.trim().toLowerCase() === campus);
                    if (index >= 0) {
                        this.formulario.cod_campus = this.array_campus[index].id;
                        this.$refs.area.disabled = false;
                        this.$refs.area.focus();
                        this.loadArea(this.formulario.cod_campus);
                    }
                    break;
                }
                case 'array_area': {
                    this.formulario.cod_area = '';
                    this.showBlockMantenimiento = false;
                    const area = this.$refs.area.value.trim().toLowerCase();
                    const index_area = this.array_area.findIndex(
                        item => item.descripcion.trim().toLowerCase() === area
                    );
                    if (index_area >= 0) {
                        this.formulario.cod_area = this.array_area[index_area].codigo;
                        this.$refs.proyectos.disabled = false;
                        this.$refs.proyectos.focus();

                        if (area.toLowerCase().includes('mantencion')) {
                            this.showBlockMantenimiento = true;
                        }
                    }
                    break;
                }
                case 'array_proyectos': {
                    this.formulario.cod_proyecto = '';
                    const proyecto = this.$refs.proyectos.value.trim().toLowerCase();
                    const index_proyecto = this.array_proyectos.findIndex(
                        item => item.descripcion.trim().toLowerCase() === proyecto
                    );
                    if (index_proyecto >= 0) {
                        this.formulario.cod_proyecto = this.array_proyectos[index_proyecto].codigoproyecto;
                        this.$refs.observacion.focus();
                    }
                    break;
                }
                case 'array_codigoequipo': {
                    this.formulario.mantencion_cod_equipo = '';
                    const codigoequipo = this.$refs.codigoequipo.value.trim().toLowerCase();
                    const index_codigoequipo = this.array_codigoequipo.findIndex(
                        item => item.descripcion.trim().toLowerCase() === codigoequipo
                    );
                    if (index_codigoequipo >= 0) {
                        this.formulario.mantencion_cod_equipo = this.array_codigoequipo[index_codigoequipo].codigo;
                        this.$refs.tiposolicitud.focus();
                    }
                    break;
                }
                case 'array_areaencargada': {
                    this.formulario.mantencion_cod_areaencargada = '';
                    const areaencargada = this.$refs.areaencargada.value.trim().toLowerCase();
                    const index_areaencargada = this.array_areaencargada.findIndex(
                        item => item.descripcion.trim().toLowerCase() === areaencargada
                    );
                    if (index_areaencargada >= 0) {
                        this.formulario.mantencion_cod_areaencargada = this.array_areaencargada[index_areaencargada].id;
                    }
                    break;
                }
            }
        },
    },
    template: html`
        <div class="container-fluid">
            <div class="card">
                <div class="card-body">
                    <div class="col-md-12">
                        <div class="row">
                            <div class="form-group col-md-4">
                                <!-- Tipo de Solicitud -->
                                <label for="tiposolicitud">Tipo de Solicitud</label>
                                <select id="tiposoc" class="form-control" v-model="formulario.tipo_soc">
                                    <option :value="item.value" v-for="item in array_tipo_soc">
                                        {{ item.value | upper }}
                                    </option>
                                </select>
                            </div>
                        </div>
                        <div class="row">
                            <div class="form-group col-md-4">
                                <!-- Descripción -->
                                <label for="descripcionsolicitud">Descripción solicitud</label>
                                <input
                                    id="descripcionsolicitud"
                                    type="text"
                                    class="form-control"
                                    v-model="formulario.descripcion" />
                            </div>
                            <div class="form-group col-4">
                                <!-- Campus -->
                                <label for="campus">Campus</label>
                                <input id="campus" type="text" disabled size="10" v-model="formulario.cod_campus" />
                                <input
                                    id="list_campus"
                                    class="form-control"
                                    @change="getCodList('array_campus')"
                                    autocomplete="off"
                                    list="array_campus"
                                    ref="campus"
                                    v-model="formulario.desc_campus" />
                                <datalist id="array_campus">
                                    <option :value="item.descripcion" :value2="item.id" v-for="item in array_campus" />
                                </datalist>
                            </div>
                            <div class="form-group col-4">
                                <!-- Area -->
                                <label for="area">Area</label>
                                <input id="area" type="text" disabled size="10" v-model="formulario.cod_area" />
                                <input
                                    id="list_area"
                                    class="form-control"
                                    @change="getCodList('array_area')"
                                    autocomplete="off"
                                    disabled
                                    list="array_area"
                                    ref="area"
                                    v-model="formulario.desc_area" />
                                <datalist id="array_area">
                                    <option
                                        :value="item.descripcion"
                                        :value2="item.codigo"
                                        v-for="item in array_area"></option>
                                </datalist>
                            </div>
                            <div class="form-group col-4">
                                <!-- Proyecto -->
                                <label for="proyecto">Proyecto</label>
                                <input id="proyecto" type="text" disabled size="10" v-model="formulario.cod_proyecto" />
                                <input
                                    id="list_proyectos"
                                    class="form-control"
                                    @change="getCodList('array_proyectos')"
                                    autocomplete="off"
                                    list="array_proyectos"
                                    ref="proyectos"
                                    v-model="formulario.desc_proyecto" />
                                <datalist id="array_proyectos">
                                    <option :value="item.descripcion" v-for="item in array_proyectos">
                                        {{ item.codigoproyecto }}
                                    </option>
                                </datalist>
                            </div>
                            <div class="form-group col-4">
                                <!-- Observacion -->
                                <label for="observacion">Observación</label>
                                <textarea
                                    id="observacion"
                                    class="form-control"
                                    placeholder="Ingrese observación"
                                    ref="observacion"
                                    rows="3"
                                    v-model.trim="formulario.observacion"></textarea>
                            </div>
                        </div>
                        <fieldset class="row border-2 border-gray-500">
                            <legend>Adicionales</legend>
                            <div class="form-group col-2">
                                <label for="tipo_oc">Tipo de Orden de Compra</label>
                                <select id="tipo_oc" class="form-control" v-model="formulario.tipo_oc">
                                    <option :value="item.value" v-for="item in array_tipo_oc">
                                        {{ item.value | upper }}
                                    </option>
                                </select>
                            </div>
                            <div class="form-group col-4">
                                <label for="condicion1">Condición 1</label>
                                <select id="condicion1" class="form-control" v-model="formulario.cod_condicion1">
                                    <option :value="item.codigo" v-for="item in array_condicion1">
                                        {{ item.descripcion }}
                                    </option>
                                </select>
                            </div>
                            <div class="form-group col-4">
                                <label for="condicion2">Condición 2</label>
                                <select id="condicion2" class="form-control" v-model="formulario.cod_condicion2">
                                    <option :value="item.codigo" v-for="item in array_condicion2">
                                        {{ item.descripcion }}
                                    </option>
                                </select>
                            </div>
                        </fieldset>
                        <div class="row">
                            <div class="form-group col-12" v-if="showBlockMantenimiento">
                                <div class="card card-info card-outline">
                                    <div class="card-header">
                                        <h3 class="card-title text-info">Complemento Área Mantenimiento</h3>
                                    </div>
                                    <div class="card-body row">
                                        <div class="form-group col-md-4">
                                            <!-- OT -->
                                            <small>OT</small>
                                            <input
                                                id="OT"
                                                type="text"
                                                class="form-control"
                                                placeholder="OT"
                                                ref="ot"
                                                v-model="formulario.mantencion_ot" />
                                        </div>
                                        <div class="form-group col-md-4">
                                            <!-- Código Equipo -->
                                            <small>Código de Equipo</small>
                                            <input
                                                id="codigoequipo"
                                                type="text"
                                                class="form-control"
                                                @change="getCodList('array_codigoequipo')"
                                                autocomplete="off"
                                                list="array_codigoequipo"
                                                placeholder="Código Equipo"
                                                ref="codigoequipo"
                                                v-model="formulario.desc_equipo" />
                                            <datalist id="array_codigoequipo">
                                                <option :value="item.descripcion" v-for="item in array_codigoequipo">
                                                    {{ item.codigo }}
                                                </option>
                                            </datalist>
                                        </div>
                                        <div class="form-group col-md-4">
                                            <!-- Tipo Solicitud -->
                                            <small>Tipo Solicitud</small>
                                            <select
                                                id="tiposolicitud"
                                                class="form-control"
                                                ref="tiposolicitud"
                                                v-model="formulario.mantencion_cod_tiposolicitud">
                                                <option :value="item.id" v-for="item in array_tiposolicitud">
                                                    {{ item.descripcion }}
                                                </option>
                                            </select>
                                        </div>
                                        <div class="form-group col-md-6">
                                            <!-- Caracteristica -->
                                            <small>Característica de la Solicitud</small>
                                            <select
                                                id="caracteristica"
                                                class="form-control"
                                                ref="caracteristicas"
                                                v-model="formulario.mantencion_cod_caracteristica">
                                                <option :value="item.id" v-for="item in array_caracteristica">
                                                    {{ item.descripcion }}
                                                </option>
                                            </select>
                                        </div>
                                        <div class="form-group col-md-6">
                                            <!-- Sub Area de Mantenimiento -->
                                            <small>Sub Área de Mantenimiento</small>
                                            <input
                                                id="areaencargada"
                                                type="text"
                                                class="form-control"
                                                @change="getCodList('array_areaencargada')"
                                                autocomplete="off"
                                                list="array_areaencargada"
                                                placeholder="Área Encargada"
                                                ref="areaencargada"
                                                v-model="formulario.desc_areaencargada" />
                                            <datalist id="array_areaencargada">
                                                <option
                                                    :value="item.descripcion"
                                                    v-for="item in array_areaencargada"></option>
                                            </datalist>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});

Vue.component('participantes', {
    setup() {
        const baseParticipantes = ref([]);
        const participantes = computed(() => useStoreSOC.state.participantes);

        usePPalStore.dispatch('loadBaseParticipantes').then((/** @type {Array} */ response) => {
            baseParticipantes.value = response;
        });

        watch(participantes, (/** @type {Array} */ val) => {
            useStoreSOC.commit('setProgresoCompletitud', {
                key: 'participantes',
                status: val.length > 0,
            });
        });

        const progresoCompletitud = computed(() => useStoreSOC.state.progesoCompletitud);

        return {
            baseParticipantes,
            participantes,
            progresoCompletitud,
        };
    },
    methods: {
        addParticipante() {
            const participante = this.$refs.txtParticipante.value;
            const index = this.baseParticipantes.findIndex(item => item.email === participante);
            if (index >= 0) {
                const indexP = this.participantes.findIndex(item => item.email === this.baseParticipantes[index].email);
                if (indexP >= 0) {
                    Swal.fire({
                        title: 'Error!',
                        text: 'El participante ya se encuentra agregado',
                        icon: 'error',
                        confirmButtonText: 'Aceptar',
                    });
                    return;
                }

                const params = {
                    nombre: this.baseParticipantes[index].name,
                    email: this.baseParticipantes[index].email,
                    aprueba: false,
                    finaliza: false,
                };

                useStoreSOC.commit('setParticipantes', params);
            }
            this.$refs.txtParticipante.value = '';
        },
        deleteParticipanteLocal(index: number) {
            useStoreSOC.commit('deleteParticipante', index);
            if (this.participantes.length === 0) {
                useStoreSOC.commit('setProgresoCompletitud', {
                    key: 'participantes',
                    status: false,
                });
            }
        },
        /**
         * @param {Number} index
         * @param {String} key
         */
        updateParticipante(index, key) {
            const check = document.getElementById(`check_${key}_${index}`);
            if (!(check instanceof HTMLInputElement)) return;
            const value = check.checked;
            useStoreSOC.commit('updateParticipanteStore', {
                index,
                data: { key, value },
            });
        },
    },
    template: html`
        <div class="container-fluid">
            <div class="card col-md-12">
                <div class="card-header">
                    <div class="form-group col-4">
                        <label for="participante">Ingrese participante</label>
                        <div class="input-group">
                            <input
                                id="participante"
                                type="text"
                                class="form-control"
                                @keyup.enter="addParticipante"
                                list="baseParticipantes"
                                ref="txtParticipante" />
                            <datalist id="baseParticipantes">
                                <option :value="item.email" v-for="item in baseParticipantes">{{ item.name }}</option>
                            </datalist>
                            <div class="input-group-append">
                                <button type="button" class="btn btn-outline-secondary" @click="addParticipante">
                                    <i class="bi bi-search"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Participante</th>
                                <th>E-Mail</th>
                                <th class="text-center">Aprueba</th>
                                <th class="text-center">Finaliza</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in participantes">
                                <td>{{ item.nombre }}</td>
                                <td>{{ item.email }}</td>
                                <td class="text-center">
                                    <iCheck
                                        :checked="item.aprueba"
                                        :id="'check_aprueba_'+index"
                                        :key="'check_aprueba_'+index"
                                        @change="updateParticipante(index,'aprueba')"
                                        label="" />
                                </td>
                                <td class="text-center">
                                    <iCheck
                                        :checked="item.finaliza"
                                        :id="'check_finaliza_'+index"
                                        :key="'check_finaliza_'+index"
                                        @change="updateParticipante(index,'finaliza')"
                                        label="" />
                                </td>
                                <td>
                                    <button class="btn btn-danger" @click="deleteParticipanteLocal(index)">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,
});

Vue.component('barracomando', {
    emits: ['accion'],
    data() {
        return {};
    },
    methods: {
        nextPage() {
            this.$emit('accion', 'cargarModalZone');
        },
    },
    template: html`
        <div class="row">
            <slot name="commands"></slot>
        </div>
    `,
});

Vue.component('files', {
    emits: ['selectedFile'],
    setup() {
        const fileStore = computed(() => useStoreSOC.state.files);
        const types = computed(() => usePPalStore.state.FileTypeValid);
        const progresoCompletitud = computed(() => useStoreSOC.state.progesoCompletitud);

        const setFilesLocal = filesInput => {
            const files = [];

            for (const file of filesInput) {
                files.push({
                    name: file.archivo,
                    type: file.type,
                    size: file.size,
                    file: file,
                    selected: false,
                    data: {
                        seleccionado: false,
                        nombreproveedor: '',
                        rutproveedor: '',
                        monto: 0,
                        observacion: '',
                        proveedor_verificado: false,
                    },
                });
            }
            if (files.length > 0) {
                useStoreSOC.commit('setFiles', files);
            }
        };

        const accion = (data: AccionData) => {
            const actions: actionsType = {
                addFiles: () => setFilesLocal(data.files),
            };
            const fn = actions[data.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        return {
            fileStore,
            types,
            progresoCompletitud,
            accion,
        };
    },
    methods: {
        getType(file) {
            const type = this.types.find(item => item.type === file.type);
            return `${type.color} ${type.icon}`;
        },
        selectedFile(file) {
            this.$emit('selectedFile', file);
        },
    },
    template: html`
        <div class="card col-md-4">
            <div class="card-header px-1 m-0">
                <dropZone :multiple="true" :nfilesMultiple="10" :files="fileStore" @accion="accion" />
            </div>
            <div class="card-body px-2">
                <div class="list-group list-group-flush">
                    <button
                        type="button"
                        class="list-group-item list-group-item-action pl-1"
                        :class="item.selected?'active text-white':''"
                        @click="selectedFile(item)"
                        v-for="item in fileStore">
                        <i :class="getType(item)+' fa-2x'"></i>
                        {{ item.name }}
                    </button>
                </div>
            </div>
        </div>
    `,
});

Vue.component('dataPresupuesto', {
    props: {
        file: {
            type: Object,
            required: true,
        },
    },
    setup(props) {
        // la estructura de dataPresupuesto se crea al momento de cargar el archivo
        const file = computed(() => props.file);
        const dataPresupuesto = ref({ ...file.value.data });
        const files = computed(() => useStoreSOC.state.files);
        const proveedores = inject('proveedores');
        const contactosProveedor = ref([]);

        const datosProveedor = ref({});

        const getContactos = async rut => {
            contactosProveedor.value = [];
            const response = await fetchGetContactosProveedor({ rut, estado: 1 });
            if (typeof response.data !== 'boolean') {
                response.data.forEach(element => {
                    contactosProveedor.value.push(element);
                });
            }
        };

        watch(
            () => dataPresupuesto.value.rutproveedor,
            val => {
                const index = proveedores.value.findIndex(item => item.rut === val);
                if (index >= 0) {
                    datosProveedor.value = proveedores.value[index];
                    getContactos(datosProveedor.value.rut);
                }
            }
        );

        watch(
            () => dataPresupuesto.value.send_to_contact,
            value => {
                if (value) {
                    getContactos(dataPresupuesto.value.rutproveedor);
                } else {
                    contactosProveedor.value = [];
                }
            }
        );

        onMounted(() => {
            getContactos(dataPresupuesto.value.rutproveedor);
        });

        return {
            file,
            proveedores,
            dataPresupuesto,
            files,
            datosProveedor,
            contactosProveedor,
        };
    },
    methods: {
        checkDataPresupuesto() {
            const params = {
                file: this.file.name,
                data: this.dataPresupuesto,
            };

            if (this.dataPresupuesto.send_to_contact) {
                if (this.dataPresupuesto.contacto_proveedor && this.dataPresupuesto.contacto_proveedor.includes(';')) {
                    const emails = this.dataPresupuesto.contacto_proveedor.split(';');
                    for (const email of emails) {
                        if (!checkEmailFormat(email)) {
                            versaAlert({
                                title: 'Error!',
                                message: 'El email del contacto no es válido',
                                type: 'error',
                            });
                            return;
                        }
                    }
                } else if (!checkEmailFormat(this.dataPresupuesto.contacto_proveedor)) {
                    versaAlert({
                        title: 'Error!',
                        message: 'El email del contacto no es válido',
                        type: 'error',
                    });
                    return;
                }
            }

            const result = this.files.find(
                item => item.data.rutproveedor === params.data.rutproveedor && item.name !== params.file
            );
            if (result) {
                Swal.fire({
                    title: 'Error!',
                    text: 'El proveedor ya se encuentra agregado',
                    icon: 'error',
                    confirmButtonText: 'Aceptar',
                });
                return;
            }

            if (this.dataPresupuesto.rutproveedor === '') {
                versaAlert({
                    title: 'Error!',
                    message: 'Debe seleccionar un proveedor valido',
                    type: 'error',
                });
                return;
            }

            useStoreSOC.commit('setDataFile', params);

            this.files.forEach(item => {
                const keys = Object.keys(item.data);
                let progreso = 0;
                for (const key of keys) {
                    if (key === 'seleccionado') {
                        progreso++;
                        continue;
                    }
                    if (key === 'observacion') {
                        progreso++;
                        continue;
                    }

                    if (item.data[key] !== '') {
                        progreso++;
                    }
                }
                useStoreSOC.commit('setProgresoCompletitud', {
                    key: 'archivos',
                    status: progreso === keys.length,
                });
            });

            useStoreSOC.commit('setFileSelected', null);

            this.$emit('accion', {
                accion: 'ShowDataPresupuesto',
                value: false,
            });

            this.$emit('accion', {
                accion: 'setFileSelected',
                value: null,
            });
        },
        deleteFile() {
            Swal.fire({
                title: '¿Está seguro?',
                text: '¡No podrá revertir esta acción!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                cancelButtonText: 'Cancelar',
                confirmButtonText: 'Si, eliminar!',
            }).then(result => {
                if (result.isConfirmed) {
                    useStoreSOC.commit('deleteFileStore', this.file);
                    this.$emit('accion', {
                        accion: 'ShowDataPresupuesto',
                        value: false,
                    });
                }
            });
        },
    },
    watch: {
        file(/** @type {Object} */ val) {
            this.dataPresupuesto = { ...val.data };
        },
    },
    template: html`
        <div class="card col-md-8">
            <div class="card-header">
                <h4>
                    <button type="button" class="btn btn-danger" @click="deleteFile">
                        <i class="fas fa-trash"></i>
                    </button>
                    Presupuesto: {{ file.name }}
                </h4>
            </div>
            <div class="card-body">
                <div class="flex justify-between">
                    <iCheck
                        class="col-4"
                        :id="'check_seleccionado_'+file.name"
                        label="Seleccionado"
                        v-model="dataPresupuesto.seleccionado" />

                    <iCheck
                        v-if="dataPresupuesto.seleccionado"
                        class="col-4"
                        :id="'check_send_contact_oc_'+file.name"
                        label="Enviar OC a proveedor"
                        iClass="icheck-warning"
                        v-model="dataPresupuesto.send_to_contact" />
                </div>
                <div class="row">
                    <div class="form-group col-md-6">
                        <inputDataList
                            id="proveedor"
                            class="mb-0"
                            :fieldsReturn="{ idField: 'rut', descripcionField: 'nombre' }"
                            :list="proveedores"
                            :msgItem="['nombre']"
                            :value="{ idField:dataPresupuesto.rutproveedor, descripcionField: dataPresupuesto.nombreproveedor }"
                            @changeDataList="dataPresupuesto.rutproveedor = $event.idField; dataPresupuesto.nombreproveedor = $event.descripcionField"
                            itemValueOption="rut"
                            key="proveedor"
                            label="Proveedor" />
                        <div class="d-flex gap-2" v-if="datosProveedor?.val_asociado !== undefined">
                            <i
                                style="font-size:1.2rem"
                                :class="datosProveedor.val_asociado == 1?'bi bi-patch-check-fill text-primary':'bi bi-patch-check text-warning'"></i>
                            <p class="bg-yellow-200" v-if="datosProveedor.observacion !== ''">
                                <i class="fa fa-exclamation-triangle"></i>
                                {{ datosProveedor.observacion }}
                            </p>
                        </div>
                    </div>
                    <div class="form-group col-md-4">
                        <label for="monto">Total Presupuesto</label>
                        <input
                            id="monto"
                            type="number"
                            class="form-control"
                            placeholder="monto"
                            v-model.number="dataPresupuesto.monto" />
                    </div>
                </div>
                <div class="row" v-if="dataPresupuesto.seleccionado">
                    <div class="col col-md-6">
                        <label for="observacionPresupuesto">Observación</label>
                        <textarea
                            id="observacionPresupuesto"
                            class="form-control"
                            placeholder="Ingrese observación"
                            rows="3"
                            v-model.trim="dataPresupuesto.observacion"></textarea>
                    </div>
                    <div class="col col-md-6" v-if="dataPresupuesto.send_to_contact">
                        <label for="contacto">Contacto Proveedor para enviar OC</label>
                        <input
                            list="contactos"
                            id="contacto"
                            type="text"
                            class="form-control"
                            placeholder="Contacto Proveedor"
                            v-model.trim="dataPresupuesto.contacto_proveedor"
                            autocomplete="off" />
                        <span class="text-xs text-warning">(separa por ; si deseas ingresar más de un correo)</span>
                        <datalist id="contactos">
                            <option :value="item.email" v-for="item in contactosProveedor" :key="item.email">
                                {{ item.email }}
                            </option>
                        </datalist>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-success" @click="checkDataPresupuesto">Guardar</button>
            </div>
        </div>
    `,
});

Vue.component('comparativo', {
    setup() {
        const files = computed(() => useStoreSOC.getters.getDataFileSortedBySelectedMonto);

        const showAlert = ref({
            value: false,
            message: '',
        });

        const showAlert2 = ref({
            value: false,
            message: '',
        });

        const showModalCGestion = ref(false);

        const estadoBoton = ref(false);

        const habilitaGuardar = computed(() => {
            showAlert.value.value = false;
            let result;
            result = files.value.find(item => item.data.seleccionado === true);
            if (result === undefined) {
                showAlert.value.value = true;
                showAlert.value.message = 'Debe seleccionar al menos un presupuesto';
                return false;
            }

            result = files.value.find(item => item.data.seleccionado === true && item.data.observacion === '');
            if (result !== undefined) {
                showAlert.value.value = true;
                showAlert.value.message = 'Debe completar la observación del presupuesto seleccionado';
                return false;
            }

            result = files.value.find(item => item.data.monto <= 0 || item.data.nombreproveedor === '');
            if (result !== undefined) {
                showAlert.value.value = true;
                showAlert.value.message = 'Debe completar todos los campos y el monto debe ser mayor a 0';
                return false;
            }

            return true;
        });

        showAlert2.value.value = computed(() => {
            const result = files.value.find(
                item => Number(item.data.monto) >= TOPE_RETENCION && item.data.seleccionado === true
            );
            if (result !== undefined) {
                showAlert2.value.message = `El monto del presupuesto seleccionado es superior a ($ ${Number(
                    TOPE_RETENCION
                ).toLocaleString()})`;
                return true;
            }
            return false;
        });

        const msgSendSOC = ref('Enviar Solicitud');

        return {
            files,
            habilitaGuardar,
            showAlert,
            estadoBoton,
            msgSendSOC,
            showAlert2,
            showModalCGestion,
        };
    },
    methods: {
        accion(accion) {
            const action = {
                closeModal: () => {
                    this.showModalCGestion = false;
                },
            };

            const fun = action[accion.accion] || action['default'];
            if (typeof fun === 'function') {
                fun();
            }
        },
        async saveSOC() {
            this.estadoBoton = true;
            this.msgSendSOC = 'Enviando... Por favor espere...';
            const data = await useStoreSOC.dispatch('saveSOCStore');
            if (data.success === 1) {
                Swal.fire({
                    title: 'Solicitud de Orden de Compra',
                    text: 'Se ha enviado la solicitud de orden de compra',
                    icon: 'success',
                    confirmButtonText: 'Aceptar',
                    timer: 3000,
                    timerProgressBar: true,
                });
                location.href = '/solicitudordencompra';
            } else {
                throw new Error(data.message);
            }
            this.estadoBoton = false;
        },
    },
    template: html`
        <div class="card col-md-8">
            <div class="card-header">
                <h4>Comparativo</h4>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-12 table-responsive" v-if="files.length > 0">
                        <div class="alert alert-warning alert-dismissible" v-if="showAlert.value">
                            <button type="button" class="close" aria-hidden="true" data-dismiss="alert">×</button>
                            <h5>
                                <i class="icon fas fa-ban"></i>
                                Alerta!
                            </h5>
                            {{ showAlert.message }}
                        </div>
                        <div class="alert alert-warning alert-dismissible" v-if="showAlert2.value">
                            <button type="button" class="close" aria-hidden="true" data-dismiss="alert">×</button>
                            <h5>
                                <i class="icon fas fa-ban"></i>
                                Alerta! - Retención Monto Superior (5%)
                            </h5>
                            {{ showAlert2.message }}
                        </div>
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>Archivo</th>
                                    <th>Proveedor</th>
                                    <th>Monto Presupuesto</th>
                                    <th>Seleccionado</th>
                                    <th>Observación</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in files">
                                    <td :class="item.data.seleccionado ? 'bg-selected':''">{{ item.name }}</td>
                                    <td :class="item.data.seleccionado ? 'bg-selected':''">
                                        <i
                                            style="font-size:1.2rem"
                                            :class="item.data.proveedor_verificado == true?'bi bi-patch-check-fill text-primary':'bi bi-patch-check text-warning'"></i>
                                        {{ item.data.nombreproveedor }}
                                    </td>
                                    <td class="text-right" :class="item.data.seleccionado ? 'bg-selected':''">
                                        {{ item.data.monto | format_number }}
                                    </td>
                                    <td class="text-center" :class="item.data.seleccionado ? 'bg-selected':''">
                                        <i class="fas fa-check-circle" v-if="item.data.seleccionado"></i>
                                        <i class="fas fa-times-circle text-danger" v-else></i>
                                    </td>
                                    <td :class="item.data.seleccionado ? 'bg-selected':''">
                                        {{ item.data.observacion }}
                                    </td>
                                    <td>
                                        <button
                                            class="btn btn-info"
                                            @click="showModalCGestion=true"
                                            v-if="item.data.seleccionado">
                                            Distribuir Presupuesto por Área
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <distribuirPresupuestoSOC :showModal="showModalCGestion" @accion="accion" />
                    </div>
                    <div class="col-md-12" v-else>
                        <h4>No hay archivos cargados</h4>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-success" :disabled="!habilitaGuardar || estadoBoton" @click="saveSOC">
                    <loader v-if="estadoBoton"></loader>
                    &nbsp;{{ msgSendSOC }}
                </button>
            </div>
        </div>
    `,
});

Vue.component('distribuirPresupuestoSOC', {
    components: { newModal },
    props: {
        showModal: {
            type: Boolean,
            required: true,
        },
    },
    setup(props) {
        const cgestionSelected = ref([]);
        const cgestion = ref([]);

        const showModal = computed(() => props.showModal);
        const formulario = computed(() => useStoreSOC.state.formulario);
        const fileSelected = computed(() => useStoreSOC.getters.getFileSelected);
        const CGestionStore = computed(() => useStoreSOC.state.cgestion);

        const sumCGestionSelected = computed(() => {
            let sum = 0;
            cgestionSelected.value.forEach(item => {
                sum += Number(item.monto ?? 0);
            });
            return Number(sum);
        });

        watch(
            showModal,
            val => {
                cgestion.value = [];
                if (val) {
                    const params = {
                        codigo_campus: formulario.value.cod_campus,
                        estado: 1,
                    };

                    fetchCGestion(params).then(res => {
                        cgestion.value = res;
                    });
                    cgestionSelected.value = JSON.parse(JSON.stringify(CGestionStore.value));
                }
            },
            { immediate: true }
        );

        const showBtnSave = computed(() => {
            if (fileSelected.value === null || fileSelected.value === undefined) return false;

            return Number(fileSelected.value.data.monto) === Number(sumCGestionSelected.value);
        });

        return {
            showModal,
            cgestion,
            fileSelected,
            cgestionSelected,
            sumCGestionSelected,
            showBtnSave,
        };
    },
    methods: {
        accion(accion) {
            const action = {
                closeModal: () => {
                    this.cgestionSelected = [];
                    this.$emit('accion', accion);
                },
                default: () => this.$emit('accion', accion),
            };

            const fn = action[accion.accion] || action['default'];
            if (typeof fn === 'function') {
                fn();
            }
        },
        addCGestion(event) {
            if (this.cgestionSelected.some(item => item.codigo === event.idField)) {
                return;
            }

            this.cgestionSelected.push({
                cod_campus: event.item.cod_campus,
                cod_area: event.item.cod_area,
                codigo: event.idField,
                descripcion: event.descripcionField,
                monto: 0,
            });
        },
        removeCGestion(index) {
            this.cgestionSelected.splice(index, 1);
        },
        saveCGestion() {
            const cGestionFinal = this.cgestionSelected.filter(item => item.monto > 0);

            Swal.fire({
                title: '¿Estás seguro?',
                text: 'Se guardará la distribución del presupuesto por área',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, guardar',
                cancelButtonText: 'Cancelar',
            }).then(result => {
                if (result.isConfirmed) {
                    useStoreSOC.commit('setCGestion', cGestionFinal);
                    this.accion({ accion: 'closeModal' });
                    this.cgestionSelected = [];
                }
            });
        },
    },
    template: html`
        <newModal :showModal="showModal" @accion="accion" idModal="modalCGestion" size="max-w-6xl">
            <template slot="title">Distribuir Presupuesto en Diferentes Centros de Gestión</template>
            <template slot="body">
                <div class="col-md-12">
                    <div class="row justify-end">
                        Total a Distribuir: {{ fileSelected?.data.monto | format_number }}
                    </div>
                    <div class="row">
                        <div class="col-md-4">
                            <inputDataList
                                id="cgestion"
                                :fieldsReturn="{ idField: 'codigo', descripcionField: 'descripcion' }"
                                :list="cgestion"
                                :msgItem="['descripcion']"
                                @changeDataList="addCGestion($event)"
                                itemValueOption="codigo"
                                key="cgestion"
                                label="Centro de Gestión" />
                        </div>

                        <div class="col-md-8">
                            <table class="table table-bordered table-hover">
                                <thead>
                                    <th></th>
                                    <th>Código</th>
                                    <th>Centro de Gestión</th>
                                    <th>Monto: {{ sumCGestionSelected | format_number }}</th>
                                </thead>
                                <tbody>
                                    <tr v-for="(item,index) in cgestionSelected">
                                        <td>
                                            <button class="btn btn-xs btn-danger" @click="removeCGestion(index)">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                        <td>{{ item.codigo }}</td>
                                        <td>{{ item.descripcion }}</td>
                                        <td>
                                            <input
                                                type="number"
                                                class="form-control"
                                                min="0"
                                                v-model.number="item.monto" />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </template>
            <template slot="footer">
                <div class="flex justify-between">
                    <button class="btn btn-primary" @click="saveCGestion" v-if="showBtnSave">Guardar</button>
                    <button class="btn btn-danger" @click="accion({ accion: 'closeModal' })">Cancelar</button>
                </div>
            </template>
        </newModal>
    `,
});

const _appSOC = new Vue({
    el: '#ppal',
    delimiters: ['${', '}'],
    store: useStoreSOC,
});
