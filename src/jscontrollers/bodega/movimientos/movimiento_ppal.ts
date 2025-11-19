import { addDias, getDiaActual, pasarella, show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const appMovimientoBodegaPPal = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    data: function () {
        return {
            desde: addDias(getDiaActual(), -30),
            hasta: getDiaActual(),
            filtra_propios: true,
            array_ingreso_ppal: [],
        };
    },
    mounted: function () {
        this.load_ingreso_ppal();
    },
    methods: {
        load_ingreso_ppal: async function () {
            const FormD = new FormData();
            FormD.append('desde', this.desde);
            FormD.append('hasta', this.hasta);
            FormD.append('filtra_propios', this.filtra_propios);

            const json = await versaFetch({
                url: '/api/get_bodega_movimientos_ppal',
                method: 'POST',
                data: FormD,
            });

            if (!(typeof json === 'boolean')) {
                if ($('#table_movimiento_ppal').find('tr').children().length > 0) {
                    $('#table_movimiento_ppal').find('tr').children().remove();
                    $('#table_movimiento_ppal').find('tbody').remove();
                    $('#table_movimiento_ppal').DataTable().destroy();
                    $('#table_movimiento_ppal').empty();
                }
                $('#table_movimiento_ppal').DataTable({
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
                                <button
                                    type="button"
                                    class="btn btn-success btn-xs"
                                    data-value='{ "id": ${row.id}, "accion": "verMovimiento" }'
                                    name="pasarella"
                                    title="Ver documento">
                                    <i class="fa fa-eye fa-fw"></i>
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-warning btn-xs"
                                    data-value='{ "id": ${row.id} , "accion": "delete_documento_movimiento" }'
                                    name="pasarella"
                                    title="Eliminar documento">
                                    <i class="fas fa-ban fa-fw"></i>
                                </button>
                            `,
                        },
                        { data: 'name' },
                        { data: 'created_at' },
                        { data: 'id' },
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
                $('#table_movimiento_ppal').DataTable().columns.adjust().draw();
            }
        },
        delete_documento_movimiento: async function (id) {
            const result = await Swal.fire({
                title: 'Está seguro de eliminar el documento?',
                text: 'Una vez eliminado no se podrá recuperar',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Eliminar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const data = await versaFetch({
                    url: '/api/delete_bodega_movimiento',
                    method: 'POST',
                    data: JSON.stringify({ id }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (data.success == 1) {
                    show_toast(data.title, data.message, 'success', 'success');
                    setTimeout(function () {
                        location.href = '/bodega/movimientos_ppal';
                    }, 1000);
                } else {
                    show_toast(data.title, data.message, 'warning', 'warning');
                }
            }
        },
        pasarella(event) {
            const actions = {
                delete_documento_movimiento: () => this.delete_documento_movimiento(event.id),
                verMovimiento: () => {
                    location.href = `/bodega/movimiento/${event.id}`;
                },
            };
            const fn = actions[event.accion];
            if (typeof fn === 'function') {
                fn();
            }
        },
    },
});

document.addEventListener('click', function (event) {
    pasarella(appMovimientoBodegaPPal, event);
});
