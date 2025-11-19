import {
    FALSE,
    addDias,
    getCookieByName,
    getDiaActual,
    pasarella,
    show_toast,
    versaFetch,
} from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

Vue.component('modalvalesalida', {
    emits: ['close'],
    props: {
        idvalesalida: {
            type: Number,
            default: 0,
            require: true,
        },
    },
    data() {
        return {
            campus: getCookieByName('campus'),
        };
    },
    mounted() {
        const dialog = this.$refs.modalValeSalidaDialog;
        dialog.showModal();
    },
    methods: {
        close: function () {
            const dialog = this.$refs.modalValeSalidaDialog;
            dialog.close();
            this.$emit('close');
        },
        recibo_conforme: async function () {
            const json = await versaFetch({
                url: '/api/reciboConformeValeSalida',
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ id: this.idvalesalida }),
            });
            if (json.success == 1) {
                show_toast(json.title ?? 'success', json.message, 'success', 'success');
                this.close();
            } else {
                show_toast(json.title ?? 'warning', json.message, 'warning', 'warning');
            }
        },
    },
    template: `
        <dialog class="miModal col col-md-8" ref="modalValeSalidaDialog">
            <div class="card mb-0" style="height: 70dvh;">
                <div class="card-body">
                    <iframe style="width: 100%; height:100%; max-height: 600px;border:3px solid black; zoom:117%; overflow: scroll" :src="'/externo/bodega_valesalida_pdf/'+idvalesalida+'?campus='+campus" ref="iframeweb" scrolling="yes"></iframe>
                </div>
                <div class="card-footer p-1">
                    <button type="button" class="btn btn-success" @click="recibo_conforme">Recibo conforme</button>
                    <button type="button" class="btn btn-info float-right" @click="close">Cancelar</button>
                </div>
            </div>
        </dialog>
    `,
});

