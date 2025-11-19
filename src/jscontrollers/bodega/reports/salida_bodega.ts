import vselect from '@/jscontrollers/components/vselect';
import { fetchBodegas } from '@/jscontrollers/composables/fetching';
import { addDias, getDiaActual, versaFetch } from '@/jscontrollers/composables/utils';

import loader from '@/jscontrollers/components/loading';
/* eslint-disable */
const ld = loader;
/* eslint-enable */

const _appSalidaBodega = new Vue({
    components: { vselect },
    el: '.content-wrapper',
    delimiters: ['${', '}'],
    data: function () {
        return {
            desde: '',
            hasta: '',
            array_bodega: [],
            select_bodega: [],
            loading: false,
        };
    },
    mounted: async function () {
        this.hasta = getDiaActual();
        this.desde = addDias(this.hasta, -30);

        const reponse = await fetchBodegas({ estado: 1 });
        this.array_bodega = reponse.map(item => ({
            text: item.descripcion,
            id: item.codigo,
        }));
    },
    methods: {
        load_ingreso_bodega: async function () {
            this.loading = true;
            const FormD = new FormData();
            FormD.append('desde', this.desde);
            FormD.append('hasta', this.hasta);
            FormD.append('items', JSON.stringify(this.select_bodega));

            const json = await versaFetch({
                url: '/api/getReportSalidaBodega',
                method: 'POST',
                data: FormD,
            });

            if (typeof json !== 'boolean') {
                if ($('#table_salida_bodega').find('tr').children().length > 0) {
                    $('#table_salida_bodega').find('tr').children().remove();
                    $('#table_salida_bodega').find('tbody').remove();
                    $('#table_salida_bodega').DataTable().destroy();
                    $('#table_salida_bodega').empty();
                }
                $('#table_salida_bodega').DataTable({
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
                        { data: 'desc_tipocodigo' },
                        { data: 'codigo' },
                        { data: 'desc_codigo' },
                        { data: 'desc_familia1' },
                        { data: 'desc_familia2' },
                        { data: 'cantidad' },
                        { data: 'valor' },
                        { data: 'desc_bodega' },

                        { data: 'id' },
                        { data: 'created_at' },
                        { data: 'creado_por' },
                        { data: 'ot' },
                        { data: 'observa_vs' },

                        { data: 'desc_campus' },
                        { data: 'desc_area' },
                        { data: 'cod_cgestion' },
                        { data: 'desc_cgestion' },
                        { data: 'grupo1' },
                        { data: 'grupo2' },

                        { data: 'sol_bodega' },
                        { data: 'fecha_sol' },
                        { data: 'sol_creado_por' },
                        { data: 'solicitante' },
                        { data: 'observa_sol' },

                        { data: 'mes' },

                        { data: 'fecha_aprobacion' },

                        {
                            data: '',
                            render: function (data, type, row) {
                                return row['aprueba_solicitante'] === '0' ? 'No' : 'Si';
                            },
                        },
                        { data: 'fecha_aprueba' },
                        { data: 'cuentacontable_codigo' },
                        { data: 'tipo_salida' },
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
                    order: [[9, 'desc']],
                });
                $('#table_salida_bodega').DataTable().columns.adjust().draw();
            }
            this.loading = false;
        },
    },
});
