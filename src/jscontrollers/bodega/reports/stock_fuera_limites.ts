import { fetchBodegas, fetchGetTipoCodigo } from '@/jscontrollers/composables/fetching';
import { show_toast, versaFetch } from '@/jscontrollers/composables/utils';

import loader from '@/jscontrollers/components/loading';
/* eslint-disable */
const ld = loader;
/* eslint-enable */

const _appStockFueraLimite = new Vue({
    el: '.content-wrapper',
    delimiters: ['${', '}'],
    data: function () {
        return {
            getFamilia1: [],
            getFamilia2: [],
            formSelected: {
                codigoBodega: '',
                tipoCodigo: '',
                familia1: '',
                familia2: '',
            },
            loading: false,
        };
    },
    setup() {
        const array_bodega = Vue.ref([]);
        const tipoCodigo = Vue.ref([]);

        Promise.all([fetchBodegas({ estado: 1 }), fetchGetTipoCodigo()]).then(([bodegas, tipoCodigos]) => {
            array_bodega.value = bodegas;
            tipoCodigo.value = tipoCodigos;
        });

        return {
            array_bodega,
            tipoCodigo,
        };
    },
    methods: {
        load_stock_Alertas: async function () {
            this.loading = true;

            if (this.formSelected.codigoBodega === '') {
                show_toast('Warning', 'Debe seleccionar a lo menos una bodega', 'warning', 'warning');
                this.loading = false;
                return;
            }

            const data = new FormData();
            data.append('codigoBodega', this.formSelected.codigoBodega);
            data.append('tipoCodigo', this.formSelected.tipoCodigo);
            data.append('familia1', this.formSelected.familia1);
            data.append('familia2', this.formSelected.familia2);

            const json = await versaFetch({
                url: '/api/getStockFueraLimites',
                method: 'POST',
                data,
            });

            if (typeof json !== 'boolean') {
                if ($('#table_stock_fuera_limites').find('tr').children().length > 0) {
                    $('#table_stock_fuera_limites').find('tr').children().remove();
                    $('#table_stock_fuera_limites').find('tbody').remove();
                    $('#table_stock_fuera_limites').DataTable().destroy();
                    $('#table_stock_fuera_limites').empty();
                }
                $('#table_stock_fuera_limites').DataTable({
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
                        { data: 'alerta' },
                        { data: 'desc_tipocodigo' },
                        { data: 'codigo' },
                        { data: 'desc_codigo' },
                        { data: 'stock_minimo' },
                        { data: 'stock_maximo' },
                        { data: 'stock_actual' },
                        { data: 'diferencia' },
                        { data: 'preingreso' },
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
                $('#table_stock_fuera_limites').DataTable().columns.adjust().draw();
            }
            this.loading = false;
        },
        getItemSelectedDatalist(refInput) {
            const refInputToFormPropertyMap = {
                inputBodega: 'codigoBodega',
                inputFamilia1: 'familia1',
            };
            const formProperty = refInputToFormPropertyMap[refInput];

            this.$refs[refInput].disabled = true;
            const input = this.$refs[refInput];
            const val = input.value;

            if (val === '') {
                this.formSelected[formProperty] = '';
                this.$refs[refInput].disabled = false;
                return;
            }

            const listId = input.getAttribute('list');
            const elem = document.getElementById(listId);
            const option = elem.querySelector(`option[value='${val}']`);

            if (formProperty && option) {
                this.formSelected[formProperty] = option.getAttribute('data-value2') || '';
            }
            this.$refs[refInput].disabled = false;
        },
    },
    watch: {
        'formSelected.tipoCodigo': async function (val) {
            if (val === '') {
                this.getFamilia1 = [];
                this.getFamilia2 = [];
                this.formSelected.familia1 = '';
                this.formSelected.familia2 = '';
            }

            const data = new FormData();
            data.append('estado', '1');
            data.append('id_tipocodigo', val);

            const json = await versaFetch({
                url: '/api/getFamilia1',
                method: 'POST',
                data,
            });

            if (typeof json !== 'boolean') {
                this.getFamilia1 = json;
            }
        },
        'formSelected.familia1': async function (val) {
            if (val === '') {
                this.getFamilia2 = [];
                this.formSelected.familia2 = '';
            }

            const data = new FormData();
            data.append('estado', '1');
            data.append('id_tipocodigo', this.formSelected.tipoCodigo);
            data.append('id_familia1', val);

            const json = await versaFetch({
                url: '/api/getFamilia2',
                method: 'POST',
                data,
            });

            if (typeof json !== 'boolean') {
                this.getFamilia2 = json;
            }
        },
    },
});
