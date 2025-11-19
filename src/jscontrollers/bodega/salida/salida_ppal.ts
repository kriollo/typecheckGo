import {
    addDias,
    getCookieByName,
    getDiaActual,
    pasarella,
    show_toast,
    versaFetch,
} from '@/jscontrollers/composables/utils';
import { usePPalStore } from '@/jscontrollers/usePPalStore';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import modal from '@/jscontrollers/components/modal';
import newModal from '@/jscontrollers/components/newModal';
/* eslint-disable */
const m = modal;
/* eslint-enable */

Vue.component('modalviewvalesalida', {
    name: 'modalviewvalesalida',
    components: { newModal },
    emits: ['accion'],
    props: {
        showmodal: {
            type: Boolean,
            required: true,
        },
        param: {
            type: Object,
            required: true,
        },
    },
    setup(props) {
        const showModal = Vue.computed(() => props.showmodal);
        const param = Vue.computed(() => props.param);

        return {
            showModal,
            param,
        };
    },
    computed: {
        total_vale() {
            let total = 0;
            if (typeof this.param.detalle === 'object') {
                for (const item of this.param.detalle) {
                    total += item.valor * item.cantidad;
                }
            }
            return total;
        },
    },
    methods: {
        accion() {
            this.$emit('accion', { accion: 'closeModal' });
        },
    },
    template: html`
        <newModal :showModal="showModal" @accion="accion" idModal="viewValeSalida">
            <template v-slot:title>
                Vale de Salida Nº: {{ param['encabezado'].id }} -
                <h6>
                    <span class="text-bold">Creado por:</span>
                    {{ param['encabezado'].name }} -
                    <span class="text-bold">Fecha Registro:</span>
                    {{ param['encabezado'].created_at }}
                </h6>
            </template>
            <template v-slot:body>
                <div class="col col-md-12">
                    <div class="row">
                        <h6>
                            <span class="text-bold">Solicitado por:</span>
                            {{ param['pedido'].solicitante }} -
                            <span class="text-bold">Fecha Registro:</span>
                            {{ param['pedido'].created_at }}
                        </h6>
                    </div>
                    <p></p>
                    <div class="row">
                        <div class="col col-lg-4">
                            <span class="text-bold">Campus:</span>
                            {{ param['encabezado'].desc_campus }}
                        </div>
                        <div class="col col-lg-4">
                            <span class="text-bold">Area:</span>
                            {{ param['encabezado'].desc_area }}
                        </div>
                        <div class="col col-lg-4">
                            <span class="text-bold">C.Gestión:</span>
                            {{ param['encabezado'].cod_cgestion }} - {{ param['encabezado'].desc_cgestion }}
                        </div>
                    </div>
                    <p></p>
                    <div class="row">
                        <div class="col col-lg-4">
                            <span class="text-bold">OT:</span>
                            {{ param['encabezado'].ot }}
                        </div>
                        <div class="col col-lg-8">
                            <span class="text-bold">Observación:</span>
                            <br />
                            {{ param['encabezado'].observacion }}
                        </div>
                    </div>
                    <hr />
                    <div class="vertical-scrollable">
                        <div class="row">
                            <table class="table table-borderless table-responsive-lg">
                                <thead>
                                    <th>Código</th>
                                    <th>Descripción</th>
                                    <th>Bodega</th>
                                    <th>Cantidad</th>
                                    <th>Valor</th>
                                    <th>Total</th>
                                </thead>
                                <tbody>
                                    <tr v-for="item in param.detalle">
                                        <td>{{ item.codigo }}</td>
                                        <td>{{ item.desc_codigo }}</td>
                                        <td>{{ item.desc_bodega }}</td>
                                        <td class="text-right">{{ item.cantidad | format_number }}</td>
                                        <td class="text-right">{{ item.valor | format_number }}</td>
                                        <td class="text-right">{{ item.cantidad * item.valor | format_number }}</td>
                                    </tr>
                                    <tr>
                                        <td class="text-right" colspan="5">Total:</td>
                                        <td class="text-right">{{ total_vale | format_number }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-secondary" @click="accion">Cerrar</button>
            </template>
        </newModal>
    `,
});
const appSalida = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    store: usePPalStore,
    data: function () {
        return {
            array_sol_pendientes: [],
            array_sol_EnProceso: [],
            array_vale_pendiente: [],
            showModal: false,
            param_component: {
                encabezado: {
                    id: 0,
                },
                pedido: {
                    name: '',
                },
            },
        };
    },
    setup() {
        const owner_user = Vue.computed(() => usePPalStore.state.owner_user);

        const rol_user = Vue.computed(() => owner_user.value.rol);
        const id_user = Vue.computed(() => owner_user.value.id_user);

        const hasta = Vue.ref(getDiaActual());
        const desde = Vue.ref(addDias(getDiaActual(), -30));

        return {
            rol_user,
            id_user,
            hasta,
            desde,
        };
    },
    mounted() {
        this.LoadSolicitudByEstados();
    },
    methods: {
        LoadSolicitudByEstados: async function () {
            const response = await versaFetch({
                method: 'POST',
                url: '/api/getAllSolicitudBodegaPorEstados',
            });
            this.array_sol_pendientes = response.porAprobar;
            this.array_sol_EnProceso = response.porDespachar;
            this.array_vale_pendiente = response.valesSalida;
        },
        GotoSolicitud: function (id) {
            location.href = `/bodega/solicitud/${id}`;
        },
        SendMailSolicitud: async function (id) {
            const json = await versaFetch({
                method: 'POST',
                url: '/api/SendMailSolicitudBodega',
                data: { id: id },
            });
            show_toast(json.title, json.message, 'success', 'success');
        },
        closeSolicitud: async function (id) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de Cerrar esta Pedido a Bodega?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const json = await versaFetch({
                    method: 'POST',
                    url: '/api/CloseSolicitudBodega',
                    data: { id: id },
                });
                show_toast(json.title, json.message, 'success', 'success');
                this.LoadSolicitudByEstados();
            }
        },
        DeleteSolicitud: async function (id) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de eliminar esta Pedido a Bodega?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const json = await versaFetch({
                    method: 'POST',
                    url: '/api/DeleteSolicitudBodega',
                    data: { id },
                });
                if (json.success === 1) {
                    show_toast(json.title, json.message, 'success', 'success');

                    this.LoadSolicitudByEstados();
                } else {
                    show_toast(json.title, json.message, 'Warning', 'warning');
                }
            }
        },
        LoadValeSalidaByFechas: async function () {
            const FormD = new FormData();
            FormD.append('desde', this.desde);
            FormD.append('hasta', this.hasta);
            FormD.append('filtra_propios', this.filtra_propios);

            const json = await versaFetch({
                method: 'POST',
                url: '/api/get_bodega_valesalida_ppal',
                data: FormD,
            });
            if (typeof json !== 'boolean') {
                if ($('#table_valesalida_ppal').find('tr').children().length > 0) {
                    $('#table_valesalida_ppal').find('tr').children().remove();
                    $('#table_valesalida_ppal').find('tbody').remove();
                    $('#table_valesalida_ppal').DataTable().destroy();
                    $('#table_valesalida_ppal').empty();
                }
                $('#table_valesalida_ppal').DataTable({
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
                    columnDefs: json.encabezado,
                    columns: [
                        {
                            data: 'id',
                            render: (data, type, row) => html`
                                        <button type="button" class="btn btn-success btn-xs" data-value='{"accion":"verValeSalida","id":"${row.id}"}'
                                        name="pasarella"
                                         title="Ver documento">
                                            <i class="fa fa-eye fa-fw"></i>
                                            </a>
                                        </button>
                                        <button type="button" class="btn btn-danger btn-xs" data-value='{"accion":"generar_pdf","id":"${row.id}"}'
                                        name="pasarella"
                                        title="genera pdf">
                                            <i class="fa fa-file-pdf fa-fw"></i>
                                            </a>
                                        </button>
                                        ${
                                            this.rol_user === '1' &&
                                            html`
                                                <button type="button" class="btn btn-warning btn-xs" data-value='{"accion":"deleteValeSalida","id":"${row.id}"}'
                                                name="pasarella"
                                                    title="Eliminar documento">
                                                    <i class="fas fa-ban fa-fw"></i>
                                                    </a>
                                                </button>`
                                        }`,
                        },
                        { data: 'id' },
                        { data: 'created_at' },
                        { data: 'desc_campus' },
                        { data: 'desc_area' },
                        { data: 'cod_cgestion' },
                        { data: 'desc_cgestion' },
                        { data: 'ot' },
                        { data: 'observacion' },
                    ],
                    data: json.data,
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
                $('#table_valesalida_ppal').DataTable().columns.adjust().draw();
            }
        },
        GotoValeSalida: function (id) {
            location.href = `/bodega/vale_salida/${id}`;
        },
        change_update_modal: function (estatus) {
            this.showModal = estatus;
        },
        viewValeSalida: async function (id) {
            const json = await versaFetch({
                url: '/api/get_bodega_ValeSalidaById',
                method: 'POST',
                data: { id },
            });

            this.param_component = json;
            this.showModal = true;
        },
        generar_pdf_pedido: function (id) {
            location.href = `/bodega/pedido_pdf/${id}?campus=${getCookieByName('campus')}`;
        },
        delete_documento_valesalida: async function (id) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de eliminar esta Vale de Salida?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const json = await versaFetch({
                    url: '/api/DeleteValeSalida',
                    method: 'POST',
                    data: { id },
                });

                show_toast(json.title, json.message, 'success', 'success');
                this.LoadValeSalidaByFechas();
            }
        },
        sendRecordatorioRecepcion: async function (id) {
            const json = await versaFetch({
                url: '/api/SendMailRecordatorioRecepcion',
                method: 'POST',
                data: { id },
            });
            show_toast(json.title, json.message, 'success', 'success');
        },
        generar_pdf_valesalida: function (id) {
            location.href = `/bodega/salida_pdf/${id}?campus=${getCookieByName('campus')}`;
        },
        accion(accion) {
            const actions = {
                verValeSalida: () => this.viewValeSalida(accion.id),
                generar_pdf: () => this.generar_pdf_valesalida(accion.id),
                deleteValeSalida: () => this.delete_documento_valesalida(accion.id),
                closeModal: () => this.change_update_modal(false),
            };
            const fn = actions[accion.accion] || (() => {});
            if (typeof fn === 'function') {
                fn();
            }
        },
    },
});

document.addEventListener('click', function (event) {
    pasarella(appSalida, event, 'accion');
});
