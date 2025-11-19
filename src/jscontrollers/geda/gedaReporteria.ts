import { fecthCampus, fetchDependencias, fetchEdificios, fetchPisos } from '@/jscontrollers/composables/fetching';
import { addDias, getDiaActual, show_toast } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import customTable from '@/jscontrollers/components/customTable';
import iCheck from '@/jscontrollers/components/iCheck';
import iRadio from '@/jscontrollers/components/iRadio';
import inputDataList from '@/jscontrollers/components/inputDataList';
/* eslint-disable */
const ct = customTable;
const ir = iRadio;
const idl = inputDataList;
const ic = iCheck;
/* eslint-enable */

Vue.component('crumb', {
    setup() {
        const showModal = Vue.ref(false);

        return {
            showModal,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                closeModal: () => (this.showModal = false),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
    },
    template: html`
        <div class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1 class="m-0 text-dark">
                            <i class="fas fa-comments-dollar"></i>
                            Reporteria Gestión de Activos
                        </h1>
                    </div>
                    <div class="col-sm-6">
                        <ol class="breadcrumb float-sm-right">
                            <li class="breadcrumb-item">
                                <a href="/portal">Home</a>
                            </li>
                            <li class="breadcrumb-item">
                                <a href="/geda/movimientos">movimientos</a>
                            </li>
                            <li class="breadcrumb-item active">Reporteria</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    `,
});
Vue.component('ppal', {
    props: {},
    setup() {},
    methods: {},
    template: html`
        <div class="col col-md-12">
            <div class="card card-info card-outline card-outline-tabs">
                <div class="card-header p-0 border-bottom-0">
                    <ul id="MovimientosActivos-tab" class="nav nav-tabs" role="tablist">
                        <li class="nav-item">
                            <a
                                id="activos-tab"
                                class="nav-link active"
                                aria-controls="activos-tab"
                                aria-selected="true"
                                data-toggle="pill"
                                href="#activos"
                                role="tab">
                                Consulta de Activos
                            </a>
                        </li>
                        <li class="nav-item">
                            <a
                                id="movimientos-tab"
                                class="nav-link"
                                aria-controls="movimientos-tab"
                                aria-selected="false"
                                data-toggle="pill"
                                href="#movimientos"
                                role="tab">
                                Movimientos
                            </a>
                        </li>
                    </ul>
                </div>
                <div class="card-body">
                    <div id="MovimientosActivos-tabContent" class="tab-content">
                        <div
                            id="activos"
                            class="tab-pane fade active show"
                            aria-labelledby="activos-tab"
                            role="tabpanel">
                            <activosReport />
                        </div>
                        <div id="movimientos" class="tab-pane fade" aria-labelledby="movimientos-tab" role="tabpanel">
                            <movimientosReport />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});

Vue.component('activosReport', {
    props: {},
    setup() {
        const optionsTipoConsulta = [
            { id: '3', value: '3', label: 'Por Código Activo' },
            { id: '1', value: '1', label: 'Por Código SAP' },
            { id: '2', value: '2', label: 'Por Dependencia' },
        ];
        const tipoConsulta = Vue.ref('3');
        const data = Vue.ref([]);
        const filterValue = Vue.reactive({
            value: '',
            description: '',
        });
        const urlCons = Vue.ref('');
        const externalFilters = Vue.ref('');
        const refresTable = Vue.ref(false);

        const campus = Vue.ref([]);
        const campusSelected = Vue.ref(null);
        const edificios = Vue.ref([]);
        const edificioSelected = Vue.ref(0);
        const pisos = Vue.ref([]);
        const pisoSelected = Vue.ref(0);
        const dependencias = Vue.ref([]);
        const dependenciaSelected = Vue.ref(0);

        const showActivos = Vue.ref(true);

        const getCampus = async () => {
            const response = await fecthCampus();
            campus.value = response;
        };
        getCampus();

        Vue.watch(campusSelected, async () => {
            const response = await fetchEdificios(campusSelected.value);
            edificios.value = response;
        });

        Vue.watch(edificioSelected, async () => {
            const response = await fetchPisos(edificioSelected.value);
            pisos.value = response;
        });

        Vue.watch(pisoSelected, async () => {
            const response = await fetchDependencias(pisoSelected.value);
            dependencias.value = response;
        });

        return {
            optionsTipoConsulta,
            tipoConsulta,
            data,
            filterValue,
            urlCons,
            externalFilters,
            refresTable,
            campus,
            edificios,
            pisos,
            dependencias,
            campusSelected,
            edificioSelected,
            pisoSelected,
            dependenciaSelected,
            showActivos,
        };
    },
    methods: {
        setFilterValue() {},
        searchActivo() {
            if (this.filterValue.value === '' && this.tipoConsulta !== '2') {
                show_toast('Alerta', 'Debe ingresar un valor para la búsqueda', 'warning', 'warning');
                return;
            } else if (this.tipoConsulta === '2' && this.campusSelected === null) {
                show_toast('Alerta', 'Debe seleccionar un campus para la búsqueda', 'warning', 'warning');
                return;
            }

            if (this.tipoConsulta === '1') {
                this.urlCons = '/api/GEDA/getConsultaActivosByCodSAP';
                this.externalFilters = `${
                    this.showActivos ? 'ga.enabled_dependencia = 1 AND' : ''
                } ga.cod_sap =  ${this.filterValue.value}`;
            } else if (this.tipoConsulta === '3') {
                this.urlCons = '/api/GEDA/getConsultaActivosByCodSAP';
                this.externalFilters = `${
                    this.showActivos ? 'ga.enabled_dependencia = 1 AND' : ''
                } ga.codigo_activo = '${this.filterValue.value}'`;
            } else {
                this.urlCons = '/api/GEDA/getConsultaActivosByCodSAP';
                this.externalFilters = `${
                    this.showActivos ? 'ga.enabled_dependencia = 1 AND' : ''
                } md.cod_campus = ${this.campusSelected} `;
                if (this.edificioSelected != 0) {
                    this.externalFilters += `AND md.id_edificio = ${this.edificioSelected} `;
                }
                if (this.pisoSelected != 0) {
                    this.externalFilters += `AND md.id_piso = ${this.pisoSelected} `;
                }
                if (this.dependenciaSelected != 0) {
                    this.externalFilters += `AND md.codigo ='${this.dependenciaSelected}' `;
                }
            }
            this.refresTable = !this.refresTable;
        },
    },
    template: html`
        <div>
            <div class="row">
                <div class="col col-md-4">
                    <div class="form-group">
                        <iRadio
                            id="tipoConsulta"
                            :horizontalList="true"
                            :options="optionsTipoConsulta"
                            iClass="icheck-primary"
                            key="tipoConsulta"
                            label="Tipo de Consulta"
                            v-model="tipoConsulta" />
                    </div>
                    <div>
                        <div class="form-group">
                            <iCheck
                                id="showActivos"
                                iClass="icheck-success"
                                key="showActivos"
                                label="Mostrar Solo Habilitados"
                                v-model="showActivos" />
                        </div>
                    </div>
                </div>
                <div class="col col-md-8" v-if="tipoConsulta != 2">
                    <div class="form-group col-6">
                        <label for="cod_sap_consulta">{{ tipoConsulta == 1 ? 'Código SAP':'Código Activo' }}</label>
                        <div class="input-group-append">
                            <input
                                id="cod_sap_consulta"
                                type="text"
                                class="form-control"
                                autofocus
                                ref="cod_sap_consulta"
                                v-model="filterValue.value" />
                            <div class="input-group-addon">
                                <button type="button" class="btn btn-primary" @click="searchActivo" title="Buscar">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col col-md-8" v-else>
                    <div class="row">
                        <div class="col-md-4 form-group">
                            <label for="consulta_campus">Campus</label>
                            <select id="consulta_campus" class="form-control" v-model="campusSelected">
                                <option :key="campu.id" :value="campu.id" v-for="campu in campus">
                                    {{ campu.descripcion }}
                                </option>
                            </select>
                        </div>
                        <div class="col-md-4 form-group">
                            <label for="consulta_edificio">Edificios</label>
                            <select id="consulta_edificio" class="form-control" v-model="edificioSelected">
                                <option value="0">Todos</option>
                                <option :key="edifico.id" :value="edifico.id" v-for="edifico in edificios">
                                    {{ edifico.descripcion }}
                                </option>
                            </select>
                        </div>
                        <div class="col-md-4 form-group">
                            <label for="consulta_pisos">Pisos</label>
                            <select id="consulta_pisos" class="form-control" v-model="pisoSelected">
                                <option value="0">Todos</option>
                                <option :key="piso.id" :value="piso.id" v-for="piso in pisos">
                                    {{ piso.descripcion }}
                                </option>
                            </select>
                        </div>
                        <div class="col-md-4 form-group">
                            <label for="consulta_dependencia">Dependencias</label>
                            <select id="consulta_dependencia" class="form-control" v-model="dependenciaSelected">
                                <option value="0">Todos</option>
                                <option
                                    :key="dependencia.codigo"
                                    :value="dependencia.codigo"
                                    v-for="dependencia in dependencias">
                                    {{ dependencia.descripcion }}
                                </option>
                            </select>
                        </div>
                        <div class="flex justify-end items-center">
                            <button type="button" class="btn btn-primary" @click="searchActivo" title="Buscar">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col col-md-12">
                    <customTable
                        id="consultaActivos"
                        :externalFilters="externalFilters"
                        :refresh="refresTable"
                        :url="urlCons"
                        fieldOrder="ga.id"
                        key="consultaActivos"
                        titleTable="Consulta de Activos" />
                </div>
            </div>
        </div>
    `,
});
Vue.component('movimientosReport', {
    props: {},
    setup() {
        const optionsMov = [
            { id: '1', value: '1', label: 'Baja', url: '/api/GEDA/reportBajas' },
            {
                id: '2',
                value: '2',
                label: 'Traslado',
                url: '/api/GEDA/reportTraslados',
            },
        ];

        const filterEstados = [
            { id: '1', value: '1', label: 'Pendiente', checked: true },
            { id: '2', value: '2', label: 'Aprobado', checked: true },
            { id: '3', value: '3', label: 'Rechazado', checked: true },
        ];

        const params = Vue.reactive({
            tipoMovimiento: '1',
            desde: addDias(getDiaActual(), -30),
            hasta: getDiaActual(),
            url: '',
            nameMovimiento: '',
        });

        const externalFilters = Vue.ref('');
        const refreshTable = Vue.ref(false);

        return {
            optionsMov,
            params,
            externalFilters,
            refreshTable,
            filterEstados,
        };
    },
    methods: {
        searchMovimientos() {
            this.params.url = this.optionsMov.find(element => element.value === this.params.tipoMovimiento).url;
            this.params.nameMovimiento = this.optionsMov.find(
                element => element.value === this.params.tipoMovimiento
            ).label;

            const estados = this.filterEstados.filter(estado => {
                if (estado.checked) {
                    return estado.value;
                }
            });

            this.externalFilters = `gme.estado_aprobacion IN (${estados.map(estado => estado.value).join(',')}) AND `;

            this.externalFilters += `DATE(gme.fecha) BETWEEN '${this.params.desde}' AND '${this.params.hasta}'`;

            this.refreshTable = !this.refreshTable;
        },
    },
    template: html`
        <div>
            <div class="row">
                <div class="col col-md-2">
                    <div class="form-group">
                        <iRadio
                            id="tipoMovimiento"
                            :horizontalList="true"
                            :options="optionsMov"
                            iClass="icheck-primary"
                            key="tipoMovimiento"
                            label="Tipo de Movimiento"
                            v-model="params.tipoMovimiento" />
                    </div>
                </div>
                <div class="col col-md-4">
                    <span class="text-muted mb-2 text-bold">Estados:</span>
                    <div class="d-flex gap-x-2 mt-2">
                        <iCheck
                            :id="estado.id"
                            :key="estado.id"
                            :label="estado.label"
                            iClass="icheck-success"
                            v-for="estado in filterEstados"
                            v-model="estado.checked" />
                    </div>
                </div>
                <div class="col col-md-6">
                    <div class="row gap-x-1">
                        <div class="form-group">
                            <label for="desde">Desde</label>
                            <input id="desde" type="date" class="form-control" v-model="params.desde" />
                        </div>
                        <div class="form-group">
                            <label for="hasta">Hasta</label>
                            <input id="hasta" type="date" class="form-control" v-model="params.hasta" />
                        </div>
                        <div class="flex justify-end items-center">
                            <button type="button" class="btn btn-primary" @click="searchMovimientos" title="Buscar">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col col-md-12">
                    <customTable
                        id="movimientos"
                        :externalFilters="externalFilters"
                        :refresh="refreshTable"
                        :url="params.url"
                        fieldOrder="id"
                        key="movimientos"
                        titleTable="Movimientos de Activos" />
                </div>
            </div>
        </div>
    `,
});

const _gedaReport = new Vue({
    el: '#ppal',
    delimiters: ['${', '}'],
});
