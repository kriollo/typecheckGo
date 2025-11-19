import { $dom } from '@/jscontrollers/composables/dom-selector';
import {
    fecthCampus,
    fetchGetAreas,
    fetchGetProductos,
    fetchgetProveedores,
    fetchGetTipoCodigo,
} from '@/jscontrollers/composables/fetching';
import { getDiaActual, show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { usePPalStore } from '@/jscontrollers/usePPalStore.js';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { ref, computed, watch, inject, provide } = Vue;

import newModal from '@/jscontrollers/components/newModal';
import uploadFileExcel from '@/jscontrollers/components/uploadFileExcel.js';
import type { AccionData, actionsType } from 'versaTypes';
/* eslint-disable */
const ue = uploadFileExcel;
/* eslint-enable */

Vue.component('labelstatus', {
    props: {
        arraydocingreso: {
            type: Object,
            default: {
                name: '',
                created_at: '',
            },
        },
        indexdoc: {
            type: Number,
            default: 0,
        },
    },
    setup(props) {
        const arrayDocIngresoS = computed(() => props.arraydocingreso);
        const indexDoc_s = computed(() => props.indexdoc);

        const showModalUploadExcel = inject('showModalUploadExcel');

        return {
            arrayDocIngresoS,
            indexDoc_s,
            showModalUploadExcel,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
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
    },
    template: html`
        <label>
            <uploadFileExcel
                :showModal="showModalUploadExcel"
                @accion="accion"
                from="uploadFileExcel"
                key="uploadFileExcel" />
            <h6 v-if="indexDoc_s != 0">
                <span class="text-info">Folio:{{ indexDoc_s }}</span>
                - Creado por: {{ arrayDocIngresoS?.name }} - Fecha Registro: {{ arrayDocIngresoS?.created_at }}
            </h6>
        </label>
    `,
});

Vue.component('docasociado', {
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

        const deleteFileDOC = async (/** @type {Number} */ id: number) => {
            const response = await versaFetch({
                url: '/api/delete_file_preingreso',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ id }),
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
            file,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion: AccionData) {
            const actions: actionsType = {
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
        saveDocumentoDirect() {
            const accion = {
                accion: 'saveDocumentoDirect',
                file: this.FileAsociado,
            };
            this.$emit('accion', accion);
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
                <button
                    type="button"
                    class="btn btn-success btn-xs btn-sm"
                    @click="saveDocumentoDirect"
                    title="Guardar Archivo"
                    v-if="FileAsociado?.archivo !== undefined && idDoc !== 0">
                    <i class="fa fa-save"></i>
                </button>
            </div>
            <newModal :showModal="showModal" @accion="accion" idModal="modalFacturaAsociada">
                <template v-slot:title>OC SAP Asociada</template>
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

const _appPreIngreso = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    data: function () {
        return {
            array_proveedor: [],
            array_campus: [],
            array_area: [],
            array_tipocodigo: [],
            array_codigo: [],
            array_doc_ingreso: {
                rut_proveedor: '',
                nombre: '',
                ndoc: '',
                fecha: '',
                cod_campus: '',
                desc_campus: '',
                cod_area: '',
                desc_area: '',
                observacion: '',
                created_at: '',
                ocsap: '',
            },
            array_items: [],
            modal_accion: 'new',
            edit_index: '',
            array_hojas: [],
            array_data: [],
            total_doc: 0,
            index_doc: 0,
            fileAsociado: {},
        };
    },
    store: usePPalStore,
    setup() {
        const showModalUploadExcel = ref(false);

        provide('showModalUploadExcel', showModalUploadExcel);

        return {
            showModalUploadExcel,
        };
    },
    mounted: function () {
        Promise.all([fetchgetProveedores({ estado: '1' }), fecthCampus(), fetchGetTipoCodigo()])
            .then(values => {
                const responseProveedor = values[0];
                const responseCampus = values[1];
                const responseTipoCodigo = values[2];

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

                if (responseTipoCodigo.data !== false)
                    responseTipoCodigo.forEach(item => {
                        this.array_tipocodigo.push({
                            value: item.descripcion,
                            id: item.id,
                        });
                    });
            })
            .catch(error => {
                show_toast('Error', error, 'Error', 'error');
            });

        this.array_doc_ingreso.fecha = getDiaActual();

        this.index_doc = Number($('#index_doc').val());
        if (this.index_doc != 0) {
            this.load_doc_ingreso(this.index_doc);
        }
    },
    methods: {
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
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
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
            const folio = $('#folio').val();

            const FormD = new FormData();
            FormD.append('ndoc', String(folio).trim());
            FormD.append('proveedor', String(proveedor).trim());

            if (proveedor == '' || folio == '') {
                return;
            }

            const json = await versaFetch({
                url: '/api/find_bodega_preingreso',
                method: 'POST',
                data: FormD,
            });

            this.edit_index = json['find'];
            this.index_doc = json['id'];
        },
        modal_cargaexcel: function () {
            this.showModalUploadExcel = true;
        },
        load_excel_base: async function (e) {
            const { data } = e;

            if (data.length === 0) {
                show_toast('Carga Masiva', 'No se encontraron datos en el archivo', 'Warning', 'warning');
            }

            const FormD = new FormData();
            FormD.append('encabezado', '0');
            FormD.append('items', JSON.stringify(data));

            const json = await versaFetch({
                url: '/api/cargar_masiva_bodega_preingreso',
                method: 'POST',
                data: FormD,
            });

            this.showModalUploadExcel = false;
            if (json.success == 1) {
                show_toast('Carga Masiva', json.message, 'Success', 'success');

                this.array_items = [];
                this.array_doc_ingreso = {
                    rut_proveedor: '',
                    nombre: '',
                    ndoc: '',
                    fecha: '',
                    cod_campus: '',
                    desc_campus: '',
                    cod_area: '',
                    desc_area: '',
                    observacion: '',
                    ocsap: '',
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
            const valor = $('#valor').val() == '' ? 0 : $('#valor').val();
            const cantidad = $('#cantidad').val() == '' ? 0 : $('#cantidad').val();

            const totallinea = Number(valor) * Number(cantidad);
            $('#totallinea').val(totallinea.toFixed(2));
        },
        save_new_item: function () {
            const cod_tipocodigo = $('#tipocodigo').val();
            const codigo = $('#codigo').val();
            const valor = $('#valor').val();
            const cantidad = $('#cantidad').val();
            const totallinea = $('#totallinea').val();

            let error = false;

            if (cod_tipocodigo == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un tipo de codigo', 'Error', 'danger');
                error = true;
            }
            if (codigo == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un producto', 'Error', 'danger');
                error = true;
            }
            if (valor == '' || valor == 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar valor de nuevo item', 'Error', 'danger');
                error = true;
            }
            if (cantidad == '' || cantidad == 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar cantidad de nuevo item', 'Error', 'danger');
                error = true;
            }

            if (!error) {
                this.array_items.push({
                    cod_tipocodigo: cod_tipocodigo,
                    desc_tipocodigo: $('#list_tipocodigo').val(),
                    codigo: codigo,
                    desc_codigo: $('#list_codigo').val(),
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
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (!result.isConfirmed) return;
            this.array_items.splice(index, 1);
        },
        save_edit_item: function () {
            const cod_tipocodigo = $('#tipocodigo').val();
            const codigo = $('#codigo').val();
            const valor = $('#valor').val();
            const cantidad = $('#cantidad').val();
            const totallinea = $('#totallinea').val();

            let error = false;

            if (cod_tipocodigo == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un tipo de codigo');
                error = true;
            }
            if (codigo == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un producto');
                error = true;
            }
            if (valor == '' || valor == 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar valor de nuevo item');
                error = true;
            }
            if (cantidad == '' || cantidad == 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar cantidad de nuevo item');
                error = true;
            }

            if (!error) {
                const index = this.edit_index;

                this.array_items[index].cod_tipocodigo = cod_tipocodigo;
                this.array_items[index].desc_tipocodigo = $('#list_tipocodigo').val();
                this.array_items[index].codigo = codigo;
                this.array_items[index].desc_codigo = $('#list_codigo').val();
                this.array_items[index].valor = valor;
                this.array_items[index].cantidad = cantidad;
                this.array_items[index].totallinea = totallinea;

                $('#modal_agregar_item').modal('hide');
                this.limpiar_modal();
            }
        },
        save_doc_ingreso: async function (id) {
            const proveedor = $('#proveedor').val();
            const folio = $('#folio').val();
            const fecha = $('#fecha').val();

            const campus = $('#campus').val();
            const area = $('#area').val();

            const observacion = $('#observacion').val();
            const ocsap = $('#ocsap').val();

            let error = false;
            if (folio == '' || folio == 0) {
                show_toast('Pre igreso Producto a Bodega', 'Debe ingresar Nº Documento');
                error = true;
            }
            if (proveedor == '') {
                show_toast('Pre igreso Producto a Bodega', 'Debe ingresar Proveedor');
                error = true;
            }

            if (campus == '') {
                show_toast('Pre igreso Producto a Bodega', 'Debe seleccionar un Campues');
                error = true;
            }
            if (area == '') {
                show_toast('Pre igreso Producto a Bodega', 'Debe seleccionar un Area');
                error = true;
            }

            if (observacion == '') {
                show_toast('Pre igreso Producto a Bodega', 'Debe ingresar una observacion');
                error = true;
            }
            if (this.array_items.length <= 0) {
                show_toast(
                    'Pre igreso Producto a Bodega',
                    'Debe ingresar a lo menos un item en el Documento Proveedor'
                );
                error = true;
            }

            if (this.fileAsociado?.archivo === undefined) {
                show_toast(
                    'Pre igreso Producto a Bodega',
                    'Recuerde que puede cargar el archivo fisico de la OC SAP',
                    'Alerta',
                    'warning'
                );
            }

            if (!error) {
                const FormD = new FormData();
                FormD.append('id', id);

                FormD.append('ndoc', String(folio).trim());
                FormD.append('proveedor', String(proveedor).trim());
                FormD.append('nombre_proveedor', String($('#list_proveedor').val()).trim());
                FormD.append('fecha', String(fecha).trim());
                FormD.append('campus', String(campus).trim());
                FormD.append('area', String(area).trim());
                FormD.append('observacion', String(observacion).trim());
                FormD.append('valortotal', parseFloat(this.total_iva).toFixed(2));
                FormD.append('ocsap', String(ocsap).trim());

                FormD.append('items', JSON.stringify(this.array_items));

                if (this.fileAsociado?.archivo !== undefined) {
                    FormD.append('dataFile', JSON.stringify(this.fileAsociado));
                    FormD.append('file', this.fileAsociado.file);
                }

                const json = await versaFetch({
                    url: '/api/save_bodega_preingreso',
                    method: 'POST',
                    data: FormD,
                });
                if (json.success == 0) {
                    show_toast(json.title, json.message, 'warning', 'warning');
                    return;
                }
                show_toast(json.title, json.message, 'Success', 'success');

                const result = await Swal.fire({
                    title: 'Atención',
                    text: 'Desea generar pdf de pre-ingreso?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Aceptar',
                    cancelButtonText: 'Cancelar',
                });
                if (result.isConfirmed) {
                    this.generar_pdf(json.id);
                }
                setTimeout(function () {
                    location.href = '/bodega/pre_ingreso';
                }, 1000);
            }
        },
        generar_pdf: function (id) {
            location.href = `/bodega/pre_ingreso_pdf/${id}`;
        },
        load_doc_ingreso: async function (id) {
            const array_temp = {
                rut_proveedor: $('#proveedor').val(),
                nombre: $('#list_proveedor').val(),
                folion: $('#folio').val(),
            };

            this.array_items = [];
            this.array_doc_ingreso = {
                id: '0',
                rut_proveedor: array_temp.rut_proveedor,
                nombre: array_temp.nombre,
                ndoc: array_temp.folion,
                fecha: '',
                cod_campus: '',
                desc_campus: '',
                cod_area: '',
                desc_area: '',
                observacion: '',
                estado: '1',
                ocsap: '',
            };
            this.fileAsociado = {};

            this.array_doc_ingreso.fecha = getDiaActual();

            const json = await versaFetch({
                url: '/api/get_bodega_preingresoById',
                method: 'POST',
                data: JSON.stringify({ id }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (typeof json.encabezado != 'boolean') {
                this.array_items = [];
                this.array_doc_ingreso = {
                    rut_proveedor: '',
                    nombre: '',
                    ndoc: '',
                    fecha: '',
                    cod_campus: '',
                    desc_campus: '',
                    cod_area: '',
                    desc_area: '',
                    observacion: '',
                    estado: '1',
                    ocsap: '',
                };

                this.edit_doc = true;

                this.fileAsociado = json['archivo'] === false ? {} : json['archivo'][0];

                this.index_doc = json.encabezado['id'];

                this.array_doc_ingreso = json.encabezado;

                if (typeof json.detalle != 'boolean') {
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
            if (e.target.value != '') {
                const id = e.target.value;

                const json = await versaFetch({
                    url: '/api/find_bodega_preingreso_byID',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ id }),
                });

                if (typeof json != 'boolean') {
                    location.href = `/bodega/pre_ingreso/${id}`;
                } else {
                    show_toast('Pre Ingreso a Bodega', 'Folio NO encontrado, intente nuevamente', 'warning', 'warning');
                }
            }
        },
        obtener_select_item(tabla, selec, inp) {
            $(`#${selec}`).prop('disabled', true);
            const val = $(`#${selec}`).val();
            const list = $(`#${selec}`).attr('list');

            const elem = document.getElementById(list);
            const op = elem.querySelector(`option[value='${val}']`);
            let match = '0';
            if (op != null) match = op.getAttribute('data-value2');
            else $(`#${selec}`).prop('disabled', false);

            $(`#${inp}`).val(match);

            if (match != '') {
                let $elementFocus = null;
                switch (tabla) {
                    case 'proveedor':
                        this.array_doc_ingreso.rut_proveedor = match;
                        this.array_doc_ingreso.nombre = val;
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
            if (typeof data != 'boolean') {
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
            if (typeof data != 'boolean') {
                this.array_codigo = data;
                $('#list_codigo').prop('disabled', false);
                const $listCodigo = $dom('#list_codigo');
                if ($listCodigo instanceof HTMLElement) {
                    $listCodigo.focus();
                }
                if (codigo != '') {
                    $('#list_codigo').val(desc_codigo);
                    $('#codigo').val(codigo);
                    const $codigo = $dom('#codigo');
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
        async saveDocumentoDirect() {
            const result = await Swal.fire({
                title: '¿Estas seguro de guardar este documento?',
                text: 'No podras revertir esta acción!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, guardar!',
                cancelButtonText: 'No, cancelar!',
            });

            if (result.isConfirmed) {
                const formData = new FormData();
                formData.append('id', this.array_doc_ingreso.id);

                if (this.fileAsociado?.archivo !== undefined) {
                    formData.append('dataFile', JSON.stringify(this.fileAsociado));
                    formData.append('file', this.fileAsociado.file);
                }

                const response = await versaFetch({
                    url: '/api/update_file_preingreso',
                    method: 'POST',
                    data: formData,
                });
                if (response.success == 1) {
                    show_toast(response.title, response.message, 'Success', 'success');
                } else {
                    show_toast(response.title, response.message, 'Alerta', 'warning');
                }
            }
        },
        accion(accion: AccionData) {
            const actions: actionsType = {
                addFiles: () => {
                    this.fileAsociado = accion.files;
                },
                loadExcel: () => this.load_excel_base(accion),
                saveDocumentoDirect: () => this.saveDocumentoDirect(),
            };
            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
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
