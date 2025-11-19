import { $dom } from '@/jscontrollers/composables/dom-selector';
import {
    fecthCampus,
    fecthCuentaContable,
    fetchGetAreas,
    fetchGetCGestion,
    fetchGetCuentaGasto,
    fetchgetProveedores,
} from '@/jscontrollers/composables/fetching';
import {
    addDias,
    format_number_n_decimal,
    getDiaActual,
    pasarella,
    versaFetch,
} from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import loader from '@/jscontrollers/components/loading';
/* eslint-disable */
const ld = loader;
/* eslint-enable */

async function cagar_cuenta_gasto(self, codigo, cod_gastos = '', desc_gasto = '') {
    self.array_cuentagastos = [];
    $('#list_gasto').prop('disabled', true);
    $('#list_gasto').val('');
    $('#cuentagasto').val(0);

    const response = await fetchGetCuentaGasto({ codigo });

    if (typeof response != 'boolean') {
        self.array_cuentagastos = response.map(value => ({
            text: value.codigocuentagasto,
            value: value.descripcion,
        }));
        $('#list_gasto').prop('disabled', false);
        const list_gasto = $dom('#list_gasto') as HTMLInputElement;
        list_gasto.focus();
        if (cod_gastos != '') {
            $('#list_gasto').val(desc_gasto);
            $('#cuentagasto').val(cod_gastos);
        }
    }
}
async function cagar_areas(self, codigo, cod_area, desc_area) {
    self.array_area = [];
    $('#list_area').prop('disabled', true);
    $('#list_area').val('');
    $('#area').val(0);

    $('#list_centrogestion').prop('disabled', true);
    $('#list_centrogestion').val('');
    $('#centrogestion').val(0);

    const data = await fetchGetAreas(codigo);
    if (typeof data != 'boolean') {
        self.array_area = data.map(value => ({
            text: value.codigo,
            value: value.descripcion,
        }));
        $('#list_area').prop('disabled', false);
        const list_area = $dom('#list_area') as HTMLInputElement;
        list_area.focus();
        if (cod_area != '') {
            $('#area').val(cod_area);
            $('#list_area').val(desc_area);
        }
    }
}
async function cagar_centrogestion(self, codigo, cod_centrogestion, desc_centrogestion) {
    $('#list_centrogestion').prop('disabled', true);
    $('#list_centrogestion').val('');
    $('#list_centrogestion').empty();

    $('#centrogestion').val(0);
    self.array_centrogestion = [];

    const codigo_campus = $dom('#campus') as HTMLInputElement;

    const data = await fetchGetCGestion(codigo_campus.value, codigo);
    if (typeof data != 'boolean') {
        self.array_centrogestion = data.map(value => ({
            text: value.codigo,
            value: value.descripcion,
        }));
        $('#list_centrogestion').prop('disabled', false);
        const list_centrogestion = $dom('#list_centrogestion') as HTMLInputElement;
        list_centrogestion.focus();
        if (cod_centrogestion != '') {
            $('#list_centrogestion').val(desc_centrogestion);
            $('#centrogestion').val(cod_centrogestion);
            const valor = $dom('#valor') as HTMLInputElement;
            valor.focus();
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
    if (op != null) match = op.getAttribute('data-value2');
    else $(`#${selec}`).prop('disabled', false);

    $(`#${inp}`).val(match);

    if (match != '') {
        switch (tabla) {
            case 'cuentacontable':
                cagar_cuenta_gasto(self, match, '');
                break;
            case 'campus':
                cagar_areas(self, match, '', '');
                break;
            case 'area':
                cagar_centrogestion(self, match, '', '');
                break;
            case 'centrogestion':
                break;
        }
    }
    $(`#${selec}`).prop('disabled', false);
}

async function ver_oc(id) {
    $('#modal_oc').modal('show');
    const view_oc = $dom('#view_oc') as HTMLInputElement;
    view_oc.value = id;
    const formper = new FormData();
    formper.append('id', id);

    const json = await versaFetch({
        url: '/api/cargardatosoc',
        method: 'POST',
        data: formper,
    });

    if (json.success == 1) {
        const folio = $dom('#folio') as HTMLInputElement;
        folio.value = json.arreglo[0]['folion'];
        const indice = $dom('#indice') as HTMLInputElement;
        indice.value = json.arreglo[0]['indice'];

        const userlisaoc = $dom('#userlisaoc') as HTMLInputElement;
        userlisaoc.value = json.arreglo[0]['userlisaoc'];
        const proyeccion = $dom('#proyeccion') as HTMLInputElement;
        proyeccion.checked = json.arreglo[0]['proyeccion'] == 1;

        const solicitanteoc = $dom('#solicitanteoc') as HTMLInputElement;
        solicitanteoc.value = json.arreglo[0]['solicitante'];
        const fecha = $dom('#fecha') as HTMLInputElement;
        fecha.value = json.arreglo[0]['fecha'];
        const proveedoroc = $dom('#proveedoroc') as HTMLInputElement;
        proveedoroc.value = json.arreglo[0]['rut_proveedor'];
        const list_proveedor_oc = $dom('#list_proveedor_oc') as HTMLInputElement;
        list_proveedor_oc.value = json.arreglo[0]['nombre'];
        const tipooc = $dom('#tipooc') as HTMLInputElement;
        tipooc.value = json.arreglo[0]['tipo_orden'];
        const observacionoc = $dom('#observacionoc') as HTMLInputElement;
        observacionoc.value = json.arreglo[0]['observacion'];
        const valortotal = $dom('#valortotal') as HTMLInputElement;
        valortotal.value = json.arreglo[0]['valortotal'];

        $('#contenido').html('');
        let num = 1;
        for (const item of json.contenidotabla) {
            const cuentagasto = item['cuenta_gasto'] ?? '';
            const tr = html`
                <tr>
                    <td>${num}</td>
                    <td>${item['desc_tipolinea']}</td>
                    <td>${item['cuenta_contable']}</td>
                    <td>${cuentagasto}</td>
                    <td>${item['campus']}</td>
                    <td>${item['area']}</td>
                    <td>${item['centro_gestion']}</td>
                    <td>${item['factor']}</td>
                    <td>${item['valor_factor']}</td>
                    <td>${item['detalle']}</td>
                    <td></td>
                </tr>
            `;
            $('#contenido').append(tr);
            num++;
        }
    }
}
async function ver_docOC(self, ordencompra) {
    const response = await versaFetch({
        url: '/api/get_DOCAsociadoByOC',
        method: 'POST',
        data: JSON.stringify({ ordencompra }),
        headers: { 'Content-Type': 'application/json' },
    });

    self.array_docasociados = [];
    if (typeof response != 'boolean') {
        self.array_docasociados = response;
        self.ordencompra = ordencompra;
        $('#modal_ShowDocAsocioados').modal('show');
    }
}
const appListarOC = new Vue({
    el: '.content-wrapper',
    delimiters: ['${', '}'],
    data: function () {
        return {
            array_encabezado: [],
            array_detalle: [],
            array_campus: [],
            array_area: [],
            array_centrogestion: [],
            array_cuentacontable: [],
            array_cuentagastos: [],
            array_docasociados: [],
            array_proveedor: [],
            ordencompra: '',
            totalutilizado: 0,
            select_filtro: '0',
            select_fecha: '0',
            select_tipo: '0',
            select_asocia: '0',
            fecha_desde: '',
            fecha_hasta: '',
            loading: false,
        };
    },
    mounted: async function () {
        this.loading = true;

        const getPromise = await Promise.all([
            fecthCampus(),
            fecthCuentaContable(),
            fetchgetProveedores({ estado: '1' }),
        ]);

        const [campus, cuentacontable, proveedor] = getPromise;

        this.array_campus = campus.map(item => ({
            value: item.descripcion,
            text: item.id,
        }));

        this.array_cuentacontable = cuentacontable.map(item => ({
            value: item.descripcion,
            text: item.codigo,
        }));

        this.array_proveedor = proveedor.map(item => ({
            text: item.rut,
            value: item.nombre,
            selected: false,
        }));

        this.fecha_desde = addDias(getDiaActual(), -30);
        this.fecha_hasta = getDiaActual();

        this.loading = false;
    },
    methods: {
        search_listar_oc: async function () {
            this.loading = true;

            const FormD = new FormData();
            FormD.append('tipo', this.select_tipo);
            FormD.append('fecha', this.select_fecha);
            FormD.append('filtro', this.select_filtro);
            FormD.append('asocia', this.select_asocia);
            FormD.append('desde', this.fecha_desde);
            FormD.append('hasta', this.fecha_hasta);

            const campus = $dom('#campus') as HTMLInputElement;
            const area = $dom('#area') as HTMLInputElement;
            const centrogestion = $dom('#centrogestion') as HTMLInputElement;
            const cuentacontable = $dom('#cuentacontable') as HTMLInputElement;
            const cuentagasto = $dom('#cuentagasto') as HTMLInputElement;
            const proveedor = $dom('#proveedor') as HTMLInputElement;

            FormD.append('cod_campus', campus?.value ?? '');
            FormD.append('cod_area', area?.value ?? '');
            FormD.append('cod_centrogestion', centrogestion?.value ?? '');

            FormD.append('cod_cuentacontable', cuentacontable?.value ?? '');
            FormD.append('cod_cuentagasto', cuentagasto?.value ?? '');

            FormD.append('rut_proveedor', proveedor?.value ?? '');

            let url = '';
            if (this.select_tipo == 0) {
                url = '/api/get_OCByEstado';
            } else {
                url = '/api/get_OCByDetalleALL';
            }

            const response = await versaFetch({
                url,
                method: 'POST',
                data: FormD,
            });

            if (this.select_tipo == 0) {
                if ($('#tabla_ordencompraResumen').find('tr').children().length > 0) {
                    $('#tabla_ordencompraResumen').find('tr').children().remove();
                    $('#tabla_ordencompraResumen').find('tbody').remove();
                    $('#tabla_ordencompraResumen').DataTable().destroy();
                    $('#tabla_ordencompraResumen').empty();
                }
                $('#tabla_ordencompraResumen').DataTable({
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
                    columnDefs: response.encabezado,
                    columns: [
                        {
                            data: 'id',
                            render: (data, type, row) => html`
                                <button
                                    type="button"
                                    class="btn btn-success btn-xs"
                                    data-value='{"accion":"ver_oc","id":"${row.id}"}'
                                    name="pasarella"
                                    title="Ver Orden de Compra">
                                    <i class="fa fa-eye"></i>
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-info btn-xs"
                                    data-value='{"accion":"ver_docOC","ordencompra":"${row.folion};${row.indice}"}'
                                    name="pasarella"
                                    title="Ver Documentos Asociados">
                                    <i class="fa fa-list"></i>
                                </button>
                            `,
                        },
                        { data: 'folionindice' },
                        { data: 'fecha' },
                        { data: 'tipo_orden' },
                        { data: 'estado_descripcion' },
                        { data: 'nombre' },
                        { data: 'totalvalor' },
                        { data: 'totalvalorconsumo' },
                        {
                            data: 'id',
                            render: (data, type, row) => html`
                                <div class="progress progress-md">
                                    <div class="progress-bar bg-primary" style="width:${row.porc}%">${row.porc} %</div>
                                </div>
                            `,
                        },
                        { data: 'user_creador' },
                        {
                            data: '',
                            render: function (data, type, row) {
                                return row['proyeccion'] == 1 ? 'SI' : 'NO';
                            },
                        },
                    ],
                    data: response.data,
                    info: true,
                    searching: true,
                    paging: true,
                    responsive: true,
                    lengthMenu: [
                        [5, 10, 25, 50, -1],
                        [5, 10, 25, 50, 'Todos'],
                    ],
                    pageLength: 5,
                    dom:
                        "<'row'<'col-sm-12 col-md-4'l><'col-sm-12 col-md-4'B><'col-sm-12 col-md-4'f>>" +
                        "<'row'<'col-sm-12'tr>>" +
                        "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
                    buttons: ['excelHtml5'],
                });
                $('#tabla_ordencompraResumen').DataTable().columns.adjust().draw();
            } else {
                if ($('#tabla_ordencompraDetalle').find('tr').children().length > 0) {
                    $('#tabla_ordencompraDetalle').find('tr').children().remove();
                    $('#tabla_ordencompraDetalle').find('tbody').remove();
                    $('#tabla_ordencompraDetalle').DataTable().destroy();
                    $('#tabla_ordencompraDetalle').empty();
                }
                $('#tabla_ordencompraDetalle').DataTable({
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
                    columnDefs: response.encabezado,
                    columns: [
                        {
                            data: 'id',
                            render: (data, type, row) => html`
                                <button
                                    type="button"
                                    class="btn btn-success btn-xs"
                                    data-value='{"accion":"ver_oc","id":"${row.id}"}'
                                    name="pasarella"
                                    title="Ver Orden de Compra">
                                    <i class="fa fa-eye"></i>
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-info btn-xs"
                                    data-value='{"accion":"ver_docOC","ordencompra":"${row.folion};${row.indice}"}'
                                    name="pasarella"
                                    title="Ver Documentos Asociados">
                                    <i class="fa fa-list"></i>
                                </button>
                            `,
                        },
                        { data: 'folionindice' },
                        { data: 'rut_proveedor' },
                        { data: 'nom_proveedor' },
                        { data: 'fecha' },
                        { data: 'solicitante' },
                        { data: 'tipo_orden' },
                        { data: 'linea' },
                        { data: 'desc_tipolinea' },
                        { data: 'cod_cuentacontable' },
                        { data: 'desc_cuentacontable' },
                        { data: 'cod_cuentagasto' },
                        { data: 'desc_cuentagasto' },
                        { data: 'cod_campus' },
                        { data: 'desc_campus' },
                        { data: 'cod_area' },
                        { data: 'desc_area' },
                        { data: 'cod_centrogestion' },
                        { data: 'desc_centrogestion' },
                        { data: 'cod_proyecto' },
                        { data: 'desc_proyecto' },
                        { data: 'factor' },
                        { data: 'valorfactor' },
                        { data: 'valorutilizado' },
                        {
                            data: 'saldo',
                            render: function (data, type, row) {
                                return row['desc_estado'] == 'Cerrada Manual' ? '0' : row['saldo'];
                            },
                        },
                        { data: 'desc_estado' },
                        { data: 'detalle' },
                        { data: 'user_creador' },
                        { data: 'userlisaoc' },
                        {
                            data: '',
                            render: function (data, type, row) {
                                return row['proyeccion'] == 1 ? 'SI' : 'NO';
                            },
                        },
                    ],
                    data: response.data,
                    info: true,
                    searching: true,
                    paging: true,
                    responsive: true,
                    lengthMenu: [
                        [5, 10, 25, 50, -1],
                        [5, 10, 25, 50, 'Todos'],
                    ],
                    pageLength: 5,
                    dom:
                        "<'row'<'col-sm-12 col-md-4'l><'col-sm-12 col-md-4'B><'col-sm-12 col-md-4'f>>" +
                        "<'row'<'col-sm-12'tr>>" +
                        "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
                    buttons: ['excelHtml5'],
                });
                $('#tabla_ordencompraDetalle').DataTable().columns.adjust().draw();
            }

            this.loading = false;
        },
        generate_api_oc: function (url) {
            if (this.select_tipo == 0) {
                url += '/api/g_get_OCByEstado';
            } else {
                url += '/api/g_get_OCByDetalleALL';
            }

            url += `?tipo=${this.select_tipo}`;
            url += `&fecha=${this.select_fecha}`;
            url += `&filtro=${this.select_filtro}`;
            url += `&asocia=${this.select_asocia}`;
            url += `&desde=${$('#fecha_desde').val()}`;
            url += `&hasta=${$('#fecha_hasta').val()}`;

            url += `&cod_campus=${$('#campus').val()}`;
            url += `&cod_area=${$('#area').val()}`;
            url += `&cod_centrogestion=${$('#centrogestion').val()}`;

            url += `&cod_cuentacontable=${$('#cuentacontable').val()}`;
            url += `&cod_cuentagasto=${$('#cuentagasto').val()}`;

            url += `&rut_proveedor=${$('#proveedor').val()}`;

            Swal.fire({
                title: '/api',
                text: `Copiar la siguiente URL: ${url}`,
                confirmButtonText: 'OK',
            });
        },
        ver_oc: function (id) {
            ver_oc(id);
        },
        ver_docOC: function (ordencompra) {
            ver_docOC(this, ordencompra);
        },
        pasarella(event) {
            const actions = {
                ver_oc: () => this.ver_oc(event.id),
                ver_docOC: () => this.ver_docOC(event.ordencompra),
            };
            const fn = actions[event.accion] || (() => {});
            if (typeof fn === 'function') {
                fn();
            }
        },
        obtener_select_item(tabla, selec, inp) {
            obtener_select_item(this, tabla, selec, inp);
        },
    },
    computed: {
        sumar_items() {
            let total_valorfactor = 0;
            this.array_docasociados.forEach(item => {
                total_valorfactor += parseFloat(item.valor_factor.replace(/\./g, '').replace(/,/g, '.'));
            });
            return `Total Valor Utilizado: ${format_number_n_decimal(total_valorfactor, 0)}`;
        },
    },
});

import eventDelegator from '@/jscontrollers/composables/eventDelegator';

eventDelegator.register('pasarella_listaroc', 'click', function (event) {
    pasarella(appListarOC, event);
});
