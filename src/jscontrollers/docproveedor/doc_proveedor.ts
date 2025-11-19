import { $dom } from '@/jscontrollers/composables/dom-selector';
import {
    fecthCampus,
    fecthCuentaContable,
    fetchCondicion1,
    fetchCondicion2,
    fetchGetAreas,
    fetchGetCGestion,
    fetchGetCuentaGasto,
    fetchProyectos,
    fetchUnidadGasto,
    fetchUsuarioSolicitante,
    fetchgetProveedores,
} from '@/jscontrollers/composables/fetching';
import {
    FALSE,
    addDias,
    format_number_n_decimal,
    getAnnoMes,
    getDiaActual,
    pasarella,
    show_toast,
    validateResponeStatus,
    versaFetch,
} from '@/jscontrollers/composables/utils';
import { usePPalStore } from '@/jscontrollers/usePPalStore';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { ref, computed, watch } = Vue;

import newModal from '@/jscontrollers/components/newModal';

import dropZone from '@/jscontrollers/components/dropZone';
import uploadFileExcel from '@/jscontrollers/components/uploadFileExcel';
/* eslint-disable */
const dz = dropZone;
const ufe = uploadFileExcel;
/* eslint-enable */

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

        const deleteFileDOC = async (/** @type {Number} */ id) => {
            const response = await fetch('/api/deleteFileDOC', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id }),
            });
            if (validateResponeStatus(response.status)) {
                const data = await response.json();
                return data;
            } else {
                return { success: 0, message: 'Error interno en el servidor' };
            }
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
        accion(/** @type {Object} */ accion) {
            const actions = {
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
                <template v-slot:title>Factura Asociada</template>
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

Vue.component('components', {
    props: {
        showmodal: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, { emit }) {
        const showModal = computed(() => props.showmodal);

        const accion = accion => {
            emit('accion', accion);
        };
        return {
            accion,
            showModal,
        };
    },
    template: html`
        <div>
            <uploadFileExcel :showModal="showModal" @accion="accion" from="CreaOC" />
        </div>
    `,
});

Vue.component('info', {
    props: {
        array_doc: {
            type: Object,
            required: true,
        },
    },
    setup(props) {
        const array_doc = computed(() => props.array_doc);

        return {
            array_doc,
        };
    },
    template: html`
        <div class="row justify-content-between">
            <strong v-if="array_doc.orden_compra != ''">
                <p>Orden de compra Asociada: {{ array_doc.orden_compra}}-{{array_doc.orden_indice }}</p>
            </strong>
            <strong class="float-sm-right mt-0" v-if="array_doc.id !=''">
                <p :class="[ array_doc.estado == 1? 'text-green': 'text-blue']">
                    Estado de Documento: {{array_doc.desc_estado}} - Id Envio a Pago: {{ array_doc.id_enviodoc }} -
                    Pronto pago: {{array_doc.pronto_pago == 1 ? "Si":"No" }}
                </p>
            </strong>
            <strong v-if="array_doc.id !=''">
                <h6>
                    <h5>Folio Nº {{ array_doc.id }}</h5>
                    - Creado por: {{ array_doc.name }} - Fecha Registro: {{array_doc.created_at }}
                </h6>
                <h6 v-if="array_doc.user_mod != '0'">
                    Modificado Por: {{ array_doc.user_mod }} - Fecha última modificación: {{ array_doc.updated_at }}
                </h6>
            </strong>
        </div>
    `,
});

const appDOC_PRO = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    store: usePPalStore,
    data: function () {
        return {
            modal_accion: 'new',
            edit_index: '',
            edit_oc: false,
            index_oc: 0,
            newArray_doc: {
                id: '',
                cod_tipodocumento: '',
                desc_tipodocumento: '',
                rut_proveedor: '',
                nombre: '',
                folion: '',
                indice: '',
                orden_compra: '',
                orden_indice: '',
                fecha: '',
                fechavencimiento: '',
                solicitante: '',
                observacion: '',
                tipo_orden: '',
                estado: 1,
                created_at: '',
                updated_at: '',
                name: '',
                cod_unidadgastos: '',
                desc_unidadgastos: '',
                cod_condicion1: '',
                desc_condicion1: '',
                cod_condicion2: '',
                desc_condicion2: '',
                annomes: '',
                ncliente: '',
                medidor: '',
                consumo: '',
                show_adicional: 0,
                valortotal: 0,
                hesmigo: '',
                proyeccion: false,
            },
            array_doc: {},
            array_tipodocumento: [],
            array_items: [],
            array_proveedor: [],
            array_solicitantes: [],
            array_cuentacontable: [],
            array_cuentagastos: [],
            array_campus: [],
            array_area: [],
            array_centrogestion: [],
            array_proyectos: [],
            array_condiciones1: [],
            array_condiciones2: [],
            array_unidadgastos: [],
            array_tipo_oc: [
                {
                    value: 'resultado',
                },
                {
                    value: 'Inversión',
                },
            ],
            total_valor: 0,
            total_valorfactor: 0,
            placedato1: '',
            placedato2: '',
            placedato3: '',
            array_tipolinea: [],
            array_hojas: [],
            array_data: [],
            val_asociado: '',
            error_hesmigo_length: false,
            fileAsociado: {},
            showModalUploadExcel: false,
        };
    },
    created: async function () {
        this.array_doc = JSON.parse(JSON.stringify(this.newArray_doc));

        const fetchTipoDocumento = async params => {
            const response = await versaFetch({
                url: '/api/getTipoDocumento',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(params),
            });
            return response;
        };

        const fetchTipolinea = async () => {
            const response = await versaFetch({
                url: '/api/getTipoLinea',
                method: 'POST',
            });
            return response;
        };

        const response = await Promise.all([
            fetchTipoDocumento({ estado: '1' }),
            fetchCondicion1(),
            fetchCondicion2(),
            fecthCampus(),
            fetchTipolinea(),
            fetchUnidadGasto({ estado: '1' }),
            fetchUsuarioSolicitante({
                estado: '1',
                filtro: 'solicitantes',
            }),
            fecthCuentaContable(),
            fetchProyectos(),
            fetchgetProveedores({ estado: '1' }),
        ]);

        const [
            tipoDocumento,
            condicion1,
            condicion2,
            campus,
            tipoLinea,
            unidadGastos,
            solicitantes,
            cuentaContable,
            proyectos,
            proveedor,
        ] = response;

        proveedor.forEach(item => {
            this.array_proveedor.push({
                text: item.rut,
                value: item.nombre,
                val_asociado: item.val_asociado,
            });
        });
        solicitantes.forEach(item => {
            this.array_solicitantes.push({
                text: item.solicitantes,
            });
        });
        tipoDocumento.forEach(item => {
            this.array_tipodocumento.push({
                text: item.descripcion,
                codigo: item.id,
            });
        });
        condicion1.forEach(item => {
            this.array_condiciones1.push({
                text: item.descripcion,
                codigo: item.codigo,
                adicional: item.adicional,
                dato1: item.dato1,
                dato2: item.dato2,
                dato3: item.dato3,
            });
        });
        condicion2.forEach(item => {
            this.array_condiciones2.push({
                text: item.descripcion,
                codigo: item.codigo,
            });
        });
        unidadGastos.forEach(item => {
            this.array_unidadgastos.push({
                text: item.descripcion,
                codigo: item.codigo,
            });
        });
        cuentaContable.forEach(item => {
            this.array_cuentacontable.push({
                text: item.descripcion,
                value: item.codigo,
            });
        });
        campus.forEach(item => {
            this.array_campus.push({
                text: item.descripcion,
                value: item.id,
            });
        });
        proyectos.forEach(item => {
            this.array_proyectos.push({
                value: item.descripcion,
                text: item.codigoproyecto,
                monto: item.monto,
            });
        });
        tipoLinea.forEach(item => {
            this.array_tipolinea.push({
                text: item.descripcion,
                value: item.id,
            });
        });
    },
    mounted: function () {
        this.array_doc.fecha = getDiaActual();
        this.array_doc.fechavencimiento = addDias(getDiaActual(), 30);
        this.array_doc.annomes = getAnnoMes();
    },
    methods: {
        ...Vuex.mapMutations(['SET_FUNCTIONS_PASARELLA']),
        modal_agregar_item: function () {
            const valor = Number($('#valortotal').val());
            if (!isNaN(Number(valor)) && Number(valor) > 0) {
                this.array_doc.folion = $('#folio').val();
                this.array_doc.indice = $('#indice').val();

                this.array_doc.fecha = $('#fecha').val();
                this.array_doc.indice = $('#indice').val();
                this.array_doc.solicitante = $('#solicitante').val();

                this.array_doc.rut_proveedor = $('#proveedor').val();
                this.array_doc.nombre = $('#list_proveedor').val();

                this.array_doc.provision = $('#provision').is(':checked');
                this.array_doc.observacion = $('#observacion').val();
                this.array_doc.tipo_orden = $('#tipo_oc').val();

                this.modal_accion = 'new';
                this.limpiar_modal();
                $('#modal_agregar_item').modal('show');
            } else {
                show_toast('Ingresar Documento Proveedor', 'Antes debe ingresar un Valor de Compra');
                const valortotal = $dom('#valortotal');
                if (valortotal instanceof HTMLInputElement) valortotal.focus();
            }
        },
        modal_search_OrdenCompra: async function () {
            const fData = new FormData();
            fData.append('estado', '3');
            const response = await versaFetch({
                url: '/api/get_OCByEstado',
                method: 'POST',
                data: fData,
            });

            if ($('#tabla_ordencompra').find('tr').children().length > 0) {
                $('#tabla_ordencompra').find('tr').children().remove();
                $('#tabla_ordencompra').find('tbody').remove();
                $('#tabla_ordencompra').DataTable().destroy();
            }
            $('#tabla_ordencompra').DataTable({
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
                    {
                        data: 'id',
                        render: (data, type, row) => html`
                            <button
                                type="button"
                                class="btn btn-success btn-xs"
                                data-value='{"accion":"load_search_oc","id": ${row.id} }'
                                name="pasarella">
                                <i class="fa fa-arrow-down"></i>
                            </button>
                        `,
                    },
                    { data: 'folionindice' },
                    { data: 'fecha' },
                    { data: 'tipo_orden' },
                    { data: 'estado_descripcion' },
                    { data: 'nombre' },
                    { data: 'totalvalor' },
                    { data: 'totalvalorconsumo' },
                    {
                        data: 'id',
                        render: (data, type, row) => html`
                            <div class="progress progress-md">
                                <div class="progress-bar bg-primary" style="width:${row.porc}%">
                                    ${String(row.porc).trim()}%
                                </div>
                            </div>
                        `,
                    },
                    { data: 'user_creador' },
                    {
                        data: '',
                        render: function (data, type, row) {
                            return row['proyeccion'] == 1 ? 'SI' : 'NO';
                        },
                    },
                ],
                data: response.data,
                info: true,
                searching: true,
                paging: true,
                lengthMenu: [
                    [10, 25, 50, -1],
                    [10, 25, 50, 'Todos'],
                ],
                pageLength: 5,
                dom: 'Bfrtip',
                buttons: ['excelHtml5'],
            });

            $('#tabla_ordencompra').DataTable().columns.adjust().draw();

            $('#modal_search_oc').modal('show');
        },
        modal_cargaexcel: function () {
            this.showModalUploadExcel = true;
        },
        load_excel_base: async function (data) {
            this.array_data = data;
            const array_temp = {
                cod_tipodocumento: $('#tipodocumento').val(),
                desc_tipodocumento: $('#list_tipodocumento').val(),
                rut_proveedor: $('#proveedor').val(),
                nombre: $('#list_proveedor').val(),
                folion: $('#folio').val(),
                indice: $('#indice').val(),
            };
            this.array_items = [];
            this.array_doc = { ...this.newArray_doc, ...array_temp };

            const FormD = new FormData();
            FormD.append('encabezado', '0');
            FormD.append('items', JSON.stringify(this.array_data));

            const json = await versaFetch({
                url: '/api/cargar_masiva_doc',
                method: 'POST',
                data: FormD,
            });

            if (json.success == 1) {
                show_toast('Alerta', json.message, 'success', 'success');
                this.array_doc = json.encabezado;
                if (typeof json.detalle != 'boolean') {
                    this.array_items = json.detalle;
                }
            } else {
                show_toast('Alerta', json.message, 'warning', 'warning');
            }
        },
        load_search_oc: async function (id) {
            const array_temp = {
                cod_tipodocumento: $('#tipodocumento').val(),
                desc_tipodocumento: $('#list_tipodocumento').val(),
                rut_proveedor: $('#proveedor').val(),
                nombre: $('#list_proveedor').val(),
                folion: $('#folio').val(),
                indice: $('#indice').val(),
                orden_compra: this.array_doc.orden_compra,
                orden_indice: this.array_doc.orden_indice,
            };

            this.array_items = [];
            this.array_doc = { ...this.newArray_doc, ...array_temp };

            this.array_doc.fecha = getDiaActual();
            this.array_doc.fechavencimiento = addDias(getDiaActual(), 30);
            this.array_doc.annomes = getAnnoMes();

            this.fileAsociado = {};

            const FormD = new FormData();
            FormD.append('id', id);
            FormD.append('carga_de', 'documento');

            const data = await versaFetch({
                url: '/api/get_OCById',
                method: 'POST',
                data: FormD,
            });
            if (typeof data != 'boolean') {
                this.array_doc.tipo_oc = data.encabezado.tipo_oc;
                this.array_doc.solicitante = data.encabezado.solicitante;
                this.array_doc.observacion = data.encabezado.observacion;
                this.array_doc.rut_proveedor = data.encabezado.rut_proveedor;
                this.array_doc.nombre = data.encabezado.nombre;
                this.array_doc.tipo_orden = data.encabezado.tipo_orden;
                this.array_doc.orden_compra = data.encabezado.folion;
                this.array_doc.orden_indice = data.encabezado.indice;
                this.array_doc.valortotal = data.encabezado.valortotal;
                this.array_doc.cod_condicion1 = data.encabezado.cod_condicion1;
                this.array_doc.desc_condicion1 = data.encabezado.desc_condicion1;
                this.array_doc.cod_condicion2 = data.encabezado.cod_condicion2;
                this.array_doc.desc_condicion2 = data.encabezado.desc_condicion2;
                this.array_doc.ncliente = data.encabezado.ncliente;
                this.array_doc.medidor = data.encabezado.medidor;
                this.array_doc.consumo = data.encabezado.consumo;
                this.array_doc.show_adicional = data.encabezado.show_adicional;
                this.array_doc.proyeccion = data.encabezado.proyeccion == 1;

                if (typeof data.detalle != 'boolean') {
                    this.array_items = data.detalle;
                }

                $('#modal_search_oc').modal('hide');
            }
        },
        limpiar_tabla: async function () {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de limpiar el detalle ingresado del Documento Proveedor?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                this.array_items = [];
            }
        },
        update_ValorFactor: function () {
            const valor = $('#valor').val() == '' ? 0 : Number($('#valor').val());
            let factor = $('#factor').val() == '' ? 0 : Number($('#factor').val());

            if (factor > 0) {
                factor = factor / 100;
            }
            const valorfactor = valor * factor;
            $('#valorfactor').val(valorfactor.toFixed(0));
        },
        save_new_item: function () {
            const cod_tipolinea = $('#tipolinea').val();

            const orden_compra = $('#orden_compra').val();
            const orden_indice = $('#orden_indice').val();

            const cuenta_contable = $('#cuentacontable').val();
            const cuenta_gasto = $('#cuentagasto').val();

            const campus = $('#campus').val();
            const area = $('#area').val();
            const centro_gestion = $('#centrogestion').val();

            const valor = $('#valor').val();
            const factor = $('#factor').val();
            const valor_factor = $('#valorfactor').val();

            const datelle = $('#detalle').val();

            const proyecto = $('#proyecto').val();

            let error = false;

            if (cod_tipolinea == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un tipo de linea');
                error = true;
            }

            if (!$('#list_gasto').is(':disabled') && cuenta_gasto == '0' && $('#list_gasto').val() == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una cuenta de gasto');
                error = true;
            }

            if (cuenta_contable == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una cuenta contable');
                error = true;
            }
            if (!$('#list_campus').is(':disabled') && campus == '' && $('#list_campus').val() == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un campus');
                error = true;
            }
            if (!$('#list_area').is(':disabled') && area == '0' && $('#list_area').val() == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un area');
                error = true;
            }
            if (
                !$('#list_centrogestion').is(':disabled') &&
                centro_gestion == '0' &&
                $('#list_centrogestion').val() == ''
            ) {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un centro de Gestión');
                error = true;
            }
            if (valor == '' || valor == 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar valor de nuevo item');
                error = true;
            }
            if (valor_factor == '' || valor_factor == 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar factor de nuevo item');
                error = true;
            }
            if (datelle == '') {
                show_toast('Registro Nuevo Item', 'Debe ingresar detalle de nuevo item');
                error = true;
            }
            if (!error) {
                this.array_items.push({
                    cod_tipolinea: cod_tipolinea,
                    desc_tipolinea: $('#list_tipolinea').val(),
                    cod_cuenta_contable: cuenta_contable,
                    cuenta_contable: $('#list_cuenta').val(),
                    cod_cuenta_gasto: cuenta_gasto,
                    cuenta_gasto: $('#list_gasto').val(),
                    cod_campus: campus,
                    campus: $('#list_campus').val(),
                    cod_area: area,
                    area: $('#list_area').val(),
                    cod_centro_gestion: centro_gestion,
                    centro_gestion: $('#list_centrogestion').val(),
                    valor: format_number_n_decimal(valor),
                    factor: format_number_n_decimal(factor, 4),
                    valor_factor: format_number_n_decimal(valor_factor, 0),
                    detalle: datelle,
                    cod_proyecto: proyecto,
                    proyecto: $('#list_proyectos').val(),
                    orden_compra: orden_compra,
                    orden_indice: orden_indice,
                });
                $('#modal_agregar_item').modal('hide');
                this.limpiar_modal();
            }
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
        duplicate_item: function (index) {
            this.array_items.push({ ...this.array_items[index] });
        },
        load_edit_item: async function (index) {
            const valor = $('#valortotal').val() == '' ? 0 : Number($('#valortotal').val());
            if (!isNaN(Number(valor)) && Number(valor) > 0) {
                $('#tipolinea').val(this.array_items[index].cod_tipolinea);
                $('#list_tipolinea').val(this.array_items[index].desc_tipolinea);

                $('#valor').val($('#valortotal').val());
                $('#orden_compra').val(this.array_items[index].orden_compra);
                $('#orden_indice').val(this.array_items[index].orden_indice);

                $('#list_cuenta').val(this.array_items[index].cuenta_contable);
                $('#cuentacontable').val(this.array_items[index].cod_cuenta_contable);

                await this.cagar_cuenta_gasto(
                    this.array_items[index].cod_cuenta_contable,
                    this.array_items[index].cod_cuenta_gasto,
                    this.array_items[index].cuenta_gasto
                );

                $('#list_campus').val(this.array_items[index].campus);
                $('#campus').val(this.array_items[index].cod_campus);
                await this.cagar_areas(
                    this.array_items[index].cod_campus,
                    this.array_items[index].cod_area,
                    this.array_items[index].area
                );

                await this.cagar_centrogestion(
                    this.array_items[index].cod_area,
                    this.array_items[index].cod_centro_gestion,
                    this.array_items[index].centro_gestion
                );

                $('#factor').val(this.array_items[index].factor.replace(/\./g, '').replace(/,/g, '.'));
                $('#valorfactor').val(this.array_items[index].valor_factor.replace(/\./g, '').replace(/,/g, '.'));

                $('#detalle').val(this.array_items[index].detalle);

                $('#list_proyectos').val(this.array_items[index].proyecto);
                $('#proyecto').val(this.array_items[index].cod_proyecto);

                this.modal_accion = 'edit';
                this.edit_index = index;

                $('#edit_index').val(index);
                if ((window as any).__udd_modal_agregar_item) clearTimeout((window as any).__udd_modal_agregar_item);
                (window as any).__udd_modal_agregar_item = setTimeout(function () {
                    $('#modal_agregar_item').modal('show');
                }, 500);
            } else {
                show_toast('Ingresar Documento Proveedor', 'Antes debe ingresar un Valor de Compra');
                const valor = $dom('#valortotal');
                if (valor instanceof HTMLInputElement) valor.focus();
            }
        },
        save_edit_item: function () {
            const cod_tipolinea = $('#tipolinea').val();

            const cuenta_contable = $('#cuentacontable').val();
            const cuenta_gasto = $('#cuentagasto').val();

            const campus = $('#campus').val();
            const area = $('#area').val();
            const centro_gestion = $('#centrogestion').val();

            const valor = $('#valor').val();
            const factor = $('#factor').val();
            const valor_factor = $('#valorfactor').val();

            const datelle = $('#detalle').val();

            const proyecto = $('#proyecto').val();

            let error = false;
            if (cod_tipolinea == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un tipo de linea');
                error = true;
            }

            if (!$('#list_gasto').is(':disabled') && cuenta_gasto == '0' && $('#list_gasto').val() == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una cuenta de gasto');
                error = true;
            }

            if (cuenta_contable == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una cuenta contable');
                error = true;
            }
            if (!$('#list_campus').is(':disabled') && campus == '' && $('#list_campus').val() == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un campus');
                error = true;
            }
            if (!$('#list_area').is(':disabled') && area == '0' && $('#list_area').val() == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un area');
                error = true;
            }
            if (
                !$('#list_centrogestion').is(':disabled') &&
                centro_gestion == '0' &&
                $('#list_centrogestion').val() == ''
            ) {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un centro de Gestión');
                error = true;
            }
            if (valor == '' || valor == 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar valor de nuevo item');
                error = true;
            }
            if (valor_factor == '' || valor_factor == 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar factor de nuevo item');
                error = true;
            }
            if (datelle == '') {
                show_toast('Registro Nuevo Item', 'Debe ingresar detalle de nuevo item');
                error = true;
            }

            if (!error) {
                const index = this.edit_index;
                this.array_items[index].cod_tipolinea = cod_tipolinea;
                this.array_items[index].desc_tipolinea = $('#list_tipolinea').val();
                this.array_items[index].cod_cuenta_contable = cuenta_contable;
                this.array_items[index].cuenta_contable = $('#list_cuenta').val();
                this.array_items[index].cod_cuenta_gasto = cuenta_gasto;
                this.array_items[index].cuenta_gasto = $('#list_gasto').val();
                this.array_items[index].cod_campus = campus;
                this.array_items[index].campus = $('#list_campus').val();
                this.array_items[index].cod_area = area;
                this.array_items[index].area = $('#list_area').val();
                this.array_items[index].cod_centro_gestion = centro_gestion;
                this.array_items[index].centro_gestion = $('#list_centrogestion').val();
                this.array_items[index].valor = format_number_n_decimal(valor);
                this.array_items[index].factor = format_number_n_decimal(factor, 4);
                this.array_items[index].valor_factor = format_number_n_decimal(valor_factor, 0);
                this.array_items[index].detalle = datelle;
                this.array_items[index].cod_proyecto = proyecto;
                this.array_items[index].proyecto = $('#list_proyectos').val();

                $('#modal_agregar_item').modal('hide');
                this.limpiar_modal();
            }
        },
        save_documento_proveedor: async function (id) {
            //eliminar el espacio en blanco
            const tipodocumento = String($('#tipodocumento').val()).trim();
            const folio = String($('#folio').val()).trim();
            const indice = String($('#indice').val()).trim() == '' ? 1 : String($('#indice').val()).trim();
            const solicitante = String($('#solicitante').val()).trim();
            const proveedor = String($('#proveedor').val()).trim();
            const fecha = $('#fecha').val();
            const fechavencimiento = $('#fechavencimiento').val();
            const annomes = $('#annomes').val();
            const orden_compra = this.array_doc.orden_compra;
            const orden_indice = this.array_doc.orden_indice;
            const tipo_oc = String($('#tipo_oc').val()).trim();
            const observacion = String($('#observacion').val()).trim();
            const unidadgastos = String($('#unidadgastos').val()).trim();
            const cod_condicion1 = String($('#cod_condicion1').val()).trim();
            const cod_condicion2 = String($('#cod_condicion2').val()).trim();
            const ncliente = String($('#ncliente').val()).trim();
            const medidor = String($('#medidor').val()).trim();
            const consumo = String($('#consumo').val()).trim();
            const valortotal = String($('#valortotal').val()).trim();
            const proyeccion = this.array_doc.proyeccion ? 1 : 0;
            const hesmigo = String($('#txtHESMIGO').val()).trim();

            let error = false;
            if (folio == '' || folio === '0') {
                show_toast('Ingresar Documento Proveedor', 'Debe ingresar Folio');
                error = true;
            }
            if (solicitante == '') {
                show_toast('Ingresar Documento Proveedor', 'Debe ingresar solicitante');
                error = true;
            }
            if (tipodocumento == '') {
                show_toast('Ingresar Documento Proveedor', 'Debe ingresar Tipo de Documento');
                error = true;
            }
            if (proveedor == '') {
                show_toast('Ingresar Documento Proveedor', 'Debe ingresar Proveedor');
                error = true;
            }
            if (tipo_oc == '') {
                show_toast('Ingresar Documento Proveedor', 'Debe ingresar Tipo de Orden');
                error = true;
            }
            if (unidadgastos == '') {
                show_toast('Ingresar Documento Proveedor', 'Debe ingresar Unidad de Gasto');
                error = true;
            }
            if (cod_condicion1 == '') {
                show_toast('Ingresar Documento Proveedor', 'Debe ingresar Condición 1');
                error = true;
            }
            if (cod_condicion2 == '') {
                show_toast('Ingresar Documento Proveedor', 'Debe ingresar Condición 2');
                error = true;
            }
            if (this.array_items.length <= 0) {
                show_toast(
                    'Ingresar Documento Proveedor',
                    'Debe ingresar a lo menos un item en el Documento Proveedor'
                );
                error = true;
            }

            if (this.fileAsociado?.archivo === undefined) {
                show_toast(
                    'Ingresar Documento Proveedor',
                    'Recuerde que puede cargar el archivo fisico del documento',
                    'Alerta',
                    'warning'
                );
            }

            if (!error) {
                const FormD = new FormData();
                FormD.append('id', id);
                FormD.append('tipo_doc', tipodocumento);
                FormD.append('folion', folio);
                FormD.append('indice', String(indice));
                FormD.append('solicitante', solicitante);
                FormD.append('proveedor', proveedor);
                FormD.append('fecha', String(fecha));
                FormD.append('fechavencimiento', String(fechavencimiento));
                FormD.append('annomes', String(annomes));
                FormD.append('orden_compra', orden_compra);
                FormD.append('orden_indice', orden_indice);
                FormD.append('tipo_oc', tipo_oc);
                FormD.append('unidadgastos', unidadgastos);
                FormD.append('observacion', observacion);
                FormD.append('cod_condicion1', cod_condicion1);
                FormD.append('cod_condicion2', cod_condicion2);
                FormD.append('ncliente', ncliente);
                FormD.append('medidor', medidor);
                FormD.append('consumo', consumo);
                FormD.append('valortotal', valortotal);
                FormD.append('proyeccion', String(proyeccion));
                FormD.append('hesmigo', hesmigo);

                if (this.fileAsociado?.archivo !== undefined) {
                    FormD.append('dataFile', JSON.stringify(this.fileAsociado));
                    FormD.append('file', this.fileAsociado.file);
                }

                $('#btn_save').prop('disabled', true);

                FormD.append('items', JSON.stringify(this.array_items));

                const json = await versaFetch({
                    url: '/api/save_documentoproveedor',
                    method: 'POST',
                    data: FormD,
                });

                if (json.success == 1) {
                    show_toast(json.title, json.message, 'success', 'success');

                    const result = await Swal.fire({
                        title: 'Atención',
                        text: 'Desea generar Excel de Imputaciones?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Aceptar',
                        cancelButtonText: 'Cancelar',
                    });
                    if (result.isConfirmed) {
                        this.generateExcelDoc(json.id);
                        await this.load_edit_doc(json.id);
                        this.find_folio_doc();
                    } else {
                        if ((window as any).__udd_doc_redirect) clearTimeout((window as any).__udd_doc_redirect);
                        (window as any).__udd_doc_redirect = setTimeout(function () {
                            location.href = '/registragasto/documento';
                        }, 1000);
                    }
                } else {
                    show_toast(json.title, json.message, 'warning', 'warning');
                }
                $('#btn_save').prop('disabled', false);
            }
        },
        find_folio_doc: async function () {
            this.edit_oc = false;
            this.index_oc = 0;

            const FormD = new FormData();
            FormD.append('rut_proveedor', $('#proveedor').val() == '' ? '0' : String($('#proveedor').val()));
            FormD.append('tipo_documento', $('#tipodocumento').val() == '' ? '0' : String($('#tipodocumento').val()));
            FormD.append('folion', $('#folio').val() == '' ? '0' : String($('#folio').val()));
            FormD.append('indice', $('#indice').val() == '' ? '0' : String($('#indice').val()));

            const data = await versaFetch({
                url: '/api/find_folio_doc',
                method: 'POST',
                data: FormD,
            });

            this.edit_oc = data['find'];
            this.index_oc = Number(data['id']);

            this.fileAsociado = data['archivo'] === false ? {} : data['archivo'][0];
        },
        load_edit_doc: async function (id) {
            const array_temp = {
                cod_tipodocumento: $('#tipodocumento').val(),
                desc_tipodocumento: $('#list_tipodocumento').val(),
                rut_proveedor: $('#proveedor').val(),
                nombre: $('#list_proveedor').val(),
                folion: $('#folio').val(),
                indice: $('#indice').val(),
                orden_compra: '',
                orden_indice: '',
            };

            this.array_oc = { ...this.newArray_doc, ...array_temp };
            this.array_items = [];

            this.array_doc.fecha = getDiaActual();
            this.array_doc.fechavencimiento = getDiaActual();
            this.array_doc.annomes = getAnnoMes();

            const FormD = new FormData();
            FormD.append('id', id);

            const data = await versaFetch({
                url: '/api/get_DOCById',
                method: 'POST',
                data: FormD,
            });

            if (typeof data != 'boolean') {
                this.array_doc = data.encabezado;
                this.array_doc.proyeccion = data.encabezado.proyeccion == 1;

                this.fileAsociado = data.archivo === false ? {} : data.archivo[0];

                if (typeof data.detalle != 'boolean') {
                    this.array_items = data.detalle;
                }
            }
        },
        delete_doc: async function (id) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de eliminar este Documento Proveedor?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });

            if (result.isConfirmed) {
                const FormD = new FormData();
                FormD.append('id', id);
                FormD.append('rut_proveedor', $('#proveedor').val() == '' ? '0' : String($('#proveedor').val()));
                FormD.append(
                    'tipo_documento',
                    $('#tipodocumento').val() == '' ? '0' : String($('#tipodocumento').val())
                );
                FormD.append('folion', $('#folio').val() == '' ? '0' : String($('#folio').val()));
                FormD.append('indice', $('#indice').val() == '' ? '0' : String($('#indice').val()));

                FormD.append('orden_compra', this.array_doc.orden_compra);
                FormD.append('orden_indice', this.array_doc.orden_indice);

                const data = await versaFetch({
                    url: '/api/delete_DOCById',
                    method: 'POST',
                    data: FormD,
                });

                if (data.success == 1) {
                    show_toast(data.title, data.message, 'success', 'success');

                    if ((window as any).__udd_doc_redirect) clearTimeout((window as any).__udd_doc_redirect);
                    (window as any).__udd_doc_redirect = setTimeout(function () {
                        location.href = '/registragasto/documento';
                    }, 1000);
                } else {
                    show_toast(data.title, data.message, 'warning', 'warning');
                }
            }
        },
        generateExcelDoc: function (id) {
            location.href = `/registragasto/excel_documento/${id}`;
        },
        change_estado_doc: async function (id) {
            const estado = this.array_doc.estado;

            const estado_final = this.array_doc.estado == '1' ? 'Marcar Pagada' : 'Abrir';

            const result = await Swal.fire({
                title: 'Atención',
                text: `Está seguro desea: ${estado_final} este Documento Proveedor?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });

            if (result.isConfirmed) {
                const FormD = new FormData();
                FormD.append('id', id);
                FormD.append('estado', estado);

                const data = await versaFetch({
                    url: '/api/change_estado_DOC',
                    method: 'POST',
                    data: FormD,
                });

                if (data.success == 1) {
                    show_toast(data.title, data.message, 'success', 'success');

                    if ((window as any).__udd_doc_redirect) clearTimeout((window as any).__udd_doc_redirect);
                    (window as any).__udd_doc_redirect = setTimeout(function () {
                        location.href = '/registragasto/documento';
                    }, 1000);
                } else {
                    show_toast(data.title, data.message, 'warning', 'warning');
                }
            }
        },
        sumadiasvencimiento: function () {
            this.array_doc.fechavencimiento = addDias($('#fecha').val(), 30);
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
                const cActv = $dom('#cActv');
                if (cActv instanceof HTMLInputElement) cActv.focus();
            }
        },
        SearchDocByFolio: async function ({ target }) {
            this.edit_oc = false;
            this.index_oc = 0;
            if (target.value != '') {
                const array_temp = {
                    cod_tipodocumento: '',
                    desc_tipodocumento: '',
                    rut_proveedor: '',
                    nombre: '',
                    folion: '',
                    indice: '',
                    orden_compra: '',
                    orden_indice: '',
                };

                this.array_items = [];

                this.array_doc = { ...this.newArray_doc, ...array_temp };

                this.array_doc.fecha = getDiaActual();
                this.array_doc.fechavencimiento = getDiaActual();
                this.array_doc.annomes = getAnnoMes();

                const FormD = new FormData();
                const id = target.value;
                FormD.append('id', id);

                const json = await versaFetch({
                    url: '/api/find_id_doc',
                    method: 'POST',
                    data: FormD,
                });

                if (typeof json != 'boolean') {
                    const temp = {
                        cod_tipodocumento: json[0].cod_tipodocumento,
                        desc_tipodocumento: json[0].desc_tipodocumento,
                        rut_proveedor: json[0].rut_proveedor,
                        nombre: json[0].nombre,
                        folion: json[0].folion,
                        indice: json[0].indice,
                        orden_compra: json[0].orden_compra,
                        orden_indice: json[0].orden_indice,
                    };

                    this.array_doc = { ...temp };

                    this.edit_oc = true;
                    this.index_oc = Number(id);

                    this.load_edit_doc(id);
                } else {
                    show_toast(
                        'Ingresar Documento Proveedor',
                        'Folio NO encontrado, intente nuevamente',
                        'warning',
                        'warning'
                    );
                }
            }
        },
        change_rebaja_proyeccion: async function () {
            if (this.array_doc.id !== '') {
                const result = await Swal.fire({
                    title: "¿Estas seguro de cambiar el estado de 'Rebaja Proyección'?",
                    text: 'No podras revertir esta acción!, Todos los documentos asociados se verán afectados.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Si, estoy seguro!',
                    cancelButtonText: 'No, cancelar!',
                });
                if (result.isConfirmed) {
                    const fData = new FormData();
                    fData.append('id', this.array_doc.id);
                    fData.append('origen', 'DOC');
                    fData.append('orden', this.array_doc.orden_compra);
                    fData.append('indice', this.array_doc.orden_indice);
                    fData.append('proyeccion', this.array_doc.proyeccion ? '1' : '0');

                    const json = await versaFetch({
                        url: '/api/updateRebajaProyeccion',
                        method: 'POST',
                        data: fData,
                    });

                    if (json.success == 1) {
                        show_toast(json.title, json.message, 'success', 'success');
                    } else {
                        show_toast(json.title, json.message, 'Alerta', 'warning');
                    }
                } else {
                    this.array_doc.proyeccion = !this.array_doc.proyeccion;
                }
            }
        },
        pasarella(param) {
            this.SET_FUNCTIONS_PASARELLA(param);
        },
        limpiar_modal() {
            $('#cuentacontable').val('');
            $('#list_cuenta').val('');
            $('#cuentagasto').val(0);
            $('#list_gasto').val('');
            $('#list_campus').val('');
            $('#campus').val('');
            $('#area').val(0);
            $('#list_area').val('');
            $('#centrogestion').val(0);
            $('#list_centrogestion').val('');
            $('#valor').val($('#valortotal').val());
            $('#factor').val(0);
            $('#valorfactor').val(0);
            $('#detalle').val('');
            $('#proyecto').val('');
            $('#list_proyectos').val('');
            $('#list_centrogestion').prop('disabled', true);
            $('#list_area').prop('disabled', true);
            $('#list_gasto').prop('disabled', true);
            $('#orden_compra').val(0);
            $('#orden_indice').val(0);
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
                let element = null;
                switch (tabla) {
                    case 'cuentacontable':
                        this.cagar_cuenta_gasto(match, '');
                        break;
                    case 'campus':
                        this.cagar_areas(match, '');
                        break;
                    case 'area':
                        this.cagar_centrogestion(match, '');
                        break;
                    case 'centrogestion':
                        element = $dom('#valor');
                        break;
                    case 'proveedor':
                        this.array_doc.rut_proveedor = match;
                        this.array_doc.nombre = val;
                        element = $dom('#list_tipodocumento');
                        break;
                    case 'tipodocumento':
                        this.array_doc.cod_tipodocumento = match;
                        element = $dom('#folio');
                        break;
                    case 'condicion1':
                        this.array_doc.cod_condicion1 = match;
                        this.array_doc.show_adicional = $(`#${list}`).find(`option[value="${val}"]`).data('value3');

                        this.placedato1 = $(`#${list}`).find(`option[value="${val}"]`).data('value4');
                        this.placedato2 = $(`#${list}`).find(`option[value="${val}"]`).data('value5');
                        this.placedato3 = $(`#${list}`).find(`option[value="${val}"]`).data('value6');

                        element = $dom('#cod_condicion2');
                        break;
                    case 'condicion2':
                        this.array_doc.cod_condicion2 = match;
                        break;
                    case 'unidadgastos':
                        this.array_doc.cod_unidadgastos = match;
                        break;
                }
                if (element instanceof HTMLElement) {
                    element.focus();
                }
            }
            $(`#${selec}`).prop('disabled', false);
        },
        async cagar_cuenta_gasto(codigo, cod_gastos, desc_gasto) {
            this.array_cuentagastos = [];
            $('#list_gasto').prop('disabled', true);
            $('#list_gasto').val('');
            $('#cuentagasto').val(0);

            const response = await fetchGetCuentaGasto({ codigo });

            if (typeof response != 'boolean') {
                this.array_cuentagastos = response.map(value => ({
                    value: value.codigocuentagasto,
                    text: value.descripcion,
                }));
                $('#list_gasto').prop('disabled', false);
                const list_gasto = $dom('#list_gasto');
                if (list_gasto instanceof HTMLInputElement) list_gasto.focus();
                if (cod_gastos != '') {
                    $('#list_gasto').val(desc_gasto);
                    $('#cuentagasto').val(cod_gastos);
                }
            } else {
                const list_campus = $dom('#list_campus');
                if (list_campus instanceof HTMLInputElement) list_campus.focus();
            }
        },
        async cagar_areas(codigo, cod_area, desc_area) {
            this.array_area = [];
            $('#list_area').prop('disabled', true);
            $('#list_area').val('');
            $('#area').val(0);

            $('#list_centrogestion').prop('disabled', true);
            $('#list_centrogestion').val('');
            $('#centrogestion').val(0);

            const data = await fetchGetAreas(codigo);
            if (typeof data != 'boolean') {
                this.array_area = data.map(value => ({
                    text: value.codigo,
                    value: value.descripcion,
                }));
                $('#list_area').prop('disabled', FALSE);
                const list_area = $dom('#list_area');
                if (list_area instanceof HTMLInputElement) list_area.focus();
                if (cod_area != '') {
                    $('#area').val(cod_area);
                    $('#list_area').val(desc_area);
                }
            }
        },
        async cagar_centrogestion(codigo, cod_centrogestion, desc_centrogestion) {
            $('#list_centrogestion').prop('disabled', true);
            $('#list_centrogestion').val('');
            $('#list_centrogestion').empty();

            $('#centrogestion').val(0);
            this.array_centrogestion = [];

            const codigo_campus = String($('#campus').val());

            const data = await fetchGetCGestion(codigo_campus, codigo);
            if (typeof data != 'boolean') {
                this.array_centrogestion = data.map(value => ({
                    text: value.codigo,
                    value: value.descripcion,
                }));
                $('#list_centrogestion').prop('disabled', false);
                const list_centrogestion = $dom('#list_centrogestion');
                if (list_centrogestion instanceof HTMLInputElement) list_centrogestion.focus();
                if (cod_centrogestion != '') {
                    $('#list_centrogestion').val(desc_centrogestion);
                    $('#centrogestion').val(cod_centrogestion);
                    const valor = $dom('#valor');
                    if (valor instanceof HTMLInputElement) valor.focus();
                }
            }
        },
        accion(accion) {
            const actions = {
                addFiles: () => {
                    this.fileAsociado = accion.files;
                },
                saveDocumentoDirect: () => {
                    this.saveDocumentoDirect();
                },
                closeModalUploadFileExcel: () => {
                    this.showModalUploadExcel = false;
                },
                loadExcel: () => {
                    this.showModalUploadExcel = false;
                    this.load_excel_base(accion.data);
                },
            };
            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
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
                formData.append('id', this.array_doc.id);
                formData.append('proveedor', this.array_doc.rut_proveedor);
                formData.append('tipo_documento', this.array_doc.cod_tipodocumento);
                formData.append('folio', this.array_doc.folion);

                if (this.fileAsociado?.archivo !== undefined) {
                    formData.append('dataFile', JSON.stringify(this.fileAsociado));
                    formData.append('file', this.fileAsociado.file);
                }

                const response = await versaFetch({
                    url: '/api/updateDataFileDOC',
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
    },
    watch: {
        'array_doc.rut_proveedor': function (val) {
            this.val_asociado = '';
            if (val === '') return;
            const result = this.array_proveedor.find(element => {
                if (element.text == this.array_doc.rut_proveedor) {
                    return element.val_asociado;
                }
            });

            if (result === undefined) return;
            this.val_asociado =
                result.val_asociado == 1
                    ? html`
                          <i class="fas fa-check-circle text-success"></i>
                      `
                    : html`
                          <i class="fas fa-exclamation-circle text-warning"></i>
                      `;
        },
        'array_doc.hesmigo': function (val) {
            this.error_hesmigo_length = false;

            if (val === '' || val === undefined) return;

            if (val.length > 0) {
                if (val.length !== 10) {
                    this.error_hesmigo_length = true;
                }
            }
        },
        functionsPasarella(val) {
            if (val !== null && val !== undefined) {
                const actions = {
                    load_search_oc: () => this.load_search_oc(val.id),
                };
                const selectedAction = actions[val.accion] || actions['default'];
                if (typeof selectedAction === 'function') {
                    selectedAction();
                }
            }
        },
    },
    computed: {
        ...Vuex.mapState(['functionsPasarella']),
        sumar_items() {
            this.total_valorfactor = 0;

            for (const item of this.array_items) {
                const factor = parseFloat(item.factor.replace(/\./g, '').replace(/,/g, '.')) / 100;

                const valor_item = Number(parseFloat(this.array_doc.valortotal) * factor);
                item.valor_factor = format_number_n_decimal(valor_item, 0);

                this.total_valorfactor += valor_item;
            }
            return this.total_valorfactor;
        },
    },
});
document.addEventListener('click', function (event) {
    pasarella(appDOC_PRO, event);
});
