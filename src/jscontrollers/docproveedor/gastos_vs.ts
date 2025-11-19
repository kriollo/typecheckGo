import { $dom } from '@/jscontrollers/composables/dom-selector';
import { fecthCampus } from '@/jscontrollers/composables/fetching';
import {
    format_number_n_decimal,
    format_number_n_decimal_us,
    getAnno,
    getAnnoMes,
    getDiaActual,
    versaFetch,
} from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import loader from '@/jscontrollers/components/loading';
/* eslint-disable */
const l = loader;
/* eslint-enable */

const cagar_areas = async (self, codigo, cod_area, desc_area) => {
    self.array_area = [];
    $('#list_area').prop('disabled', true);
    $('#list_area').val('');
    $('#area').val(0);

    $('#list_centrogestion').prop('disabled', true);
    $('#list_centrogestion').val('');
    $('#centrogestion').val(0);

    const FormD = new FormData();
    FormD.append('codigo', codigo);
    FormD.append('estado', '1');

    const data = await versaFetch({
        url: '/api/getAreas',
        method: 'POST',
        data: FormD,
    });

    if (typeof data !== 'boolean') {
        data.forEach(value => {
            self.array_area.push({
                text: value.codigo,
                value: value.descripcion,
            });
        });
        $('#list_area').prop('disabled', false);
        const list_area = $dom('#list_area') as HTMLSelectElement;
        list_area.focus();
        if (cod_area != '') {
            $('#area').val(cod_area);
            $('#list_area').val(desc_area);
        }
    }
};
const cagar_centrogestion = async (self, codigo, cod_centrogestion, desc_centrogestion) => {
    $('#list_centrogestion').prop('disabled', true);
    $('#list_centrogestion').val('');
    $('#list_centrogestion').empty();

    $('#centrogestion').val(0);
    self.array_centrogestion = [];

    const codigo_campus = $('#campus').val();
    const FormD = new FormData();
    FormD.append('codigo_campus', String(codigo_campus));
    FormD.append('codigo_area', codigo);
    FormD.append('estado', '1');

    const data = await versaFetch({
        url: '/api/getCentroGestion',
        method: 'POST',
        data: FormD,
    });

    if (typeof data !== 'boolean') {
        data.forEach(value => {
            self.array_centrogestion.push({
                text: value.codigo,
                value: value.descripcion,
            });
        });
        $('#list_centrogestion').prop('disabled', false);
        const list_centrogestion = $dom('#list_centrogestion');
        if (list_centrogestion instanceof HTMLSelectElement) {
            list_centrogestion.focus();
        }
        if (cod_centrogestion != '') {
            $('#list_centrogestion').val(desc_centrogestion);
            $('#centrogestion').val(cod_centrogestion);
            const element = $dom('#valor');
            if (element instanceof HTMLSelectElement) {
                element.focus();
            }
        }
    }
};

