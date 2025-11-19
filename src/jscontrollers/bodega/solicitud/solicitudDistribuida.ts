import { $dom } from '@/jscontrollers/composables/dom-selector';
import {
    fecthCampus,
    fetchGetAreas,
    fetchGetBodegaByCodigo,
    fetchGetCGestion,
    fetchGetProductos,
    fetchGetTipoCodigo,
} from '@/jscontrollers/composables/fetching';
import { show_toast, versaAlert, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import customTable from '@/jscontrollers/components/customTable.js';
import iCheck from '@/jscontrollers/components/iCheck.js';
import inputDataList from '@/jscontrollers/components/inputDataList.js';
import modal from '@/jscontrollers/components/modal.js';
import newModal from '@/jscontrollers/components/newModal';
/* eslint-disable */
const idl = inputDataList;
const md = modal;
const ct = customTable;
const ic = iCheck;
/* eslint-enable */

Vue.component('crumb', {
    props: {},
    setup() {
        return {};
    },
    methods: {},
    template: html`
        <div class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1 class="m-0 text-dark">
                            <i class="fa fa-shopping-cart "></i>
                            SOLICITUD A BODEGA DISTRIBUIDA
                        </h1>
                    </div>
                    <div class="col-sm-6">
                        <ol class="breadcrumb float-sm-right">
                            <li class="breadcrumb-item">
                                <a href="/portal">Home</a>
                            </li>
                            <li class="breadcrumb-item">Bodega</li>
                            <li class="breadcrumb-item">
                                <a href="/bodega/salidas_ppal">Salida Ppal</a>
                            </li>
                            <li class="breadcrumb-item active">Solicitud Distribuida</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    `,
});

Vue.component('ppal', {
    props: {},
    setup() {
        const arrTipoCodigo = Vue.ref([]);
        const arrProductos = Vue.ref([]);
        const arrBodegas = Vue.ref([]);
        const arrDetalle = Vue.ref([]);
        const noWatch = Vue.ref(false);

        const showItem = Vue.ref(false);
        const showSearch = Vue.ref(false);

        const getTipoCodigo = async () => {
            const response = await fetchGetTipoCodigo();
            arrTipoCodigo.value = response;
        };

        const encabezado = Vue.inject('encabezado');

        Vue.onMounted(() => {
            getTipoCodigo();
        });

        Vue.watch(
            () => encabezado.id_tipocodigo,
            async value => {
                if (noWatch.value) return;

                const reponse = await fetchGetProductos(value);
                arrProductos.value = [];
                if (typeof reponse === 'boolean') return;
                arrProductos.value = reponse;

                encabezado.codigo = '';
                encabezado.descripcion = '';
                encabezado.cod_bodega = '';
            }
        );

        Vue.watch(
            () => encabezado.codigo,
            async value => {
                if (noWatch.value) return;

                if (value) {
                    const response = await fetchGetBodegaByCodigo({
                        codigo: value,
                        id_tipocodigo: encabezado.id_tipocodigo,
                    });
                    arrBodegas.value = [];
                    if (typeof response === 'boolean') return;
                    arrBodegas.value = response;

                    encabezado.cod_bodega = '';
                }
            }
        );

        const bodegaSelected = Vue.computed(() =>
            arrBodegas.value.find(item => item.cod_bodega === encabezado.cod_bodega)
        );

        const newItem = {
            id: 0,
            cod_campus: '',
            desc_campus: '',
            cod_area: '',
            desc_area: '',
            cod_cgestion: '',
            desc_cgestion: '',
            cantidad: 0,
        };

        const itemSelected = Vue.ref({});
        Vue.watch(
            () => showItem.value,
            value => {
                if (!value) {
                    itemSelected.value = {};
                }
            }
        );

        return {
            arrTipoCodigo,
            arrProductos,
            arrBodegas,
            bodegaSelected,
            showItem,
            itemSelected,
            newItem,
            encabezado,
            arrDetalle,
            showSearch,
            noWatch,
        };
    },
    methods: {
        accion(accion) {
            const actions = {
                closeModal: () => {
                    this.showItem = false;
                    this.showSearch = false;
                },
                saveItem: () => this.saveItem(accion.item),
                utilizarTemplate: () => this.utilizarTemplate(accion.item),
                default: () => {
                    this.$emit('accion', accion);
                },
            };

            const fn = actions[accion.accion] || actions.default;
            if (typeof fn === 'function') {
                fn();
            }
        },
        reload() {
            window.location.reload();
        },
        showModal(from, item = {}) {
            if (from === 'new') {
                this.itemSelected = JSON.parse(JSON.stringify(this.newItem));
            } else {
                this.itemSelected = item;
            }
            this.showItem = true;
        },
        async limpiarTabla() {
            const result = await Swal.fire({
                title: '¿Está seguro de limpiar la tabla?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí',
                cancelButtonText: 'No',
            });
            if (!result.isConfirmed) return;
            this.arrDetalle = [];
        },
        saveItem(item) {
            if (item.id === 0) {
                // check if la combinación de campus, area y centro de gestión ya existe
                const exist = this.arrDetalle.find(
                    x =>
                        x.cod_campus === item.cod_campus &&
                        x.cod_area === item.cod_area &&
                        x.cod_cgestion === item.cod_cgestion
                );

                if (exist) {
                    versaAlert({
                        title: 'Error',
                        message: 'La combinación ya existe',
                        type: 'error',
                    });
                    return;
                }

                item.id = this.arrDetalle.length + 1;
                item.cantidad = Number(item.cantidad);
                this.arrDetalle.push(item);
            } else {
                const index = this.arrDetalle.findIndex(x => x.id === item.id);
                this.arrDetalle[index] = item;
            }
            this.showItem = false;
        },
        async saveSOB() {
            if (
                this.arrDetalle.length === 0 ||
                this.encabezado.id_tipocodigo === '' ||
                this.encabezado.codigo === '' ||
                this.encabezado.cod_bodega === ''
            ) {
                show_toast('Error', 'Debe completar todos los campos');
                return;
            }

            const sumCantidad = this.arrDetalle.reduce((acc, item) => Number(acc) + Number(item.cantidad), 0);
            if (this.encabezado.codigo !== '' && Number(sumCantidad) > Number(this.bodegaSelected.stock_actual)) {
                Swal.fire({
                    title: 'Error',
                    text: 'La cantidad solicitada es mayor al stock actual',
                    icon: 'error',
                });
                return;
            }

            this.encabezado.valor = this.bodegaSelected.preciocompra;

            const result = await Swal.fire({
                title: '¿Está seguro de guardar la solicitud?',
                text: 'Una vez guardada no podrá ser modificada y los productos serán sacados de bodega',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí',
                cancelButtonText: 'No',
            });
            if (!result.isConfirmed) return;

            const data = {
                encabezado: this.encabezado,
                detalle: this.arrDetalle,
            };

            const response = await versaFetch({
                url: '/api/saveSOBDistribuida',
                method: 'POST',
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            show_toast(
                response.title,
                response.message,
                response.success === 1 ? 'success' : 'error',
                response.success === 1 ? 'success' : 'error'
            );
            if (response.success === 1) {
                this.reload();
            }
        },
        async utilizarTemplate(item) {
            this.arrDetalle = [];

            for (const clave in this.encabezado) {
                if (clave !== 'plantilla' && clave !== 'id_plantilla' && clave !== 'valor') this.encabezado[clave] = '';
            }

            const response = await versaFetch({
                url: '/api/getUtilizarTemplate',
                method: 'POST',
                data: JSON.stringify({ id: item.id }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.success === 1) {
                this.noWatch = true;
                this.encabezado.id_tipocodigo = response.encabezado.id_tipocodigo;

                this.encabezado.codigo = response.encabezado.codigo;
                this.encabezado.descripcion = response.encabezado.descripcion;

                const respBodega = await fetchGetBodegaByCodigo({
                    codigo: this.encabezado.codigo,
                    id_tipocodigo: this.encabezado.id_tipocodigo,
                });
                this.arrBodegas = respBodega;

                this.encabezado.cod_bodega = response.encabezado.cod_bodega;
                this.encabezado.observacion = response.encabezado.observacion;
                this.encabezado.desc_sob = response.encabezado.desc_sob;
                this.encabezado.plantilla = true;
                this.encabezado.id_plantilla = item.id;

                this.arrDetalle = response.detalle;
                setTimeout(() => {
                    this.noWatch = false;
                }, 1000);

                this.showSearch = false;
            }
        },
    },
    template: html`
        <div class="card card-outline card-success">
            <div class="card-header">
                <button class="btn btn-success btn-sm" @click="saveSOB">
                    <i class="fa fa-save"></i>
                </button>
                <button type="button" class="btn btn-warning btn-sm" @click="reload" title="Limpiar...">
                    <i class="fa fa-magic"></i>
                </button>
                <button type="button" class="btn btn-info btn-sm" @click="showSearch = true" title="Buscar...">
                    <i class="fa fa-search"></i>
                </button>
            </div>
            <div class="card-body">
                <item :item="itemSelected" :showModal="showItem" @accion="accion" />
                <searchSOB :showModal="showSearch" @accion="accion" />

                <div class="col-md-12">
                    <div class="row">
                        <div class="form-group col-2">
                            <iCheck id="plantilla" label="Guardar Plantilla" v-model="encabezado.plantilla" />
                        </div>
                        <div class="form-group col-4" v-if="encabezado.plantilla">
                            <label for="descripcion">Descripción</label>
                            <input id="descripcion" type="text" class="form-control" v-model="encabezado.desc_sob" />
                        </div>
                    </div>
                    <hr class="p-0 m-0 mb-3" />
                    <div class="row">
                        <div class="form-group col-3">
                            <label for="tipoCodigo">Tipo de Código</label>
                            <select id="tipoCodigo" class="form-control" v-model="encabezado.id_tipocodigo">
                                <option value="">Seleccione...</option>
                                <option :value="item.id" v-for="item in arrTipoCodigo">{{ item.descripcion }}</option>
                            </select>
                        </div>
                        <div class="form-group col-6">
                            <inputDataList
                                id="codigo"
                                :fieldsReturn="{idField: 'codigo', descripcionField: 'descripcion'}"
                                :list="arrProductos"
                                :msgItem="['descripcion']"
                                :value="{ idField:encabezado.codigo,descripcionField: encabezado.descripcion}"
                                @changeDataList="encabezado.codigo=$event.idField;encabezado.descripcion=$event.descripcionField"
                                itemValueOption="codigo"
                                key="codigo"
                                label="Producto" />
                        </div>
                        <div class="form-group col-3">
                            <label for="bodegas">Bodega</label>
                            <select id="bodegas" class="form-control" v-model="encabezado.cod_bodega">
                                <option value="">Seleccione...</option>
                                <option :value="item.cod_bodega" v-for="item in arrBodegas">
                                    {{ item.desc_bodega }}
                                </option>
                            </select>
                        </div>
                    </div>

                    <div class="row">
                        <div class="form-group col-7">
                            <label for="observacion">Observación</label>
                            <textarea
                                id="observacion"
                                class="form-control"
                                rows="4"
                                v-model="encabezado.observacion"></textarea>
                        </div>
                        <div class="col-5">
                            <div class="form-group p-0 m-0 disabled text-center">
                                <label class="text-xs">Stock Actual</label>
                                <span class="form-control">
                                    {{ bodegaSelected?.stock_actual | format_number_n_decimal }}
                                </span>
                            </div>
                            <div class="form-group p-0 m-0 disabled text-center">
                                <label class="text-xs">Valor</label>
                                <span class="form-control">
                                    {{ bodegaSelected?.preciocompra | format_number_n_decimal }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <hr />
                    <div class="row gap-x-2">
                        <button type="button" class="btn btn-primary btn-sm" @click="showModal('new')">
                            <i class="fa fa-plus"></i>
                        </button>
                        <button type="button" class="btn btn-danger btn-sm" @click="limpiarTabla">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                    <div class="row">
                        <table class="table table-sm table-bordered">
                            <thead>
                                <tr>
                                    <th>OPT</th>
                                    <th>Campus</th>
                                    <th>Área</th>
                                    <th>C.Gestión</th>
                                    <th>Descripción</th>
                                    <th>Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in arrDetalle">
                                    <td>
                                        <button
                                            type="button"
                                            class="btn btn-warning btn-xs"
                                            @click="showModal('edit',item)">
                                            <i class="fa fa-edit"></i>
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-danger btn-xs"
                                            @click="arrDetalle = arrDetalle.filter(x => x.id !== item.id)">
                                            <i class="fa fa-trash"></i>
                                        </button>
                                    </td>
                                    <td>{{ item.desc_campus }}</td>
                                    <td>{{ item.desc_area }}</td>
                                    <td>{{ item.cod_cgestion }}</td>
                                    <td>{{ item.desc_cgestion }}</td>
                                    <td>{{ item.cantidad }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `,
});

Vue.component('item', {
    components: { newModal },
    emits: ['accion'],
    props: {
        item: {
            type: Object,
            required: true,
        },
        showModal: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const item = Vue.computed(() => props.item);
        const showModal = Vue.computed(() => props.showModal);
        const itemEditable = Vue.ref({});

        const arrCampus = Vue.inject('arrCampus');
        const arrAreas = Vue.ref([]);
        const arrCGestion = Vue.ref([]);

        const noWatch = Vue.ref(false);

        Vue.watch(showModal, value => {
            if (!value) {
                arrAreas.value = [];
                arrCGestion.value = [];
            }
        });

        Vue.watch(
            () => item.value,
            async value => {
                noWatch.value = true;
                itemEditable.value = JSON.parse(JSON.stringify(value));

                if (value.id !== 0 && value.id !== undefined) {
                    const response = await fetchGetAreas(value.cod_campus);
                    arrAreas.value = [];
                    if (typeof response !== 'boolean') {
                        arrAreas.value = response;
                    }

                    itemEditable.value.cod_area = value.cod_area || '';

                    const responseCGestion = await fetchGetCGestion(value.cod_campus, value.cod_area);
                    arrCGestion.value = [];
                    if (typeof responseCGestion !== 'boolean') {
                        arrCGestion.value = responseCGestion;
                    }

                    itemEditable.value.cod_cgestion = value.cod_cgestion || '';
                }
                setTimeout(() => {
                    noWatch.value = false;
                }, 1000);
            }
        );

        Vue.watch(
            () => itemEditable.value.cod_campus,
            async value => {
                if (noWatch.value) return;

                if (!value) return;
                const response = await fetchGetAreas(value);
                arrAreas.value = [];
                if (typeof response !== 'boolean') {
                    arrAreas.value = response;
                }

                itemEditable.value.cod_area = '';
                itemEditable.value.cod_cgestion = '';
            }
        );

        Vue.watch(
            () => itemEditable.value.cod_area,
            async value => {
                if (noWatch.value) return;
                if (!value) return;
                const response = await fetchGetCGestion(itemEditable.value.cod_campus, value);
                arrCGestion.value = [];
                if (typeof response !== 'boolean') {
                    arrCGestion.value = response;
                }

                itemEditable.value.cod_cgestion = '';
            }
        );

        return {
            itemEditable,
            arrCampus,
            arrAreas,
            arrCGestion,
            showModal,
        };
    },
    methods: {
        accion(accion) {
            if (accion.accion === 'saveItem') {
                if (this.itemEditable.cantidad === 0) {
                    Swal.fire({
                        title: 'Error',
                        text: 'La cantidad debe ser mayor a 0',
                        icon: 'error',
                    });
                    return;
                }

                if (
                    this.itemEditable.cod_campus === '' ||
                    this.itemEditable.cod_area === '' ||
                    this.itemEditable.cod_cgestion === ''
                ) {
                    Swal.fire({
                        title: 'Error',
                        text: 'Debe seleccionar Campus, Área y Centro de Gestión',
                        icon: 'error',
                    });
                    return;
                }
            }
            this.$emit('accion', accion);
        },
    },
    template: html`
        <newModal :showModal="showModal" @accion="accion" idModal="editItem" sizeModal="modal-md">
            <template v-slot:body>
                <div class="col col-md-12">
                    <div class="form-group">
                        <inputDataList
                            id="campus"
                            :fieldsReturn="{idField: 'id', descripcionField: 'descripcion'}"
                            :list="arrCampus"
                            :msgItem="['descripcion']"
                            :value="{ idField:itemEditable.cod_campus,descripcionField: itemEditable.desc_campus}"
                            @changeDataList="itemEditable.cod_campus=$event.idField;itemEditable.desc_campus=$event.descripcionField"
                            itemValueOption="codigo"
                            key="campus"
                            label="Campus" />
                    </div>
                    <div class="form-group">
                        <inputDataList
                            id="area"
                            :fieldsReturn="{idField: 'codigo', descripcionField: 'descripcion'}"
                            :list="arrAreas"
                            :msgItem="['descripcion']"
                            :value="{ idField:itemEditable.cod_area,descripcionField: itemEditable.desc_area}"
                            @changeDataList="itemEditable.cod_area=$event.idField;itemEditable.desc_area=$event.descripcionField"
                            itemValueOption="codigo"
                            key="area"
                            label="Área" />
                    </div>
                    <div class="form-group">
                        <inputDataList
                            id="cg"
                            :fieldsReturn="{idField: 'codigo', descripcionField: 'descripcion'}"
                            :list="arrCGestion"
                            :msgItem="['descripcion']"
                            :value="{ idField:itemEditable.cod_cgestion,descripcionField: itemEditable.desc_cgestion}"
                            @changeDataList="itemEditable.cod_cgestion=$event.idField;itemEditable.desc_cgestion=$event.descripcionField"
                            itemValueOption="codigo"
                            key="cg"
                            label="C.Gestión" />
                    </div>
                    <div class="form-group">
                        <label for="cantidad">Cantidad</label>
                        <input
                            id="cantidad"
                            type="number"
                            class="form-control"
                            v-model.Number="itemEditable.cantidad" />
                    </div>
                </div>
            </template>

            <template v-slot:footer>
                <button type="button" class="btn btn-primary" @click="accion({accion: 'closeModal'})">Cerrar</button>
                <button type="button" class="btn btn-success" @click="accion({accion: 'saveItem', item: itemEditable})">
                    Guardar
                </button>
            </template>
        </newModal>
    `,
});
Vue.component('searchSOB', {
    components: { newModal },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const showModal = Vue.computed(() => props.showModal);
        const refreshData = Vue.ref(false);
        const otherFilters = Vue.ref('');
        return {
            showModal,
            refreshData,
            otherFilters,
        };
    },
    methods: {
        accion(accion) {
            this.$emit('accion', accion);
        },
    },
    template: html`
        <newModal :showModal="showModal" @accion="accion" idModal="searchSOB" sizeModal="modal-xl">
            <template v-slot:title>Plantillas Solicitud</template>
            <template v-slot:body>
                <div class="col col-md-12">
                    <customTable
                        id="masterTipoCompra"
                        :externalFilters="otherFilters"
                        :refresh="refreshData"
                        @accion="accion"
                        key="masterTipoCompra"
                        titleTable=""
                        url="/api/getPlantillaSOBDistribuidaPaginate"></customTable>
                </div>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-primary" @click="accion({accion: 'closeModal'})">Cerrar</button>
            </template>
        </newModal>
    `,
});

const _appSOBDistribuida = new Vue({
    el: '#ppal',
    setup() {
        const index_SOB = Vue.ref('0');
        const arrCampus = Vue.ref([]);

        Vue.provide('arrCampus', arrCampus);

        const encabezado = Vue.reactive({
            id_tipocodigo: '',
            codigo: '',
            descripcion: '',
            cod_bodega: '',
            valor: 0,
            observacion: '',
            desc_sob: '',
            plantilla: false,
            id_plantilla: 0,
        });
        Vue.provide('encabezado', encabezado);

        Vue.provide('index_SOB', {
            index_SOB: Vue.readonly(index_SOB),
            setIndexSOB: value => {
                index_SOB.value = value;
            },
        });

        Vue.onMounted(async () => {
            const indexSOB = ($dom('#idSolicitud') as HTMLInputElement).value;
            index_SOB.value = indexSOB;

            const response = await fecthCampus();
            arrCampus.value = response;
        });

        return {
            index_SOB,
        };
    },
    template: html`
        <div>
            <crumb />
            <!-- Main content -->
            <div class="content">
                <div class="container-fluid">
                    <ppal />
                </div>
            </div>
        </div>
    `,
});
