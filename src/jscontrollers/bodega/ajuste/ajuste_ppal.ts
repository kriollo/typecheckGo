import { addDias, getDiaActual, pasarella, show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
import type { VersaFetchResponse } from 'versaTypes';

const _appAjuste = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    data() {
        return {
            desde: '',
            hasta: '',
            filtra_propios: true,
        };
    },
    mounted() {
        this.hasta = getDiaActual();
        this.desde = addDias(this.hasta, -30);

        this.load_ingreso_ppal();
    },
    methods: {
        async load_ingreso_ppal() {
            const FormD = new FormData();
            FormD.append('desde', this.desde);
            FormD.append('hasta', this.hasta);
            FormD.append('filtra_propios', this.filtra_propios);

            const json = (await versaFetch({
                url: '/api/get_bodega_ajuste_ppal',
                method: 'POST',
                data: FormD,
            })) as VersaFetchResponse | false;

            if (json !== false) {
                if ($('#table_ajuste_ppal').find('tr').children().length > 0) {
                    $('#table_ajuste_ppal').find('tr').children().remove();
                    $('#table_ajuste_ppal').find('tbody').remove();
                    $('#table_ajuste_ppal').DataTable().destroy();
                    $('#table_ajuste_ppal').empty();
                }
                $('#table_ajuste_ppal').DataTable({
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
                                <a class="btn btn-success btn-xs" href="/bodega/ajuste/${row.id}" title="Ver documento">
                                    <i class="fa fa-eye fa-fw"></i>
                                </a>
                                <button
                                    class="btn btn-warning btn-xs"
                                    data-value='{"accion":"delete_documento_ajuste","id":"${row.id}"}'
                                    name="pasarella"
                                    title="Eliminar documento"
                                    typ="button">
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
                    responsive: false,
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
                $('#table_ajuste_ppal').DataTable().columns.adjust().draw();
            }
        },
        async delete_documento_ajuste(id) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Realmente desea eliminar este Ajuste de Inventario?\nSe advierte que una vez hecho esto, no existirá registro del Ajuste',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const FormD = new FormData();
                FormD.append('id', id);
                const response = await versaFetch({
                    url: '/api/delete_bodega_ajuste',
                    method: 'POST',
                    data: FormD,
                });
                if (response.success === 1) {
                    show_toast(response.title ?? 'Success', response.message, 'success', 'success');
                    setTimeout(() => {
                        location.href = '/bodega/ajuste_ppal';
                    }, 1000);
                } else {
                    show_toast(response.title ?? 'Warning', response.message, 'warning', 'warning');
                }
            }
        },
        pasarella(data) {
            const actions = {
                    delete_documento_ajuste: () => this.delete_documento_ajuste(data.id),
                    default: () => {
                        show_toast('Error', 'Acción no permitida', 'error', 'error');
                    },
                },
                fn = actions[data.accion] ?? actions.default;
            if (typeof fn === 'function') fn(data.id);
        },
    },
});
document.addEventListener('click', event => {
    pasarella(_appAjuste, event);
});
