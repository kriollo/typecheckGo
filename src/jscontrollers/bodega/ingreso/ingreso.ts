import { $dom } from '@/jscontrollers/composables/dom-selector';
import {
    fecthCampus,
    fetchBodegas,
    fetchGetAreas,
    fetchGetProductos,
    fetchgetProveedores,
    fetchGetTipoCodigo,
    fetchGetTipoDocumento,
} from '@/jscontrollers/composables/fetching';
import { FALSE, getDiaActual, pasarella, show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { usePPalStore } from '@/jscontrollers/usePPalStore.js';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm.js';

import dropzone from '@/jscontrollers/components/dropZone';
import newModal from '@/jscontrollers/components/newModal';
import uploadFileExcel from '@/jscontrollers/components/uploadFileExcel.js';

/* eslint-disable */
const dz = dropzone;
const ue = uploadFileExcel;
/* eslint-enable */

Vue.component('btnfindpreingreso', {
    setup() {
        const showModal = Vue.ref(false);

        return {
            showModal,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                showModal: () => {
                    this.showModal = true;
                },
                closeModal: () => {
                    this.showModal = false;
                },
                SendPreIngreso: () => {
                    this.$emit('accion', accion);
                },
            };
            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
    },
    template: `
        <div class="m-0 p-0 d-inline">
            <button type="button" class="btn btn-info btn-sm" @click="accion({'accion':'showModal'})" title="Buscar Pre Ingreso">
                <i class="fa fa-binoculars"></i>
            </button>
            <findpreingreso :showModal="showModal" @accion="accion" key="findPreIngreso" />
        </div>
    `,
});

Vue.component('findpreingreso', {
    components: { newModal },
    props: {
        showModal: {
            type: Boolean,
            required: true,
        },
    },
    setup(props) {
        const showModal = Vue.computed(() => props.showModal);
        const functionsPasarella = Vue.computed(() => usePPalStore.state.functionsPasarella);

        const getFindPreIngreso = async () => {
            const response = await versaFetch({
                url: '/api/getFindPreIngreso',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            return response;
        };

        const getPreIngreso = async (/** @type {Number} */ id) => {
            const response = await versaFetch({
                url: '/api/get_bodega_preingresoById',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ id: id }),
            });
            return response;
        };

        return {
            showModal,
            getFindPreIngreso,
            functionsPasarella,
            getPreIngreso,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                closeModal: () => {
                    this.$emit('accion', accion);
                },
                SendPreIngreso: () => {
                    this.$emit('accion', accion);
                },
            };
            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        loadTableFindPreIngreso() {
            this.getFindPreIngreso().then((/** @type {Object} */ response) => {
                if ($('#tblFindPreIngreso').find('tr').children().length > 0) {
                    $('#tblFindPreIngreso').find('tr').children().remove();
                    $('#tblFindPreIngreso').find('tbody').remove();
                    $('#tblFindPreIngreso').DataTable().destroy();
                    $('#tblFindPreIngreso').empty();
                }
                $('#tblFindPreIngreso').DataTable({
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
                    columnDefs: response.encabezado,
                    columns: [
                        { data: 'ndoc' },
                        { data: 'fecha' },
                        { data: 'nombre' },
                        { data: 'desc_campus' },
                        { data: 'desc_area' },
                        {
                            data: 'id',
                            render: data => html`
                                <button
                                    type="button"
                                    class="btn btn-primary btn-xs btn-sm"
                                    data-value='{"accion":"getPreIngreso","id":${data}}'
                                    name="pasarella">
                                    <i class="fa fa-download"></i>
                                </button>
                            `,
                        },
                    ],
                    data: response.data,
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
                });
                $('#tblFindPreIngreso').DataTable().columns.adjust().draw();
            });
        },
        loadPreIngreso(/** @type {Number} */ id) {
            this.getPreIngreso(id).then((/** @type {Object} */ response) => {
                if (response !== false) {
                    this.accion({
                        accion: 'SendPreIngreso',
                        preIngreso: response,
                    });
                    this.accion({ accion: 'closeModal' });
                }
            });
        },
    },
    watch: {
        showModal(val) {
            if (val) {
                this.loadTableFindPreIngreso();
            }
        },
        functionsPasarella(/** @type {{accion: String; id: Number}} */ val) {
            if (val !== null && val !== undefined) {
                const actions = {
                    getPreIngreso: () => this.loadPreIngreso(val.id),
                };
                const selectedAction = actions[val.accion] || actions['default'];
                if (typeof selectedAction === 'function') {
                    selectedAction();
                }
            }
        },
    },
    template: html`
        <newModal
            :showModal="showModal"
            @accion="accion"
            idModal="findPreIngresoModal"
            key="modalFindPreIngreso"
            size="max-w-7xl">
            <template v-slot:title>Buscar Pre Ingreso</template>
            <template v-slot:body>
                <div class="col col-md-12">
                    <table id="tblFindPreIngreso" class="table table-responsive-md"></table>
                </div>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-secondary" @click="accion({accion:'closeModal'})">Cerrar</button>
            </template>
        </newModal>
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
        const idDoc = Vue.computed(() => props.iddoc);
        const FileAsociado = Vue.computed(() => props.file);
        const showModal = Vue.ref(false);
        const typeFiles = Vue.computed(() => usePPalStore.state.FileTypeValid);
        const showModalUploadExcel = Vue.inject('showModalUploadExcel');

        const message = Vue.ref('Cargar Documento');
        Vue.watch(FileAsociado, (/** @type {Object} */ val) => {
            if (val) {
                message.value = 'Actualizar Documento';
            } else {
                message.value = 'Cargar Documento';
            }
        });

        const deleteFileDOC = async (/** @type {Number} */ id) => {
            const response = await versaFetch({
                url: '/api/deleteFileDOC',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ id: id }),
            });
            return response;
        };

        return {
            idDoc,
            showModal,
            FileAsociado,
            message,
            typeFiles,
            deleteFileDOC,
            showModalUploadExcel,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                showModal: () => {
                    this.showModal = true;
                },
                closeModal: () => {
                    this.showModal = false;
                },
                addFiles: () => {
                    this.$emit('accion', accion);
                    this.showModal = false;
                },
                deleteFile: () => this.deleteFile(this.FileAsociado),
                closeModalUploadFileExcel: () => {
                    this.showModalUploadExcel = false;
                },
                loadExcel: () => {
                    this.$emit('accion', accion);
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
                const accion = {
                    accion: 'addFiles',
                    file: {},
                };
                this.$emit('accion', accion);
            } else {
                this.deleteFileDOC(params.id).then((/** @type {Object} */ response) => {
                    if (response.success === 1) {
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
            <div class="d-flex justify-content-between">
                <button type="button" class="btn btn-primary btn-xs btn-sm mr-1" @click="accion({accion:'showModal'})">
                    <i class="fa fa-upload"></i>
                    {{ message }}
                </button>
                <button
                    type="button"
                    class="btn btn-danger btn-xs btn-sm"
                    @click="accion({accion:'deleteFile'})"
                    v-if="FileAsociado?.archivo !== undefined">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
            <newModal :showModal="showModal" @accion="accion" idModal="modalFacturaAsociada" key="modalFacturaAsociada">
                <template v-slot:title>Factura Asociada</template>
                <template v-slot:body>
                    <dropZone @accion="accion" key="dropZoneModalFacAsocuiada" />
                </template>
                <template v-slot:footer>
                    <button type="button" class="btn btn-secondary" @click="accion({accion:'closeModal'})">
                        Cerrar
                    </button>
                </template>
            </newModal>
            <uploadFileExcel
                :showModal="showModalUploadExcel"
                @accion="accion"
                from="uploadFileExcel"
                key="uploadFileExcel" />
        </div>
    `,
});

const _appINGBOD = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    data() {
        return {
            array_proveedor: [],
            array_tipodocumento: [],
            array_campus: [],
            array_area: [],
            array_tipocodigo: [],
            array_codigo: [],
            array_bodega: [],
            array_doc_ingreso: {
                rut_proveedor: '',
                nombre: '',
                cod_tipodocumento: '',
                desc_tipodocumento: '',
                ndoc: '',
                ordencompra: '',
                fecha: '',
                cod_campus: '',
                desc_campus: '',
                cod_area: '',
                desc_area: '',
                observacion: '',
                origen: 'directo',
                id_preingreso: 0,
                ocsap: '',
                id_tipo_compra: 0,
            },
            array_items: [],
            modal_accion: 'new',
            edit_index: '',
            array_hojas: [],
            total_doc: 0,
            index_doc: 0,
            fileAsociado: {},
        };
    },
    store: usePPalStore,
    setup() {
        const showModalUploadExcel = Vue.ref(false);
        const arrTipoCompra = Vue.ref([]);

        Vue.provide('showModalUploadExcel', showModalUploadExcel);
        return {
            showModalUploadExcel,
            arrTipoCompra,
        };
    },
    mounted: async function () {
        const load_tipoCompra = async () => {
            const reponse = await versaFetch({
                url: '/api/getMasterTipoCompraPaginate?page=1&per_page=10000000&filter=&order=descripcion,asc&externalFilters=estado=1',
                method: 'POST',
            });
            return reponse;
        };

        await Promise.all([
            fetchgetProveedores({ estado: '1' }),
            fecthCampus(),
            fetchGetTipoCodigo(),
            fetchBodegas({ estado: 1 }),
            fetchGetTipoDocumento({ estado: 1 }),
            load_tipoCompra(),
        ])
            .then(values => {
                const responseProveedor = values[0];
                const responseCampus = values[1];
                const responseTipoCodigo = values[2];
                const responseBodegas = values[3];
                const responseTipoDocumento = values[4];

                if (responseProveedor.data !== false)
                    responseProveedor.forEach(item => {
                        this.array_proveedor.push({
                            text: item.rut,
                            value: item.nombre,
                            selected: false,
                        });
                    });

                if (responseCampus.data !== false)
                    responseCampus.forEach(item => {
                        this.array_campus.push({
                            descripcion: item.descripcion,
                            id: item.id,
                        });
                    });

                if (responseBodegas.data !== false)
                    responseBodegas.forEach(item => {
                        this.array_bodega.push({
                            value: item.descripcion,
                            id: item.codigo,
                        });
                    });

                if (responseTipoCodigo.data !== false)
                    responseTipoCodigo.forEach(item => {
                        this.array_tipocodigo.push({
                            value: item.descripcion,
                            id: item.id,
                        });
                    });

                if (responseTipoDocumento.data !== false)
                    responseTipoDocumento.forEach(item => {
                        this.array_tipodocumento.push({
                            text: item.descripcion,
                            codigo: item.id,
                        });
                    });

                if (values[5].data !== false) {
                    this.arrTipoCompra = values[5].data;
                }
            })
            .catch(error => {
                show_toast('Error', error, 'Error', 'error');
            });
        this.array_doc_ingreso.fecha = getDiaActual();

        this.index_doc = $('#index_doc').val();
        if (this.index_doc !== '0') {
            await this.load_doc_ingreso(this.index_doc);
        }
    },
    methods: {
        ...Vuex.mapMutations(['SET_FUNCTIONS_PASARELLA']),
        modal_agregar_item: function () {
            this.limpiar_modal();
            this.modal_accion = 'new';
            $('#modal_agregar_item').modal('show');
        },
        limpiar_tabla: async function () {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de limpiar el detalle ingresado?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });

            if (result.isConfirmed) {
                this.array_items = [];
            }
        },
        find_bodega_ingreso: async function () {
            this.index_doc = 0;

            const proveedor = $('#proveedor').val();
            const tipodocumento = $('#tipodocumento').val();
            const folio = $('#folio').val();

            const FormD = new FormData();
            FormD.append('tipo_doc', String(tipodocumento).trim());
            FormD.append('ndoc', String(folio).trim());
            FormD.append('proveedor', String(proveedor).trim());

            if (proveedor === '' || tipodocumento === '' || folio === '') {
                return;
            }

            const json = await versaFetch({
                url: '/api/find_bodega_ingreso',
                method: 'POST',
                data: FormD,
            });

            this.edit_index = json['find'];
            this.index_doc = Number(json['id']);

            this.fileAsociado = json['archivo'] === false ? {} : json['archivo'][0];
        },
        modal_cargaexcel: function () {
            this.showModalUploadExcel = true;
        },
        load_excel_base: async function (e) {
            const { data, primeraLinea } = e;

            if (data.length === 0) {
                show_toast('Carga Masiva', 'No se encontraron registros en el archivo', 'Warning', 'warning');
                return;
            }

            const FormD = new FormData();
            FormD.append('encabezado', primeraLinea ? '1' : '0');
            FormD.append('items', JSON.stringify(data));

            const json = await versaFetch({
                url: '/api/cargar_masiva_bodega_ingreso',
                method: 'POST',
                data: FormD,
            });

            this.showModalUploadExcel = false;
            if (json.success === 1) {
                show_toast('Carga Masiva', json.message, 'Success', 'success');

                this.array_items = [];
                this.array_doc_ingreso = {
                    rut_proveedor: '',
                    nombre: '',
                    cod_tipodocumento: '',
                    desc_tipodocumento: '',
                    ndoc: '',
                    fecha: '',
                    cod_campus: '',
                    desc_campus: '',
                    cod_area: '',
                    desc_area: '',
                    observacion: '',
                    origen: 'directo',
                    id_preingreso: 0,
                    ocsap: '',
                    id_tipo_compra: 0,
                };

                this.array_doc_ingreso = json.encabezado;

                if (typeof json.detalle !== 'boolean') {
                    this.array_items = json.detalle;
                }
            } else {
                show_toast('Carga Masiva', json.message, 'Warning', 'warning');
            }
        },
        update_Valor: function () {
            const valor = $('#valor').val() === '' ? 0 : $('#valor').val();
            const cantidad = $('#cantidad').val() === '' ? 0 : $('#cantidad').val();

            const totallinea = Number(valor) * Number(cantidad);
            $('#totallinea').val(totallinea.toFixed(2));
        },
        save_new_item: function () {
            const cod_tipocodigo = $('#tipocodigo').val();
            const codigo = $('#codigo').val();
            const codigo_bodega = $('#bodega').val();

            const valor = Number($('#valor').val());
            const cantidad = Number($('#cantidad').val());
            const totallinea = $('#totallinea').val();

            let error = false;

            if (cod_tipocodigo === '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un tipo de codigo');
                error = true;
            }
            if (codigo === '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un producto');
                error = true;
            }
            if (codigo_bodega === '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una bodega de destino');
                error = true;
            }
            if (isNaN(valor) || valor === 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar valor de nuevo item');
                error = true;
            }
            if (isNaN(cantidad) || cantidad === 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar cantidad de nuevo item');
                error = true;
            }

            if (FALSE === error) {
                this.array_items.push({
                    cod_tipocodigo: cod_tipocodigo,
                    desc_tipocodigo: $('#list_tipocodigo').val(),
                    codigo: codigo,
                    desc_codigo: $('#list_codigo').val(),
                    cod_bodega: codigo_bodega,
                    desc_bodega: $('#list_bodega').val(),
                    valor: valor,
                    cantidad: cantidad,
                    totallinea: totallinea,
                });
                $('#modal_agregar_item').modal('hide');
                this.limpiar_modal();
            }
        },
        load_edit_item: async function (index) {
            $('#tipocodigo').val(this.array_items[index].cod_tipocodigo);
            $('#list_tipocodigo').val(this.array_items[index].desc_tipocodigo);

            await this.cagar_codigos(
                this.array_items[index].cod_tipocodigo,
                this.array_items[index].codigo,
                this.array_items[index].desc_codigo
            );

            $('#bodega').val(this.array_items[index].cod_bodega);
            $('#list_bodega').val(this.array_items[index].desc_bodega);

            $('#cantidad').val(this.array_items[index].cantidad);
            $('#valor').val(this.array_items[index].valor);

            $('#totallinea').val(this.array_items[index].totallinea);

            this.modal_accion = 'edit';
            this.edit_index = index;

            $('#edit_index').val(index);
            setTimeout(function () {
                $('#modal_agregar_item').modal('show');
            }, 500);
        },
        remove_item: async function (index) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de eliminar este item?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                this.array_items.splice(index, 1);
            }
        },
        save_edit_item: function () {
            const cod_tipocodigo = $('#tipocodigo').val();
            const codigo = $('#codigo').val();
            const codigo_bodega = $('#bodega').val();

            const valor = Number($('#valor').val());
            const cantidad = Number($('#cantidad').val());
            const totallinea = $('#totallinea').val();

            let error = false;

            if (cod_tipocodigo === '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un tipo de codigo');
                error = true;
            }
            if (codigo === '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un producto');
                error = true;
            }
            if (codigo_bodega === '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una bodega de destino');
                error = true;
            }
            if (isNaN(valor) || valor === 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar valor de nuevo item');
                error = true;
            }
            if (isNaN(cantidad) || cantidad === 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar cantidad de nuevo item');
                error = true;
            }

            if (FALSE === error) {
                const index = this.edit_index;

                this.array_items[index].cod_tipocodigo = cod_tipocodigo;
                this.array_items[index].desc_tipocodigo = $('#list_tipocodigo').val();
                this.array_items[index].codigo = codigo;
                this.array_items[index].desc_codigo = $('#list_codigo').val();
                this.array_items[index].cod_bodega = codigo_bodega;
                this.array_items[index].desc_bodega = $('#list_bodega').val();
                this.array_items[index].valor = valor;
                this.array_items[index].cantidad = cantidad;
                this.array_items[index].totallinea = totallinea;

                // copiar mismo cod_bodega y desc_bodega desde el index actual hasta el ultimo
                for (let i = index; i < this.array_items.length; i++) {
                    if (this.array_items[i].cod_bodega === '') {
                        this.array_items[i].cod_bodega = codigo_bodega;
                        this.array_items[i].desc_bodega = $('#list_bodega').val();
                    }
                }

                $('#modal_agregar_item').modal('hide');
                this.limpiar_modal();
            }
        },
        save_doc_ingreso: async function (id) {
            const proveedor = $('#proveedor').val();
            const tipodocumento = $('#tipodocumento').val();
            const folio = $('#folio').val();
            const fecha = $('#fecha').val();
            const ordencompra = $('#ordencompra').val();

            const campus = $('#campus').val();
            const area = $('#area').val();

            const observacion = $('#observacion').val();

            let error = false;
            if (folio === '' || folio === 0) {
                show_toast('Ingresar Producto a Bodega', 'Debe ingresar Nº Documento');
                error = true;
            }
            if (tipodocumento === '') {
                show_toast('Ingresar Producto a Bodega', 'Debe ingresar Tipo de Documento');
                error = true;
            }
            if (proveedor === '') {
                show_toast('Ingresar Producto a Bodega', 'Debe ingresar Proveedor');
                error = true;
            }
            if (ordencompra === '') {
                show_toast('Ingresar Producto a Bodega', 'Debe ingresar Orden de compra');
                error = true;
            }

            if (campus === '') {
                show_toast('Ingresar Producto a Bodega', 'Debe seleccionar un Campues');
                error = true;
            }
            if (area === '') {
                show_toast('Ingresar Producto a Bodega', 'Debe seleccionar un Area');
                error = true;
            }

            if (observacion === '') {
                show_toast('Ingresar Producto a Bodega', 'Debe ingresar una observacion');
                error = true;
            }
            if (this.array_items.length <= 0) {
                show_toast('Ingresar Producto a Bodega', 'Debe ingresar a lo menos un item en el Documento Proveedor');
                error = true;
            }

            if (this.array_doc_ingreso.id_tipo_compra === 0) {
                show_toast('Ingresar Producto a Bodega', 'Debe seleccionar un tipo de compra');
                error = true;
            }

            this.array_items.forEach(item => {
                if (item.cod_bodega === '') {
                    show_toast('Ingresar Producto a Bodega', 'Debe seleccionar una bodega de destino');
                    error = true;
                    return FALSE;
                }
            });

            if (this.fileAsociado?.archivo === undefined) {
                show_toast(
                    'Ingresar Producto a Bodega',
                    'Recuerde que puede cargar el archivo fisico del documento',
                    'Alerta',
                    'warning'
                );
            }

            if (error === FALSE) {
                const FormD = new FormData();
                FormD.append('id', id);

                FormD.append('tipo_doc', String(tipodocumento).trim());
                FormD.append('desc_tipo_doc', String($('#list_tipodocumento').val()).trim());
                FormD.append('ndoc', String(folio).trim());
                FormD.append('ordencompra', String(ordencompra).trim());
                FormD.append('proveedor', String(proveedor).trim());
                FormD.append('nombre_proveedor', String($('#list_proveedor').val()).trim());
                FormD.append('fecha', String(fecha).trim());
                FormD.append('campus', String(campus).trim());
                FormD.append('area', String(area).trim());
                FormD.append('observacion', String(observacion).trim());
                FormD.append('valortotal', parseFloat(this.total_iva).toFixed(2));
                FormD.append('origen', this.array_doc_ingreso.origen);
                FormD.append('id_preingreso', this.array_doc_ingreso.id_preingreso);
                FormD.append('ocsap', this.array_doc_ingreso.ocsap);
                FormD.append('id_tipo_compra', this.array_doc_ingreso.id_tipo_compra);

                FormD.append('items', JSON.stringify(this.array_items));

                if (this.fileAsociado?.archivo !== undefined) {
                    FormD.append('dataFile', JSON.stringify(this.fileAsociado));
                    FormD.append('file', this.fileAsociado.file);
                }

                $('#btn_save').prop('disabled', true);

                const json = await versaFetch({
                    url: '/api/save_bodega_ingreso',
                    method: 'POST',
                    data: FormD,
                });

                if (json.success === 0) {
                    show_toast(json.title, json.message, 'warning', 'warning');
                    return;
                }
                show_toast(json.title, json.message, 'Success', 'success');

                const result = await Swal.fire({
                    title: 'Atención',
                    text: 'Desea generar pdf de ingreso?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Aceptar',
                    cancelButtonText: 'Cancelar',
                });
                if (result.isConfirmed) {
                    await this.generar_pdf(json.id);
                }

                setTimeout(function () {
                    location.href = '/bodega/ingresos';
                }, 1000);

                $('#btn_save').prop('disabled', false);
            }
        },
        generar_pdf: async function (id) {
            location.href = `/bodega/ingreso_pdf/${id}`;
        },
        load_doc_ingreso: async function (id) {
            const array_temp = {
                cod_tipodocumento: $('#tipodocumento').val(),
                desc_tipodocumento: $('#list_tipodocumento').val(),
                rut_proveedor: $('#proveedor').val(),
                nombre: $('#list_proveedor').val(),
                folion: $('#folio').val(),
            };

            this.array_items = [];
            this.array_doc_ingreso = {
                id: '0',
                cod_tipodocumento: array_temp.cod_tipodocumento,
                desc_tipodocumento: array_temp.desc_tipodocumento,
                rut_proveedor: array_temp.rut_proveedor,
                nombre: array_temp.nombre,
                ndoc: array_temp.folion,
                fecha: '',
                cod_campus: '',
                desc_campus: '',
                cod_area: '',
                desc_area: '',
                observacion: '',
                ordencompra: '',
                origen: 'directo',
                id_preingreso: 0,
                ocsap: '',
                id_tipo_compra: 0,
            };

            this.array_doc_ingreso.fecha = getDiaActual();

            const json = await versaFetch({
                url: '/api/get_bodega_ingresoById',
                method: 'POST',
                data: JSON.stringify({ id }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (typeof json !== 'boolean') {
                this.array_items = [];
                this.array_doc_ingreso = {
                    rut_proveedor: '',
                    nombre: '',
                    cod_tipodocumento: '',
                    desc_tipodocumento: '',
                    ndoc: '',
                    fecha: '',
                    cod_campus: '',
                    desc_campus: '',
                    cod_area: '',
                    desc_area: '',
                    observacion: '',
                    origen: 'directo',
                    id_preingreso: 0,
                    ocsap: '',
                    id_tipo_compra: 0,
                };

                this.edit_doc = true;
                this.index_doc = json.encabezado['id'];

                this.array_doc_ingreso = json.encabezado;

                if (json.detalle !== FALSE) {
                    this.array_items = json.detalle;
                }
            }
        },
        activarSearch: function () {
            if (parseInt($('#cActv').css('width')) > 0) {
                $('#cActv').animate({ width: 0 }, 350, 'linear', function () {
                    $('#cActv').css('border-radius', '0px');
                    $('#cActv').css('border', '0px solid #00a65a');
                    $('#cActv').css('padding', '0px');
                });
            } else {
                $('#cActv').css('border-radius', '20px');
                $('#cActv').css('border', '1px solid #3498db');
                $('#cActv').css('padding', '0px 12px 6px 35px');
                $('#cActv').animate({ width: 210 }, 350);
                const $cActv = $dom('#cActv');
                if ($cActv instanceof HTMLElement) {
                    $cActv.focus();
                }
            }
        },
        SearchDocByFolio: async function (e) {
            if (e.target.value !== '') {
                const id = e.target.value;

                const json = await versaFetch({
                    url: '/api/find_bodega_ingreso_byID',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ id }),
                });

                if (typeof json !== 'boolean') {
                    location.href = `/bodega/ingresos/${id}`;
                } else {
                    show_toast('Documento Proveedor', 'Folio NO encontrado, intente nuevamente', 'warning', 'warning');
                }
            }
        },
        getLastFolio: async function () {
            const json = await versaFetch({
                url: '/api/getLastIdIngreso',
                method: 'POST',
            });
            if (typeof json !== 'boolean') {
                this.array_doc_ingreso['ordencompra'] = json;
            }
        },
        obtener_select_item(tabla, selec, inp) {
            $(`#${selec}`).prop('disabled', true);
            const val = $(`#${selec}`).val();
            const list = $(`#${selec}`).attr('list');

            const elem = document.getElementById(list);
            const op = elem.querySelector(`option[value='${val}']`);
            let match = '0';
            if (op !== null) match = op.getAttribute('data-value2');
            else $(`#${selec}`).prop('disabled', false);

            $(`#${inp}`).val(match);

            if (match !== '') {
                let $elementFocus = null;
                switch (tabla) {
                    case 'proveedor':
                        this.array_doc_ingreso.rut_proveedor = match;
                        this.array_doc_ingreso.nombre = val;
                        $elementFocus = $dom('#list_tipodocumento');
                        break;
                    case 'tipodocumento':
                        this.array_doc_ingreso.cod_tipodocumento = match;
                        $elementFocus = $dom('#folio');
                        break;
                    case 'campus':
                        this.array_doc_ingreso.cod_campus = match;
                        this.array_doc_ingreso.desc_campus = val;
                        this.cagar_areas(match);

                        $elementFocus = $dom('#list_area');
                        break;
                    case 'area':
                        this.array_doc_ingreso.cod_area = match;
                        this.array_doc_ingreso.desc_area = val;

                        $elementFocus = $dom('#observacion');
                        break;
                    case 'tipocodigo':
                        this.cagar_codigos(match);
                        $elementFocus = $dom('#list_codigo');
                        break;
                    case 'codigo':
                        $elementFocus = $dom('#cantidad');
                        break;
                }

                if ($elementFocus instanceof HTMLElement) {
                    $elementFocus.focus();
                }
            }
            $(`#${selec}`).prop('disabled', false);
        },
        async cagar_areas(codigo) {
            this.array_area = [];
            $('#list_area').prop('disabled', true);
            $('#list_area').val('');
            $('#area').val(0);
            this.array_doc_ingreso.cod_area = 0;
            this.array_doc_ingreso.desc_area = '';

            const data = await fetchGetAreas(codigo);
            if (typeof data !== 'boolean') {
                this.array_area = data;
                $('#list_area').prop('disabled', false);
                const $listArea = document.querySelector('#list_area');
                if ($listArea instanceof HTMLElement) {
                    $listArea.focus();
                }
            }
        },
        async cagar_codigos(tipocodigo, codigo, desc_codigo) {
            this.array_codigo = [];
            $('#list_codigo').prop('disabled', true);
            $('#list_codigo').val('');
            $('#codigo').val(0);

            const data = await fetchGetProductos(tipocodigo);
            if (typeof data !== 'boolean') {
                this.array_codigo = data;
                $('#list_codigo').prop('disabled', false);
                const $listCodigo = document.querySelector('#list_codigo');
                if ($listCodigo instanceof HTMLElement) {
                    $listCodigo.focus();
                }

                if (codigo !== '') {
                    $('#list_codigo').val(desc_codigo);
                    $('#codigo').val(codigo);
                    const $codigo = document.querySelector('#codigo');
                    if ($codigo instanceof HTMLElement) {
                        $codigo.focus();
                    }
                }
            }
        },
        limpiar_modal() {
            $('#codigo').val('');
            $('#list_codigo').val('');
            $('#cantidad').val('');
            $('#valor').val('');
            $('#valortotal').val('');
        },
        accion(accion) {
            const actions = {
                addFiles: () => {
                    this.fileAsociado = accion.files;
                },
                SendPreIngreso: () => this.load_doc_preingreso(accion.preIngreso),
                loadExcel: () => this.load_excel_base(accion),
            };
            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        pasarella(param) {
            this.SET_FUNCTIONS_PASARELLA(param);
        },
        load_doc_preingreso(json) {
            const ocsap = $dom('#ocsap');
            if (ocsap instanceof HTMLInputElement) {
                ocsap.setAttribute('disabled', 'disabled');
            }

            this.edit_doc = false;
            this.index_doc = 0;

            this.array_doc_ingreso = json.encabezado;
            this.array_doc_ingreso.fecha = getDiaActual();
            this.array_doc_ingreso.ordencompra = json.encabezado.ndoc;
            this.array_doc_ingreso.ndoc = '';
            this.array_doc_ingreso['origen'] = 'preingreso';
            this.array_doc_ingreso['id_preingreso'] = json.encabezado.id;

            delete this.array_doc_ingreso['id'];

            if (json.detalle !== FALSE) {
                const result = json.detalle.filter(item => Number(item.cantidad) - Number(item.utilizado) > 0);
                if (result.length > 0) {
                    this.array_items = JSON.parse(JSON.stringify(result));
                } else {
                    this.array_items = [];
                }

                this.array_items.forEach(item => {
                    item.cantidad = Number(item.cantidad) - Number(item.utilizado);
                    item.totallinea = Number(item.cantidad) * Number(item.valor);
                });
            }
        },
    },
    computed: {
        ...Vuex.mapState(['owner_user', 'FileTypeValid', 'IVA']),
        sumar_items() {
            let total = 0;
            for (const item of this.array_items) {
                total += item.cantidad * item.valor;
            }
            return total;
        },
        iva() {
            return parseFloat(this.sumar_items) * parseFloat(this.IVA);
        },
        total_iva() {
            return parseFloat(this.sumar_items) + parseFloat(this.iva);
        },
    },
});

document.addEventListener('click', function (event) {
    pasarella(_appINGBOD, event);
});
