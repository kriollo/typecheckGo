import { $dom } from '@/jscontrollers/composables/dom-selector';
import { fetchGetProductos, fetchGetTipoCodigo } from '@/jscontrollers/composables/fetching';
import { FALSE, addDias, getDiaActual, show_toast, versaFetch } from '@/jscontrollers/composables/utils';

import loader from '@/jscontrollers/components/loading';
/* eslint-disable */
const ld = loader;
/* eslint-enable */

async function cagar_codigos(self, tipocodigo) {
    self.array_codigo = [];
    $('#list_codigo').prop('disabled', true);
    $('#list_codigo').val('');
    $('#codigo').val(0);

    const data = await fetchGetProductos(tipocodigo);
    if (data) {
        data.forEach(value => {
            self.array_codigo.push({
                codigo: value.codigo,
                descripcion: value.descripcion,
            });
        });
        $('#list_codigo').prop('disabled', false);
        const listCodigo = $dom('#list_codigo');
        if (listCodigo instanceof HTMLElement) {
            listCodigo.focus();
        }
    }
}
function obtener_select_item(self, tabla, selec, inp) {
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
        let element = null;
        switch (tabla) {
            case 'tipocodigo':
                element = $dom('#codigo');
                cagar_codigos(self, match);
                break;
            case 'codigo':
                element = $dom('#cantidad');
                self.load_stock_producto();
                break;
        }
        if (element instanceof HTMLElement) {
            element.focus();
        }
    }
    $(`#${selec}`).prop('disabled', false);
}
const _appStockProducto = new Vue({
    el: '.content-wrapper',
    delimiters: ['${', '}'],
    data: function () {
        return {
            desde: '',
            hasta: '',
            array_tipocodigo: [],
            array_codigo: [],
            array_bodega: [],
            loading: false,
        };
    },
    mounted: async function () {
        this.hasta = getDiaActual();
        this.desde = addDias(this.hasta, -30);

        const response = await fetchGetTipoCodigo();
        this.array_tipocodigo = response.map(value => ({
            value: value.descripcion,
            id: value.id,
        }));
    },
    methods: {
        load_stock_producto: async function () {
            this.loading = true;
            const cod_tipocodigo = ($dom('#tipocodigo') as HTMLSelectElement).value;
            const codigo = ($dom('#codigo') as HTMLSelectElement).value;
            let error = false;

            if (cod_tipocodigo === '') {
                show_toast('Stock Producto', 'Debe seleccionar un tipo de codigo');
                error = true;
            }
            if (codigo === '') {
                show_toast('Stock Producto', 'Debe seleccionar un producto');
                error = true;
            }

            if (FALSE === error) {
                const FormD = new FormData();
                FormD.append('id_tipocodigo', cod_tipocodigo);
                FormD.append('codigo', codigo);

                const json = await versaFetch({
                    url: '/api/getReportStockProducto',
                    method: 'POST',
                    data: FormD,
                });

                if (json) {
                    if ($('#table_stock_producto').find('tr').children().length > 0) {
                        $('#table_stock_producto').find('tr').children().remove();
                        $('#table_stock_producto').find('tbody').remove();
                        $('#table_stock_producto').DataTable().destroy();
                        $('#table_stock_producto').empty();
                    }
                    $('#table_stock_producto').DataTable({
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
                            { data: 'codigo' },
                            { data: 'descripcion' },
                            { data: 'stock_actual' },
                            { data: 'preciocompra' },
                            { data: 'stock_minimo' },
                            { data: 'stock_maximo' },
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
                    $('#table_stock_producto').DataTable().columns.adjust().draw();

                    if (json.codigo && typeof json.codigo === 'object') {
                        // @ts-ignore
                        $('#unidadmedida').val(json.codigo.desc_unidadmedida);
                    }
                }
            }
            this.loading = false;
        },
        obtener_select_item: function (tabla, selec, inp) {
            obtener_select_item(this, tabla, selec, inp);
        },
    },
    computed: {},
});
