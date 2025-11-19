import vselect from '@/jscontrollers/components/vselect';
import { versaFetch } from '@/jscontrollers/composables/utils';

import loader from '@/jscontrollers/components/loading';
import newICheck from '@/jscontrollers/components/newICheck';
/* eslint-disable */
const ld = loader;
/* eslint-enable */

const _appInventarioBodega = new Vue({
    components: { vselect, newICheck },
    el: '.content-wrapper',
    delimiters: ['${', '}'],
    data: function () {
        return {
            array_bodega: [],
            select_bodega: [],
            check_filtro: false,
            loading: false,
        };
    },
    mounted: async function () {
        const data = new FormData();
        data.append('estado', '1');
        const response = await versaFetch({
            url: '/api/getBodegasByIdUser',
            method: 'POST',
            data,
        });

        this.array_bodega = response
            .filter(item => item.active === '1')
            .map(item => ({
                text: item.descripcion,
                id: item.codigo,
            }));

        if (this.array_bodega.length === 0) {
            this.array_bodega = response.map(item => ({
                text: item.descripcion,
                id: item.codigo,
            }));
        }
    },
    methods: {
        load_ingreso_bodega: async function () {
            this.loading = true;
            const FormD = new FormData();
            FormD.append('items', JSON.stringify(this.select_bodega));
            FormD.append('filtraStockCero', this.check_filtro);

            const json = await versaFetch({
                url: '/api/getReportInventarioBodega',
                method: 'POST',
                data: FormD,
            });

            if (typeof json !== 'boolean') {
                if ($('#table_inventario_bodega').find('tr').children().length > 0) {
                    $('#table_inventario_bodega').find('tr').children().remove();
                    $('#table_inventario_bodega').find('tbody').remove();
                    $('#table_inventario_bodega').DataTable().destroy();
                    $('#table_inventario_bodega').empty();
                }
                $('#table_inventario_bodega').DataTable({
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
                        { data: 'desc_bodega' },
                        { data: 'stock_actual' },
                        { data: 'stock_minimo' },
                        { data: 'stock_maximo' },
                        { data: 'preciocompra' },
                        { data: 'precioventa' },
                        { data: 'desc_familia1' },
                        { data: 'desc_familia2' },
                        { data: 'cod_cuentacontable' },
                        { data: 'desc_cuentacontable' },
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
                $('#table_inventario_bodega').DataTable().columns.adjust().draw();
            }
            this.loading = false;
        },
    },
});
