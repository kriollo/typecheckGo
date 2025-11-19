import { addDias, getDiaActual, pasarella, show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { usePPalStore } from '@/jscontrollers/usePPalStore';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const _appIngresoPPAL = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    store: usePPalStore,
    setup() {
        const owner_user = Vue.computed(() => usePPalStore.state.owner_user);

        const hasta = Vue.ref(getDiaActual());
        const desde = Vue.ref(addDias(getDiaActual(), -30));
        const filtra_propios = Vue.ref(false);

        return {
            desde,
            hasta,
            filtra_propios,
            owner_user,
        };
    },
    mounted() {
        this.hasta = getDiaActual();
        this.desde = addDias(getDiaActual(), -30);

        this.load_ingreso_ppal();
    },
    methods: {
        load_ingreso_ppal: async function () {
            const FormD = new FormData();
            FormD.append('desde', this.desde);
            FormD.append('hasta', this.hasta);
            FormD.append('filtra_propios', this.filtra_propios);

            const json = await versaFetch({
                url: '/api/get_bodega_ingresos_ppal',
                method: 'POST',
                data: FormD,
            });
            if (typeof json !== 'boolean') {
                if ($('#table_ingreso_ppal').find('tr').children().length > 0) {
                    $('#table_ingreso_ppal').find('tr').children().remove();
                    $('#table_ingreso_ppal').find('tbody').remove();
                    $('#table_ingreso_ppal').DataTable().destroy();
                    $('#table_ingreso_ppal').empty();
                }
                $('#table_ingreso_ppal').DataTable({
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
                                ${row.archivo !== null
                                    ? html`
                                          <a href="${row.ruta}" target="_blank" class="btn btn-info btn-xs">
                                              <i class="fa fa-file fa-fw"></i>
                                              Descarga Documento
                                          </a>
                                      `
                                    : ''}
                                <button
                                    type="button"
                                    class="btn btn-success btn-xs"
                                    data-value='{"accion":"ver_ingreso","id":${row.id}}'
                                    name="pasarella"
                                    title="Ver documento">
                                    <i class="fa fa-eye fa-fw"></i>
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-danger btn-xs"
                                    data-value='{"accion":"generar_pdf","id":${row.id}}'
                                    name="pasarella"
                                    title="Generar PDF">
                                    <i class="fa fa-file-pdf fa-fw"></i>
                                </button>
                                ${this.owner_user.rol === '1' &&
                                html`
                                    <button
                                        type="button"
                                        class="btn btn-warning btn-xs"
                                        data-value='{"accion":"delete_documento_ingreso","id":${row.id}, "origen":"${row.origen}","id_preingreso":${row.id_preingreso} }'
                                        name="pasarella"
                                        title="Eliminar documento">
                                        <i class="fas fa-ban fa-fw"></i>
                                    </button>
                                `}
                            `,
                        },
                        { data: 'desc_tipo_doc_final' },
                        { data: 'docfinal' },
                        { data: 'fecha_doc_final' },

                        { data: 'folion' },
                        { data: 'name' },
                        { data: 'created_at' },
                        { data: 'ndoc' },
                        { data: 'fecha' },
                        { data: 'nombre_proveedor' },
                        { data: 'desc_campus' },
                        { data: 'desc_area' },
                        { data: 'observacion' },
                        { data: 'desc_tipo_compra' },
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
                $('#table_ingreso_ppal').DataTable().columns.adjust().draw();
            }
        },
        delete_documento_ingreso: async function (id) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Realmente desea eliminar este ingreso a Bodega?,\nSe advierte que una vez hecho esto, no existirá registro del ingreso',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, eliminar!',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const FormD = new FormData();
                FormD.append('id', id);
                const data = await versaFetch({
                    url: '/api/delete_bodega_ingresos',
                    method: 'POST',
                    data: FormD,
                });
                if (data.success === 1) {
                    show_toast('Success', data.message, 'Success', 'success');

                    setTimeout(function () {
                        location.href = '/bodega/ingresos_ppal';
                    }, 1000);
                } else {
                    show_toast('Alerta', data.message, data.title, 'danger');
                }
            }
        },
        generar_pdf: function (id) {
            location.href = `/bodega/ingreso_pdf/${id}`;
        },
        ver_ingreso: function (id) {
            location.href = `/bodega/ingresos/${id}`;
        },
        pasarella(accion) {
            const actions = {
                delete_documento_ingreso: () => this.delete_documento_ingreso(accion.id),
                generar_pdf: () => this.generar_pdf(accion.id),
                ver_ingreso: () => this.ver_ingreso(accion.id),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
    },
});
document.addEventListener('click', function (event) {
    pasarella(_appIngresoPPAL, event);
});