const appSolicitudPPAL = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    setup() {
        const tipoPendido = Vue.ref('pedido');

        if (window.location.href.includes('pedidomanppal')) {
            tipoPendido.value = 'solicitudmantecion';
        }

        return {
            tipoPendido,
        };
    },
    data: function () {
        return {
            array_sol_pendiente_aprobacion: [],
            array_sol_pendiente_entrega: [],
            array_sol_rechazadas: [],
            array_sol_valesalida_recepcionar: [],
            sol_pendiente_aprobacion_count: 0,
            sol_pendiente_entrega_count: 0,
            sol_rechazadas_count: 0,
            sol_valesalida_recepcionar_count: 0,
            desde: '',
            hasta: '',
            modalValeSalida: false,
            ValeSalidaModal: 0,
        };
    },
    mounted: async function () {
        this.hasta = getDiaActual();
        this.desde = addDias(this.hasta, -30);

        this.LoadSolicitudByEstados('pendiente_aprobacion');
    },
    methods: {
        LoadSolicitudByEstadosCount: async function () {
            const response = await versaFetch({
                url: '/api/getSolicitudBodegaPorEstadosCount',
                method: 'POST',
            });

            this.sol_pendiente_aprobacion_count = response.porAprobar[0].cuenta;
            this.sol_pendiente_entrega_count = response.porDespachar[0].cuenta;
            this.sol_rechazadas_count = response.Rechazadas[0].cuenta;
            this.sol_valesalida_recepcionar_count = response.vales[0].cuenta;
            return true;
        },
        loadSolicitudByEstadoData: async function (LoadLista) {
            const response = await versaFetch({
                url: '/api/getSolicitudBodegaPorEstados',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ LoadLista }),
            });
            return response;
        },
        LoadSolicitudByEstados: async function (LoadLista) {
            const response = await Promise.all([
                this.loadSolicitudByEstadoData(LoadLista),
                this.LoadSolicitudByEstadosCount(),
            ]);

            const [data] = response;
            if (data.success == 1) {
                switch (data.result) {
                    case 'porAprobar':
                        this.array_sol_pendiente_aprobacion = data.data;
                        break;
                    case 'porDespachar':
                        this.array_sol_pendiente_entrega = data.data;
                        break;
                    case 'Rechazadas':
                        this.array_sol_rechazadas = data.data;
                        break;
                    case 'vales':
                        this.array_sol_valesalida_recepcionar = data.data;
                        break;
                }
            }
        },
        GotoSolicitud: function (id) {
            location.href = `/bodega/${this.tipoPendido}/${id}`;
        },
        SendMailSolicitud: async function (id) {
            const json = await versaFetch({
                url: '/api/SendMailSolicitudBodega',
                data: JSON.stringify({ id }),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            show_toast(json.title ?? 'success', json.message, 'success', 'success');
        },
        closeSolicitud: async function (id, origen) {
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
            if (!result.isConfirmed) return;

            const json = await versaFetch({
                url: '/api/CloseSolicitudBodega',
                data: JSON.stringify({ id }),
                method: 'POST',
            });
            show_toast(json.title ?? 'success', json.message, 'success', 'success');
            this.LoadSolicitudByEstados(origen);
        },
        DeleteSolicitud: async function (id, origen) {
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

            if (!result.isConfirmed) return;
            const json = await versaFetch({
                url: '/api/DeleteSolicitudBodega',
                data: JSON.stringify({ id }),
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (json.success == 1) {
                show_toast(json.title ?? 'success', json.message, 'success', 'success');
                this.LoadSolicitudByEstados(origen);
            } else {
                show_toast(json.title ?? 'warning', json.message, 'warning', 'warning');
            }
        },
        LoadSolicitudByFechas: async function () {
            const FormD = new FormData();
            FormD.append('desde', this.desde);
            FormD.append('hasta', this.hasta);
            FormD.append('filtra_propios', this.filtra_propios);
            const json = await versaFetch({
                url: '/api/get_bodega_solicitud_ppal',
                method: 'POST',
                data: FormD,
            });
            if (typeof json !== 'boolean') {
                if ($('#table_solicitud_ppal').find('tr').children().length > 0) {
                    $('#table_solicitud_ppal').find('tr').children().remove();
                    $('#table_solicitud_ppal').find('tbody').remove();
                    $('#table_solicitud_ppal').DataTable().destroy();
                    $('#table_solicitud_ppal').empty();
                }
                $('#table_solicitud_ppal').DataTable({
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
                        { data: 'id' },
                        {
                            data: 'id',
                            render: (data, type, row) => html`
                                <button
                                    type="button"
                                    class="btn btn-primary btn-xs"
                                    data-value='{"accion":"ClonePedido","id":"${data}"}'
                                    name="pasarella"
                                    title="Clonar Pedido">
                                    <i class="fas fa-sync fa-fw"></i>
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-success btn-xs"
                                    data-value='{"accion":"GotoSolicitud","id":"${data}"}'
                                    name="pasarella"
                                    title="Ver documento">
                                    <i class="fa fa-eye fa-fw"></i>
                                </button>

                                ${row['estado_final'] !== 'Pendiente'
                                    ? html`
                                          <button
                                              type="button"
                                              class="btn btn-info btn-xs"
                                              data-value='{"accion":"ViewValesSalidaList","id":"${data}"}'
                                              name="pasarella"
                                              title="Ver Vale de Salidas">
                                              <i class="fa fa-list fa-fw"></i>
                                          </button>
                                      `
                                    : ''}
                            `,
                        },
                        { data: 'created_at' },
                        { data: 'desc_campus' },
                        { data: 'desc_area' },
                        { data: 'cod_cgestion' },
                        { data: 'desc_cgestion' },
                        { data: 'observacion' },
                        { data: 'estado_final' },
                        { data: 'estado_aprobacion' },
                        {
                            data: 'total',
                            render: (data, type, row) => html`
                                <p class="text-right">${row['total']}</p>
                            `,
                        },
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
                $('#table_solicitud_ppal').DataTable().columns.adjust().draw();
            }
        },
        ViewValesSalidaList: async function (id) {
            const json = await versaFetch({
                url: '/api/get_bodega_ValeSalidaBySolicitud',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ id }),
            });
            if (typeof json !== 'boolean') {
                const htmlInner = html`
                    <div class="col-lg-12">
                        <table class="table">
                            <thead>
                                <th>N°</th>
                                <th>Fecha</th>
                                <th>Observación</th>
                            </thead>
                            <tbody>
                                ${json
                                    .map(
                                        element => html`
                                            <tr>
                                                <td>
                                                    <button
                                                        type="button"
                                                        class="btn btn-danger btn-xs"
                                                        data-value='{"accion":"salida_pdf","id":"${element.id}"}'
                                                        name="pasarella"
                                                        title="Ver documento">
                                                        <i class="fa fa-file-pdf fa-fw"></i>
                                                    </button>
                                                    ${element.id}
                                                </td>
                                                <td>${element.created_at}</td>
                                                <td>${element.observacion}</td>
                                            </tr>
                                        `
                                    )
                                    .join('')}
                            </tbody>
                        </table>
                    </div>
                `;

                await Swal.fire({
                    title: 'Vales de Salida asociados a la Solicitud',
                    html: htmlInner,
                    icon: 'info',
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Salir',
                    customClass: {
                        popup: 'swal-wide',
                        htmlContainer: 'swal-target',
                    },
                });
            }
        },
        ClonePedido: function (id) {
            location.href = `/bodega/${this.tipoPendido}/clonepedido${id}`;
        },
        showModalValeSalida: function (id_vale_salida) {
            this.ValeSalidaModal = parseInt(id_vale_salida);
            this.modalValeSalida = true;
        },
        closeModalValeSalida: function () {
            this.modalValeSalida = false;
            this.ValeSalidaModal = 0;
            this.LoadSolicitudByEstados('valesalida_recepcionar');
        },
        pasarella(event) {
            const actions = {
                ClonePedido: () => this.ClonePedido(event.id),
                GotoSolicitud: () => {
                    location.href = `/bodega/${this.tipoPendido}/${event.id}`;
                },
                ViewValesSalidaList: () => this.ViewValesSalidaList(event.id),
                salida_pdf: () => {
                    location.href = `/bodega/salida_pdf/${event.id}`;
                },
            };
            const fn = actions[event.accion] ?? FALSE;
            if (typeof fn === 'function') {
                fn();
            }
        },
    },
    computed: {},
});

document.addEventListener('click', function (event) {
    pasarella(appSolicitudPPAL, event);
});