const _appGastosVS = new Vue({
    el: '.content-wrapper',
    delimiters: ['${', '}'],
    data: function () {
        return {
            select_fecha: '0',
            fecha_desde: '',
            fecha_hasta: '',
            annomes_desde: '',
            annomes_hasta: '',
            anno_PRE: '',
            anno_PRO: '',
            presupuesto_cargado: 0,
            proyecto_cargado: 0,
            proyeccion_cargado: 0,
            array_campus: [],
            array_area: [],
            array_centrogestion: [],
            loader: false,
        };
    },
    mounted: async function () {
        this.fecha_desde = getDiaActual();
        this.fecha_hasta = getDiaActual();
        this.annomes_desde = getAnnoMes();
        this.annomes_hasta = getAnnoMes();

        this.anno_PRE = getAnno();
        this.anno_PRO = getAnno();

        const data = await fecthCampus();
        data.forEach(value => {
            this.array_campus.push({
                value: value.descripcion,
                text: value.id,
            });
        });
    },
    methods: {
        async search_gastos_vs() {
            this.loader = true;
            if ($('#tabla_gastos_vs').find('tr').children().length > 0) {
                $('#tabla_gastos_vs').find('tr').children().remove();
                $('#tabla_gastos_vs').find('tbody').remove();
                $('#tabla_gastos_vs').DataTable().destroy();
                $('#tabla_gastos_vs').empty();
            }

            const FormD = new FormData();
            FormD.append('fecha', this.select_fecha);
            FormD.append('desde', this.fecha_desde);
            FormD.append('hasta', this.fecha_hasta);
            FormD.append('annomes_desde', this.annomes_desde);
            FormD.append('annomes_hasta', this.annomes_hasta);

            const response = await versaFetch({
                url: '/api/get_Gastos_VS',
                method: 'POST',
                data: FormD,
            });

            $('#tabla_gastos_vs').DataTable({
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
                    { data: 'annomesgasto' },
                    { data: 'cod_campus' },
                    { data: 'desc_campus' },
                    { data: 'cod_area' },
                    { data: 'desc_area' },
                    { data: 'cod_centrogestion' },
                    { data: 'desc_centrogestion' },
                    { data: 'cod_cuentacontable' },
                    { data: 'desc_cuentacontable' },
                    { data: 'cod_cuentagasto' },
                    { data: 'desc_cuentagasto' },
                    { data: 'total' },
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
            $('#tabla_gastos_vs').DataTable().columns.adjust().draw();
            this.loader = false;
        },
        async search_presupuesto_vs() {
            this.loader = true;

            if ($('#tabla_presupuesto_vs').find('tr').children().length > 0) {
                $('#tabla_presupuesto_vs').find('tr').children().remove();
                $('#tabla_presupuesto_vs').find('tbody').remove();
                $('#tabla_presupuesto_vs').DataTable().destroy();
                $('#tabla_presupuesto_vs').empty();
            }

            if ((await this.find_presupuesto()) == 1) {
                const FormD = new FormData();
                FormD.append('anno', this.anno_PRE);
                const campus = String($('#campus').val());
                const area = String($('#area').val());
                const centrogestion = String($('#centrogestion').val());

                FormD.append('cod_campus', campus);
                FormD.append('cod_area', area);
                FormD.append('cod_centrogestion', centrogestion);

                const response = await versaFetch({
                    url: '/api/get_Presupuesto_VS',
                    method: 'POST',
                    data: FormD,
                });

                $('#div_cargando_PRE').html('');
                $('#tabla_presupuesto_vs').DataTable({
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
                            data: '',
                            render: function () {
                                return '';
                            },
                        },
                        { data: 'cod_campus' },
                        { data: 'desc_campus' },
                        { data: 'cod_area' },
                        { data: 'desc_area' },
                        { data: 'cod_centrogestion' },
                        { data: 'desc_centrogestion' },
                        { data: 'cod_cuentacontable' },
                        { data: 'desc_cuentacontable' },
                        { data: 'cod_cuentagasto' },
                        { data: 'desc_cuentagasto' },
                        {
                            data: 'presupuesto',
                            render: (data, type, row) => html`
                                <div class="text-right">${isNaN(row.presupuesto) ? row.presupuesto : 0}</div>
                            `,
                        },
                        {
                            data: 'gasto',
                            render: (data, type, row) => html`
                                <div class="text-right">
                                    <a
                                        href="${`/registragasto/proyectos_vs_GASTOS/params?consulta=presupuesto&anno=${$(
                                            '#anno_PRE'
                                        ).val()}&cod_campus=${row.cod_campus}&cod_area=${
                                            row.cod_area
                                        }&cod_centrogestion=${row.cod_centrogestion}&cod_cuentacontable=${
                                            row.cod_cuentacontable
                                        }&cod_cuentagasto=${row.cod_cuentagasto}`}"
                                        target="_blank">
                                        ${isNaN(row.gasto) ? row.gasto : 0}
                                    </a>
                                </div>
                            `,
                        },
                        {
                            data: 'provision',
                            render: (data, type, row) => html`
                                <div class="text-right">
                                    <a
                                        href="${`/registragasto/proyectos_vs_PROVISION/params?consulta=presupuesto&anno=${$(
                                            '#anno_PRE'
                                        ).val()}&cod_campus=${row.cod_campus}&cod_area=${
                                            row.cod_area
                                        }&cod_centrogestion=${row.cod_centrogestion}&cod_cuentacontable=${
                                            row.cod_cuentacontable
                                        }&cod_cuentagasto=${row.cod_cuentagasto}`}"
                                        target="_blank">
                                        ${isNaN(row.provision) ? row.provision : 0}
                                    </a>
                                </div>
                            `,
                        },
                        {
                            data: 1,
                            render: (data, type, row) => {
                                const MontoOrden = parseFloat(
                                    isNaN(row['OrdenesProyeccion']) ? row['OrdenesProyeccion'].replace(/,/g, '') : 0
                                );
                                const MontoGastos = parseFloat(
                                    isNaN(row['gastoProyeccion']) ? row['gastoProyeccion'].replace(/,/g, '') : 0
                                );
                                const MontoProyeccion = parseFloat(
                                    isNaN(row['proyeccion']) ? row['proyeccion'].replace(/,/g, '') : 0
                                );

                                let valorMostrar = '0';
                                if (MontoProyeccion - (MontoGastos + MontoOrden) >= 0) {
                                    valorMostrar = format_number_n_decimal_us(
                                        MontoProyeccion - (MontoGastos + MontoOrden),
                                        0
                                    );
                                }
                                return html`
                                    <div class="text-right">
                                        <a
                                            href="${`/registragasto/presupuesto_vs_Proyeccion/params?consulta=proyeccion&anno=${$(
                                                '#anno_PRE'
                                            ).val()}&cod_campus=${row.cod_campus}&cod_area=${
                                                row.cod_area
                                            }&cod_centrogestion=${row.cod_centrogestion}&cod_cuentacontable=${
                                                row.cod_cuentacontable
                                            }&cod_cuentagasto=${row.cod_cuentagasto}`}"
                                            target="_blank">
                                            ${valorMostrar}
                                        </a>
                                    </div>
                                `;
                            },
                        },
                        {
                            data: 'totalgasto',
                            render: function (data, type, row) {
                                return format_number_n_decimal_us(
                                    parseFloat(isNaN(row['gasto']) ? row['gasto'].replace(/,/g, '') : 0) +
                                        parseFloat(isNaN(row['provision']) ? row['provision'].replace(/,/g, '') : 0) +
                                        parseFloat(isNaN(row['proyeccion']) ? row['proyeccion'].replace(/,/g, '') : 0),
                                    0
                                );
                            },
                        },
                        {
                            data: 'desviacion',
                            render: function (data, type, row) {
                                return format_number_n_decimal_us(
                                    parseFloat(isNaN(row['presupuesto']) ? row['presupuesto'].replace(/,/g, '') : 0) -
                                        (parseFloat(isNaN(row['gasto']) ? row['gasto'].replace(/,/g, '') : 0) +
                                            parseFloat(
                                                isNaN(row['provision']) ? row['provision'].replace(/,/g, '') : 0
                                            ) +
                                            parseFloat(
                                                isNaN(row['proyeccion']) ? row['proyeccion'].replace(/,/g, '') : 0
                                            )),
                                    0
                                );
                            },
                        },
                        {
                            data: 'ejecucion',
                            render: function (data, type, row) {
                                return `${format_number_n_decimal(
                                    ((parseFloat(isNaN(row['gasto']) ? row['gasto'].replace(/,/g, '') : 0) +
                                        parseFloat(isNaN(row['provision']) ? row['provision'].replace(/,/g, '') : 0) +
                                        parseFloat(
                                            isNaN(row['proyeccion']) ? row['proyeccion'].replace(/,/g, '') : 0
                                        )) /
                                        parseFloat(
                                            isNaN(row['presupuesto']) ? row['presupuesto'].replace(/,/g, '') : 0
                                        )) *
                                        100,
                                    0
                                )}%`;
                            },
                        },
                    ],
                    data: response.data,
                    info: true,
                    searching: true,
                    paging: true,
                    responsive: true,
                    // autowidth: true,
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
                $('#tabla_presupuesto_vs').DataTable().columns.adjust().draw();
            }
            this.loader = false;
        },
        async find_proyecto() {
            const FormD = new FormData();
            FormD.append('anno', this.anno_PRO);

            const response = await versaFetch({
                url: '/api/find_proyecto',
                method: 'POST',
                data: FormD,
            });
            this.proyecto_cargado = response;
            return response;
        },
        async search_proyectos_vs() {
            this.loader = true;
            if ($('#tabla_proyecto_vs').find('tr').children().length > 0) {
                $('#tabla_proyecto_vs').find('tr').children().remove();
                $('#tabla_proyecto_vs').find('tbody').remove();
                $('#tabla_proyecto_vs').DataTable().destroy();
                $('#tabla_proyecto_vs').empty();
            }
            if ((await this.find_proyecto()) == 1) {
                const FormD = new FormData();
                FormD.append('anno', this.anno_PRO);

                const response = await versaFetch({
                    url: '/api/get_Proyectos_VS',
                    method: 'POST',
                    data: FormD,
                });

                $('#tabla_proyecto_vs').DataTable({
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
                            data: '',
                            render: function () {
                                return '';
                            },
                        },
                        { data: 'codigoproyecto' },
                        { data: 'descripcion' },
                        {
                            data: 'valor',
                            render: (data, type, row) => html`
                                <div class="text-right">${isNaN(row.valor) ? row.valor : 0}</div>
                            `,
                        },
                        {
                            data: 'gasto',
                            render: (data, type, row) => html`
                                <div class="text-right">
                                    <a
                                        href="${`/registragasto/proyectos_vs_GASTOS/params?consulta=proyectos&codigoproyecto=${
                                            row.codigoproyecto
                                        }&anno=${$('#anno_PRO').val()}`}"
                                        target="_blank">
                                        ${isNaN(row.gasto) ? row.gasto : 0}
                                    </a>
                                </div>
                            `,
                        },
                        {
                            data: 'provision',
                            render: (data, type, row) => html`
                                <div class="text-right">
                                    <a
                                        href="${`/registragasto/proyectos_vs_PROVISION/params?consulta=proyectos&codigoproyecto=${
                                            row.codigoproyecto
                                        }&anno=${$('#anno_PRO').val()}`}"
                                        target="_blank">
                                        ${isNaN(row.provision) ? row.provision : 0}
                                    </a>
                                </div>
                            `,
                        },
                        {
                            data: 'saldo',
                            render: (data, type, row) => html`
                                <div class="text-right">
                                    ${format_number_n_decimal_us(
                                        parseFloat(isNaN(row.valor) ? row.valor.replace(/,/g, '') : 0) -
                                            (parseFloat(isNaN(row.gasto) ? row.gasto.replace(/,/g, '') : 0) +
                                                parseFloat(isNaN(row.provision) ? row.provision.replace(/,/g, '') : 0)),
                                        0
                                    )}
                                </div>
                            `,
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
                $('#tabla_proyecto_vs').DataTable().columns.adjust().draw();
            }
            this.loader = false;
        },
        obtener_select_item: function (tabla, selec, inp) {
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
                let element = null;
                switch (tabla) {
                    case 'campus':
                        cagar_areas(this, match, null, null);
                        break;
                    case 'area':
                        cagar_centrogestion(this, match, null, null);
                        break;
                    case 'centrogestion':
                        element = $dom('#valor');
                        break;
                }
                if (element != null) element.focus();
            }
            $(`#${selec}`).prop('disabled', false);
        },
        async find_presupuesto() {
            const FormD = new FormData();
            FormD.append('anno', this.anno_PRE);

            const response = await versaFetch({
                url: '/api/find_presupuesto',
                method: 'POST',
                data: FormD,
            });

            this.presupuesto_cargado = response;

            return response;
        },
    },
});
