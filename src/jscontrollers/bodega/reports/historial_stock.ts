import { $dom } from '@/jscontrollers/composables/dom-selector';
import { fetchGetBodegaByCodigo, fetchGetProductos, fetchGetTipoCodigo } from '@/jscontrollers/composables/fetching';
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
    if (typeof data !== 'boolean') {
        $.each(data, function (index, value) {
            self.array_codigo.push({
                codigo: value.codigo,
                descripcion: value.descripcion,
            });
        });
        $('#list_codigo').prop('disabled', false);
        const list_codigo = $dom('#list_codigo');
        if (list_codigo instanceof HTMLElement) {
            list_codigo.focus();
        }
    }
}
async function cagar_bodegas(self, tipocodigo, codigo) {
    self.array_bodega = [];
    $('#list_bodega').prop('disabled', true);
    $('#list_bodega').val('');
    $('#bodega').val(0);

    const data = await fetchGetBodegaByCodigo({
        id_tipocodigo: tipocodigo,
        codigo,
    });
    if (typeof data !== 'boolean') {
        $.each(data, function (index, value) {
            self.array_bodega.push({
                id: value.cod_bodega,
                value: value.desc_bodega,
            });
        });
        $('#list_bodega').prop('disabled', false);
        const list_bodega = $dom('#list_bodega');
        if (list_bodega instanceof HTMLElement) {
            list_bodega.focus();
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
                cagar_bodegas(self, $('#tipocodigo').val(), match);
                break;
            case 'bodega':
                element = $dom('#desde');
                break;
        }
        if (element instanceof HTMLElement) {
            element.focus();
        }
    }
    $(`#${selec}`).prop('disabled', false);
}
const _appHistStock = new Vue({
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
        if (typeof response !== 'boolean') {
            this.array_tipocodigo = response.map(item => ({
                value: item.descripcion,
                id: item.id,
            }));
        }
    },
    methods: {
        load_historial_stock: async function () {
            this.loading = true;
            const cod_tipocodigo = ($dom('#tipocodigo') as HTMLSelectElement).value;
            const codigo = ($dom('#codigo') as HTMLSelectElement).value;
            const codigo_bodega = ($dom('#bodega') as HTMLSelectElement).value;
            let error = false;

            if (cod_tipocodigo === '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un tipo de codigo');
                error = true;
            }
            if (codigo === '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un producto');
                error = true;
            }
            if (codigo_bodega === '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una bodega de destino');
                error = true;
            }

            if (FALSE === error) {
                const FormD = new FormData();
                FormD.append('id_tipocodigo', cod_tipocodigo);
                FormD.append('codigo', codigo);
                FormD.append('cod_bodega', codigo_bodega);
                FormD.append('desde', this.desde);
                FormD.append('hasta', this.hasta);
                FormD.append('filtra_propios', this.filtra_propios);
                const json = await versaFetch({
                    url: '/api/getHistorialCodigo',
                    method: 'POST',
                    data: FormD,
                });
                if (typeof json !== 'boolean') {
                    if ($('#table_historial_stock').find('tr').children().length > 0) {
                        $('#table_historial_stock').find('tr').children().remove();
                        $('#table_historial_stock').find('tbody').remove();
                        $('#table_historial_stock').DataTable().destroy();
                        $('#table_historial_stock').empty();
                    }
                    $('#table_historial_stock').DataTable({
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
                            { data: 'fecha' },
                            { data: 'detalle' },
                            { data: 'entrada' },
                            { data: 'salida' },
                            { data: 'existencia' },
                            { data: 'valorentrada' },
                            { data: 'valorsalida' },
                            { data: 'name' },
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
                        order: [[0, 'desc']],
                    });
                    $('#table_historial_stock').DataTable().columns.adjust().draw();
                }
            }
            this.loading = false;
        },
        obtener_select_item: function (tabla, selec, inp) {
            obtener_select_item(this, tabla, selec, inp);
        },
    },
});
