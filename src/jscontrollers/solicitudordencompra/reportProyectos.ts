import loader from '@/jscontrollers/components/loading';
import { fecthCampus, fetchProyectos } from '@/jscontrollers/composables/fetching';
import { createXlsxFromJson } from '@/jscontrollers/composables/useXlsx';
import { addDias, getDiaActual, pasarella, show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { usePPalStore } from '@/jscontrollers/usePPalStore';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
import jsZip from 'P@/vendor/plugins/jszip/jszip.esm.js';

import modal from '@/jscontrollers/components/modal';
import newModal from '@/jscontrollers/components/newModal';
import eventDelegator from '@/jscontrollers/composables/eventDelegator';

/* eslint-disable */
const m = modal;
const l = loader;
/* eslint-enable */

const { ref, provide, inject, reactive, computed, watch } = Vue;

Vue.component('ppal', {
    setup() {
        const loading = inject('loading');

        return {
            loading,
        };
    },
    methods: {},
    template: html`
        <div class="col col-md-12">
            <div class="card card-info card-outline"></div>
            <div class="card card-body">
                <consulta />
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
        const loading = inject('loading');

        const filters = reactive({
            cod_campus: 0,
            cod_area: 0,
            cod_proyecto: 0,
        });

        const filtroDetalle = ref({});

        const tipoConsulta = ref('Por Proyecto');

        const functionPasarella = computed(() => usePPalStore.state.functionsPasarella);

        const owner_user = computed(() => usePPalStore.state.owner_user);

        const showModalProyDatail = ref(false);
        const showModalEditProy = ref(false);
        const socSelected = ref({});

        const ProySelected = ref({});

        const getSOCByDates = async (/** @type {Object} */ params: { desde: string; hasta: string }) => {
            loading.value = true;
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
                    from: 'proyectos',
                }),
            });
            loading.value = false;
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
        accion(/** @type {Object} */ accion: { accion: string; id: number; item: object }) {
            const actions = {
                closeModal: () => {
                    this.showModalProyDatail = false;
                    this.showModalEditProy = false;
                },
                viewDetalleProyecto: () => this.viewDetalleProyecto(accion.id),
                loadSocByDates: () => this.loadSocByDates(),
                defult: () => this.$emit('accion', accion),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        async loadSocByDates() {
            const data = await this.getSOCByDates({
                desde: this.desde,
                hasta: this.hasta,
            });
            if ($('#tableResult').find('tr').children().length > 0) {
                $('#tableResult').find('tr').children().remove();
                $('#tableResult').find('tbody').remove();
                // @ts-ignore
                $('#tableResult').DataTable().destroy();
                $('#tableResult').empty();
            }
            if (data.success === 1) {
                const consultaFn = {
                    'Por Proyecto': () => this.consultaPorProyecto(data),
                };
                const selectedConsulta = consultaFn[this.tipoConsulta] || consultaFn['General'];
                if (typeof selectedConsulta === 'function') {
                    selectedConsulta();
                }
            }
            $('#tableResult').DataTable().columns.adjust().draw();
        },
        getCodList(/** @type {String} */ lista: string) {
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
        viewDetalleProyecto(/** @type {Object} */ proyecto: object) {
            this.filtroDetalle = {
                desde: this.desde,
                hasta: this.hasta,
                filters: this.filters,
            };

            this.ProySelected = proyecto;
            this.showModalProyDatail = true;
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
                    <div class="col-md-3 hidden">
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

                    <table class="table table-bordered table-striped table-hover" id="tableResult"></table>
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

        const typeFiles = usePPalStore.state.FileTypeValid;
        const getType = file => {
            const type = typeFiles.find(item => item.type === file.type);
            return `${type.color} ${type.icon}`;
        };

        const loaderDownload = ref(false);
        const downloadFilesZip = async () => {
            loaderDownload.value = true;
            // recorrer la data, con las url de los archivos, descargar los archivo y comprimir
            const zip = new jsZip();
            const folder = zip.folder('SOC');
            await Promise.all(
                data.value.map(async item => {
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
                a.download = 'SOC.zip';
                a.click();
            });
            loaderDownload.value = false;
        };

        const loaderDownloadExcel = ref(false);
        const downloadExcel = async () => {
            loaderDownloadExcel.value = true;
            await createXlsxFromJson(data.value, 'Detalle Uso Proyecto');
            loaderDownloadExcel.value = false;
        };

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
            getType,
            downloadFilesZip,
            loaderDownload,
            loaderDownloadExcel,
            downloadExcel,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            this.$emit('accion', accion);
        },
    },
    template: html`
        <newModal :showModal="showModal" idModal="DetalleUsoProyecto" @accion="accion" size="max-w-6xl">
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
                            <td>
                                <div v-if="item.archivo">
                                    <i :class="getType(item)+' fa-2x'"></i>
                                    <a :href="item.ruta" download target="_blank">{{ item.orden_compra }}</a>
                                </div>
                                <div v-else>{{ item.orden_compra }}</div>
                            </td>
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
                <div class="flex justify-between gap-2">
                    <button
                        type="button"
                        class="btn btn-success"
                        @click="downloadExcel"
                        :disabled="loaderDownloadExcel">
                        <div>
                            Descargar Excel
                            <i class="fa fa-file-excel" aria-hidden="true"></i>
                        </div>
                        <loader v-if="loaderDownloadExcel" />
                    </button>
                    <button
                        type="button"
                        class="btn btn-primary flex gap-2"
                        @click="downloadFilesZip"
                        :disabled="loaderDownload">
                        <div>
                            Descargar Archivos
                            <i class="fa fa-download" aria-hidden="true"></i>
                        </div>
                        <loader v-if="loaderDownload" />
                    </button>
                </div>
                <button type="button" class="btn btn-secondary" @click="accion({accion: 'closeModal'})">Cerrar</button>
            </template>
        </newModal>
    `,
});

const _appSOCRepProy = new Vue({
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
        const loading = ref(false);

        provide('loading', loading);

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
                                SOC - Reporte Proyectos
                                <loader v-if="loading"></loader>
                            </h1>
                        </div>
                        <div class="col-sm-6">
                            <ol class="breadcrumb float-sm-right">
                                <li class="breadcrumb-item">
                                    <a href="/portal">Home</a>
                                </li>
                                <li class="breadcrumb-item active">Dashboard</li>
                                <li class="breadcrumb-item d-flex">Reporte Proyectos</li>
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

// Register a single delegated global click handler for this module
eventDelegator.register('pasarella_reportproy', 'click', function (event) {
    pasarella(_appSOCRepProy, event);
});
