import { $dom, $domAll } from '@/jscontrollers/composables/dom-selector';
import {
    fetchGetFamilia1,
    fetchGetFamilia2,
    fetchGetTipoCodigo,
    fetchGetUnidadMedida,
} from '@/jscontrollers/composables/fetching';
import { FALSE, getCookieByName, pasarella, show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import uploadFileExcel from '@/jscontrollers/components/uploadFileExcel';
import type { VersaFetchResponse } from 'versaTypes';
/* eslint-disable */
const ue = uploadFileExcel;
/* eslint-enable */

const obtener_select_item = (tabla: string, selec: string, inp: string) => {
    const self = _appMasterCodigos;
    $(`#${selec}`).prop('disabled', true);
    const val = $(`#${selec}`).val();
    const list = $(`#${selec}`).attr('list');

    const elem = document.getElementById(list);
    const op = elem.querySelector(`option[value='${val}']`);
    let match = '0';
    if (op != null) match = op.getAttribute('data-value2');
    else $(`#${selec}`).prop('disabled', FALSE);

    $(`#${inp}`).val(match);

    if (match != '') {
        let $element = null;
        switch (tabla) {
            case 'unidad_medida':
                self.array_param_data[0]['data2'].id_unidadmedida = match;
                self.array_param_data[0]['data2'].desc_unidadmedida = val;
                $element = $dom('#input_unidadmedida');

                break;
            case 'familia1':
                self.array_param_data[0]['data2'].id_familia1 = match;
                self.array_param_data[0]['data2'].desc_familia1 = val;

                $element = $dom('#input_familia1');
                break;
            case 'familia2':
                self.array_param_data[0]['data2'].id_familia2 = match;
                self.array_param_data[0]['data2'].desc_familia2 = val;
                break;
        }
        if ($element instanceof HTMLElement) {
            $element.focus();
        }
    }
    $(`#${selec}`).prop('disabled', FALSE);
};

Vue.component('buttonloadexcel', {
    setup(props, { emit }) {
        const showModal = Vue.ref(false);
        const habilitar_pedido = Vue.ref('');

        const accion = e => {
            if (e.accion === 'closeModalUploadFileExcel') {
                showModal.value = false;
            } else {
                e.habilitar_pedido = habilitar_pedido.value;
                emit('accion', e);
                showModal.value = false;
            }
        };

        const showDiaglog = async () => {
            const result = await Swal.fire({
                title: 'Favor selecciona la base a cargar',
                text: ``,
                icon: 'question',
                input: 'select',
                inputOptions: {
                    habilitar_pedido: 'Pedido General',
                    habilitar_pedidoman: 'Pedido Mantención',
                },
                inputPlaceholder: 'Seleccione la hoja',
                showCancelButton: true,
                confirmButtonText: 'Subir',
                cancelButtonText: 'Cancelar',
                inputValidator: (/** @type {Number} */ value) => {
                    if (!value) {
                        return 'Debe seleccionar un tipo de Pedido';
                    }
                },
            });

            if (result.isConfirmed) {
                habilitar_pedido.value = result.value;
                showModal.value = true;
            }
        };

        return {
            accion,
            showDiaglog,
            showModal,
        };
    },
    template: html`
        <div class="m-0 p-0">
            <uploadFileExcel :showModal="showModal" @accion="accion" from="master" />
            <button type="button" class="btn btn-success" @click="showDiaglog" title="Carga Códigos disponibles">
                <i class="fa fa-upload"></i>
                Cargar productos Habilitados para Pedido
            </button>
        </div>
    `,
});
Vue.component('modalviewform', {
    name: 'modalviewform',
    props: {
        param: [],
    },
    setup() {
        const obtenerselectitem = (tabla, selec, inp) => {
            obtener_select_item(tabla, selec, inp);
        };
        return { obtenerselectitem };
    },
    async mounted() {
        const json = await versaFetch({
            url: '/api/getMenuState',
            method: 'POST',
        });
        this.getMenuState = json;
    },
    data() {
        return {
            getUnidadMedida: [],
            value_unidadmedida: '',
            getFamilia1: [],
            getFamilia2: [],
            getCuentaContable: [],
            getMenuState: [],
        };
    },
    methods: {
        changestatusshowmodal() {
            setTimeout(() => {
                this.$emit('cambiarmodal', false);
            }, 500);
        },
        saveregistro() {
            let flat = true;
            for (const index in this.param[0].data) {
                for (const key in this.param[0].data[index]) {
                    if (key === 'desc_familia2' || key === 'imagen' || key === 'valor') {
                        continue;
                    }
                    if (this.param[0].data[index][key] === null || this.param[0].data[index][key] === '') {
                        flat = false;
                        break;
                    }
                }
            }
            if (!flat) {
                show_toast('Alerta', 'Todos los campos son requeridos', 'warning', 'warning');
                return;
            }

            setTimeout(() => {
                this.$emit('editregistro', this.param);
            }, 500);
        },
        async load_unidadMedida() {
            const json = await fetchGetUnidadMedida({ estado: 1 });
            if (typeof json != 'boolean') {
                this.getUnidadMedida = json;
            }
        },
        async load_familia1() {
            const json = await fetchGetFamilia1({
                estado: 1,
                id_tipocodigo: this.param[0].tipoCodigo,
            });

            if (typeof json != 'boolean') {
                this.getFamilia1 = json;
            }
        },
        async load_familia2() {
            const json = await fetchGetFamilia2({
                estado: 1,
                id_tipocodigo: this.param[0].tipoCodigo,
                id_familia1: this.param[0]['data2']['id_familia1'],
            });
            if (typeof json != 'boolean') {
                this.getFamilia2 = json;
            }
        },
        accion(accion) {
            this.$emit('accion', accion);
        },
    },
    template: html`
        <div class="card card-outline card-info text-capitalize">
            <header class="card-header">
                <div class="card-tools">
                    <button type="button" class="btn btn-tool" @click="changestatusshowmodal" data-card-widget="remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <i class="fa fa-cubes"></i>
                {{ param[0].title }}
            </header>
            <div class="card-body">
                <table>
                    <tr>
                        <td class="col-2">Código</td>
                        <td class="p-2 col-10">
                            <input
                                type="text"
                                class="form-control col-12"
                                :disabled="param[0]['mode']=='edit' != ''?true:false"
                                v-model:value="param[0]['data2']['codigo']" />
                        </td>
                    </tr>
                    <tr>
                        <td class="col-2">Descripción</td>
                        <td class="p-2 col-10">
                            <input
                                type="text"
                                class="form-control col-12"
                                v-model:value="param[0]['data2']['descripcion']" />
                        </td>
                    </tr>
                    <tr>
                        <td class="col-2">Unidad de Medida</td>
                        <td class="p-2 col-10">
                            <input
                                id="unidad_medida"
                                type="text"
                                disabled
                                size="10"
                                v-model="param[0]['data2']['id_unidadmedida']" />
                            <input
                                id="input_unidadmedida"
                                class="form-control"
                                @change="obtenerselectitem('unidad_medida','input_unidadmedida','unidad_medida');"
                                @focus="load_unidadMedida"
                                autocomplete="off"
                                list="list_unidadmedida"
                                v-model.lazy="param[0]['data2']['desc_unidadmedida']" />
                            <datalist id="list_unidadmedida">
                                <option
                                    v-bind:data-value2="item.id"
                                    v-bind:value="item.descripcion"
                                    v-for="item in getUnidadMedida"></option>
                            </datalist>
                        </td>
                    </tr>
                    <tr>
                        <td class="col-2">Familia 1</td>
                        <td class="p-2 col-10">
                            <input
                                id="familia1"
                                type="text"
                                disabled
                                size="10"
                                v-model="param[0]['data2']['id_familia1']" />
                            <input
                                id="input_familia1"
                                class="form-control"
                                @change="obtenerselectitem('familia1','input_familia1','familia1');"
                                @focus="load_familia1"
                                autocomplete="off"
                                list="list_familia1"
                                v-model.lazy="param[0]['data2']['desc_familia1']" />
                            <datalist id="list_familia1">
                                <option
                                    v-bind:data-value2="item.id"
                                    v-bind:value="item.descripcion"
                                    v-for="item in getFamilia1"></option>
                            </datalist>
                        </td>
                    </tr>
                    <tr>
                        <td class="col-2">Familia 2</td>
                        <td class="p-2 col-10">
                            <input
                                id="familia2"
                                type="text"
                                disabled
                                size="10"
                                v-model="param[0]['data2']['id_familia2']" />
                            <input
                                id="input_familia2"
                                class="form-control"
                                @change="obtenerselectitem('familia2','input_familia2','familia2');"
                                @focus="load_familia2"
                                autocomplete="off"
                                list="list_familia2"
                                v-model.lazy="param[0]['data2']['desc_familia2']" />
                            <datalist id="list_familia2">
                                <option
                                    v-bind:data-value2="item.id"
                                    v-bind:value="item.descripcion"
                                    v-for="item in getFamilia2"></option>
                            </datalist>
                        </td>
                    </tr>
                    <tr v-if="getMenuState.pedidoGeneral">
                        <td class="col-2">Pedido General</td>
                        <td class="p-2 col-10">
                            <input
                                type="checkbox"
                                class="form-check"
                                v-bind:checked="param[0]['data2']['habilitar_pedido']"
                                v-model="param[0]['data2']['habilitar_pedido']" />
                        </td>
                    </tr>
                    <tr v-if="getMenuState.pedidoMantencion">
                        <td class="col-2">Pedido Mantención</td>
                        <td class="p-2 col-10">
                            <input
                                type="checkbox"
                                class="form-check"
                                v-bind:checked="param[0]['data2']['habilitar_pedidoman']"
                                v-model="param[0]['data2']['habilitar_pedidoman']" />
                        </td>
                    </tr>
                    <tr>
                        <td class="col-2">Cuenta contable</td>
                        <td class="p-2 col-10">
                            <input
                                id="cuentacontable"
                                type="text"
                                class="form-control col-12"
                                size="10"
                                v-model:value="param[0]['data2']['cod_cuentacontable']" />
                        </td>
                    </tr>
                </table>
            </div>
            <div class="card-footer">
                <button class="btn btn-default" @click="changestatusshowmodal">Salir</button>
                <button class="float-right btn btn-success" @click="saveregistro">Guardar</button>
            </div>
        </div>
    `,
});
const _appMasterCodigos = new Vue({
    el: '#content',
    delimiters: ['${', '}'],
    data: function () {
        return {
            array_param_data: [
                {
                    title: 'Maestro Códigos',
                    tipoCodigo: 0,
                    id: 0,
                    row: 0,
                    mode: 'new',
                    data: [
                        {
                            title: 0,
                            descripcion: '',
                            valor: '',
                        },
                        {
                            title: 0,
                            descripcion: '',
                            valor: '',
                        },
                        {
                            title: 0,
                            descripcion: '',
                            valor: '',
                        },
                        {
                            title: 0,
                            descripcion: '',
                            valor: '',
                        },
                        {
                            title: 0,
                            descripcion: '',
                            valor: '',
                        },
                        {
                            title: 0,
                            descripcion: '',
                            valor: '',
                        },
                        {
                            title: 0,
                            descripcion: '',
                            valor: '',
                        },
                    ],
                    data2: [],
                },
            ],
            array_data: [],
            array_tipocodigo: [],
            id_tipocodigo: 0,
            codigo: '',
            row: 0,
            showModal: false,
            ruta_imagen: '',
            imagen: '',
            array_estructura: [],
            array_bodegas_asociadas: [],
        };
    },
    mounted: async function () {
        const json = await fetchGetTipoCodigo();
        if (typeof json != 'boolean') {
            this.array_tipocodigo = json;
        }
        this.ruta_imagen = $('#ruta_imagen').val();
    },
    methods: {
        change_update_modal: function (estatus) {
            this.showModal = estatus;
        },
        load_master: async function (id_tipocodigo) {
            this.id_tipocodigo = id_tipocodigo;
            this.array_param_data[0]['tipoCodigo'] = this.id_tipocodigo;
            const carpeta_img = getCookieByName('campus');

            const fData = new FormData();
            fData.append('id_tipocodigo', id_tipocodigo);
            fData.append('origen', 'master');

            const json = await versaFetch({
                url: '/api/getCodigoByTipo',
                method: 'POST',
                data: fData,
            });

            if (typeof json != 'boolean') {
                this.array_estructura = json.encabezado;
                const result = json.encabezado.filter(item => item.editable === true);
                this.array_param_data[0].data = result;

                if ($('#tblmaster').find('tr').children().length > 0) {
                    $('#tblmaster').find('tr').children().remove();
                    $('#tblmaster').find('tbody').remove();
                    $('#tblmaster').DataTable().destroy();
                    $('#tblmaster').empty();
                }

                $('#tblmaster').DataTable({
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
                        { data: 'id' },
                        { data: 'codigo' },
                        { data: 'descripcion' },
                        {
                            data: 'id_unidadmedida',
                            render: function (data, type, row) {
                                return row['desc_unidadmedida'];
                            },
                        },
                        {
                            data: 'id_familia1',
                            render: function (data, type, row) {
                                return row['desc_familia1'];
                            },
                        },
                        {
                            data: 'id_familia2',
                            render: function (data, type, row) {
                                return row['desc_familia2'];
                            },
                        },
                        {
                            data: 'habilitar_pedido',
                            render: function (data, type, row) {
                                return row['habilitar_pedido'] == 1 ? 'Si' : 'No';
                            },
                        },
                        {
                            data: 'habilitar_pedidoman',
                            render: function (data, type, row) {
                                return row['habilitar_pedidoman'] == 1 ? 'Si' : 'No';
                            },
                        },
                        {
                            data: 'cod_cuentacontable',
                            render: function (data, type, row) {
                                return row['cod_cuentacontable'];
                            },
                        },
                        {
                            data: 'imagen',
                            render: (data, type, row, meta) => {
                                const imageUrl =
                                    row['imagen'] != null
                                        ? `${this.ruta_imagen}${carpeta_img}/${row['imagen']}`
                                        : `${this.ruta_imagen}Imagen_no_disponible.png`;

                                return html`
                                    <img
                                        loading="lazy"
                                        class="img-thumbnail myImg lazy-load"
                                        style="width:85px;height: 85px;"
                                        alt="${row.codigo}"
                                        data-value='{"accion":"ShowModalZoom", "src":"${imageUrl}","codigo":"${row.codigo}","row":"${meta.row}"}'
                                        name="pasarella"
                                        data-src="${imageUrl}" />
                                `;
                            },
                        },
                        {
                            data: 'estado',
                            render: function (data, type, row) {
                                return row['estado'] == 1
                                    ? html`
                                          <label class="text-success">Activado</label>
                                      `
                                    : html`
                                          <label class="text-danger">Desactivado</label>
                                      `;
                            },
                        },
                        {
                            data: 'id',
                            render: (data, type, row, meta) => html`
                                ${row.estado === '1'
                                    ? html`
                                          <button
                                              class="btn btn-success btn-sm"
                                              data-value='{"accion":"load_edit_modal", "mode":"edit","id":"${row.id}","row":"${meta.row}"}'
                                              name="pasarella"
                                              title="Editar Registro">
                                              <i class="fas fa-edit"></i>
                                          </button>
                                          <button
                                              class="btn btn-info btn-sm"
                                              data-value='{"accion":"load_bodegas_modal","id_tipocodigo":"${row.id_tipocodigo}","codigo":"${row.codigo}"}'
                                              name="pasarella"
                                              title="Bodegas Asociadas">
                                              <i class="fas fa-archive"></i>
                                          </button>
                                          <button
                                              class="btn btn-danger btn-sm"
                                              data-value='{"accion":"changeStateReg","id":"${row.id}","row":"${meta.row}"}'
                                              name="pasarella"
                                              title="Desactivar Registro">
                                              <i class="fas fa-power-off"></i>
                                          </button>
                                      `
                                    : html`
                                          <button
                                              class="btn btn-warning btn-sm"
                                              data-value='{"accion":"changeStateReg","id":"${row.id}","row":"${meta.row}"}'
                                              name="pasarella"
                                              title="Activar Registro">
                                              <i class="fas fa-check"></i>
                                          </button>
                                      `}
                            `,
                        },
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
                    drawCallback(_settings) {
                        // Inicializar Intersection Observer después de que DataTables haya terminado de renderizar
                        const lazyImages = $domAll('img.lazy-load');

                        if ('IntersectionObserver' in window) {
                            const lazyImageObserver = new IntersectionObserver(function (entries, _observer) {
                                entries.forEach(function (entry) {
                                    if (entry.isIntersecting) {
                                        const lazyImage = entry.target as HTMLImageElement;
                                        lazyImage.src = lazyImage.dataset.src;
                                        lazyImage.classList.remove('lazy-load');
                                        lazyImageObserver.unobserve(lazyImage);
                                    }
                                });
                            });

                            lazyImages.forEach(function (lazyImage: HTMLImageElement) {
                                lazyImageObserver.observe(lazyImage);
                            });
                        } else {
                            // Fallback for browsers that do not support IntersectionObserver
                            lazyImages.forEach(function (lazyImage: HTMLImageElement) {
                                lazyImage.src = lazyImage.dataset.src;
                            });
                        }
                    },
                });
            }
        },
        ShowModalZoom: function (src, codigo, row) {
            const table = $('#tblmaster').DataTable();
            const reg = table.row(row).data();
            this.codigo = codigo;
            this.row = row;
            this.imagen = reg['imagen'];
            $('#fileImg').val('');

            const img_zoom = document.getElementById('img_zoom');
            if (img_zoom instanceof HTMLImageElement) {
                img_zoom.src = src;
            }

            $('#modal_view_image').modal('show');
        },
        load_edit_modal: function (mode, id, row) {
            const table = $('#tblmaster').DataTable();

            if (mode == 'new') {
                this.array_param_data[0]['id'] = 0;
                this.array_param_data[0]['mode'] = mode;
                this.array_param_data[0]['row'] = 0;

                const arr = [];
                this.array_estructura.map(function (item) {
                    arr[item.campo] = '';
                });
                this.array_param_data[0]['data2'] = { ...arr };

                this.array_param_data[0]['data'].map(function (item) {
                    item.valor = '';
                });
            } else {
                this.array_param_data[0]['id'] = id;
                this.array_param_data[0]['mode'] = mode;
                this.array_param_data[0]['row'] = row;

                this.array_param_data[0]['data2'] = table.row(row).data();

                this.array_param_data[0]['data2']['habilitar_pedido'] =
                    this.array_param_data[0]['data2']['habilitar_pedido'] == '1';

                this.array_param_data[0]['data2']['habilitar_pedidoman'] =
                    this.array_param_data[0]['data2']['habilitar_pedidoman'] == '1';

                this.array_param_data[0]['data'].map(function (item) {
                    // @ts-ignore
                    item.valor = table.row().cell(row, item.targets).data();
                });
            }
            this.showModal = true;
        },
        changeStateReg: async function (id, row) {
            const fData = new FormData();
            fData.append('tabla', 'tblmaster_codigos');
            fData.append('campo_id', 'id');
            fData.append('id', id);

            const json = await versaFetch({
                url: '/api/changeEstadoMaster',
                method: 'POST',
                data: fData,
            });

            if (json.success == 1) {
                show_toast(json.title ?? 'Success', json.message, 'success', 'success');
                const table = $('#tblmaster').DataTable();
                let htmltbl = '';
                const rowIdx = row;

                // @ts-ignore
                const estado_actual = table.row().cell(rowIdx, 10).data();

                htmltbl =
                    estado_actual == 1
                        ? html`
                              <label class="text-danger">Desactivado</label>
                          `
                        : html`
                              <label class="text-success">Activado</label>
                          `;

                table
                    // @ts-ignore
                    .row() // @ts-ignore
                    .cell(rowIdx, 10)
                    .data(estado_actual == 1 ? 0 : 1)
                    // @ts-ignore
                    .render(htmltbl);

                if (estado_actual == 'Desactivado') {
                    htmltbl = html`
                        <button
                            class="btn btn-success btn-sm"
                            data-value='{"accion":"load_edit_modal", "mode":"edit","id":"${row.id}","row":"${row}"}'
                            name="pasarella"
                            title="Editar Registro">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button
                            class="btn btn-danger btn-sm"
                            data-value='{"accion":"changeStateReg","id":"${id}","row":"${row}"}'
                            name="pasarella"
                            title="Desactivar Registro">
                            <i class="fas fa-power-off"></i>
                        </button>
                    `;
                } else {
                    htmltbl = html`
                        <button
                            class="btn btn-warning btn-sm"
                            data-value='{"accion":"changeStateReg","id":"${id}","row":"${row}"}'
                            title="Activar Registro">
                            <i class="fas fa-check"></i>
                        </button>
                    `;
                }
                // @ts-ignore
                table.row().cell(rowIdx, 11).data(id).render(htmltbl);

                table.draw();
            } else {
                show_toast(json.title ?? 'Warning', json.message, 'warning', 'warning');
            }
        },
        edit_reg_master: async function (response) {
            const mode = response[0].mode;
            const row = response[0].row;

            let api = '';
            if (mode == 'new') api = 'newCodigos';
            else api = 'editCodigos';

            const fData = new FormData();
            fData.append('id', this.array_param_data[0].id);
            fData.append('id_tipocodigo', this.id_tipocodigo);
            fData.append('data2', JSON.stringify(response[0].data2));
            fData.append('data', JSON.stringify(response[0].data));

            const json = await versaFetch({
                url: `/api/${api}`,
                method: 'POST',
                data: fData,
            });

            if (json.success == 1) {
                show_toast('success', json.message, json.title, 'success');

                if (mode == 'new') this.load_master(this.id_tipocodigo);
                else {
                    const table = $('#tblmaster').DataTable();
                    response[0]['data'].map(function (item) {
                        table
                            // @ts-ignore
                            .row() // @ts-ignore
                            .cell(row, item.targets)
                            .data(response[0]['data2'][item.campo]);
                    });
                }
                this.showModal = FALSE;
            } else {
                show_toast('warning', json.message, json.title, 'warning');
            }
        },
        load_excel_base: async function (e) {
            const FormD = new FormData();
            FormD.append('encabezado', e.primeraLinea ? '1' : '0');
            FormD.append('items', JSON.stringify(e.data));
            FormD.append('id_tipocodigo', this.id_tipocodigo);
            FormD.append('habilitar_pedido', e.habilitar_pedido);

            const json = await versaFetch({
                url: '/api/uploadCodigosHabilitaPedidos',
                method: 'POST',
                data: FormD,
            });

            if (json.success == 1) {
                show_toast('success', json.message, json.title, 'success');
                this.load_master(this.id_tipocodigo);
            } else {
                show_toast('warning', json.message, json.title, 'warning');
            }
        },
        upload_image: async function () {
            if ($('#fileImg').val() == '') return;

            const FormD = new FormData();
            // @ts-ignore
            FormD.append('foto', document.getElementById('foto').files[0]);
            FormD.append('id_tipocodigo', this.id_tipocodigo);
            FormD.append('codigo', this.codigo);

            const json = await versaFetch({
                url: '/api/upload_image',
                method: 'POST',
                data: FormD,
            });

            if (json.success == 1) {
                show_toast('success', json.message, json.title, 'success');

                const table = $('#tblmaster').DataTable();
                const rowIdx = this.row;
                const newImagen = json.newImagen;

                const htmltbl = html`
                    <img
                        class="img-thumbnail myImg"
                        style="width:85px;height: 85px;"
                        alt="${this.codigo}"
                        data-value='{"accion":"ShowModalZoom", "src":"${this.ruta_imagen}${newImagen}","codigo":"${this
                            .codigo}","row":"${rowIdx}"}'
                        name="pasarella"
                        src="${this.ruta_imagen}${newImagen}" />
                `;

                table
                    // @ts-ignore
                    .row() // @ts-ignore
                    .cell(rowIdx, 9)
                    .data(newImagen)
                    // @ts-ignore
                    .render(htmltbl);

                $('#modal_view_image').modal('hide');
            } else {
                show_toast('warning', json.message, json.title, 'warning');
            }
        },
        deleteImageCodigo: async function () {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de eliminar esta imagen?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });

            if (result.isConfirmed) {
                const json = await versaFetch({
                    url: '/api/deleteImageCodigo',
                    method: 'POST',
                    data: JSON.stringify({
                        id_tipocodigo: this.id_tipocodigo,
                        codigo: this.codigo,
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (json.success == 1) {
                    show_toast(json.title ?? 'Success', json.message, 'success', 'success');

                    const table = $('#tblmaster').DataTable();
                    const rowIdx = this.row;
                    const htmltbl = html`
                        <img
                            class="img-thumbnail myImg"
                            style="width:85px;height: 85px;"
                            :alt="${this.codigo}"
                            data-value='{"accion":"ShowModalZoom", "src":"${this
                                .ruta_imagen}Imagen_no_disponible.png","codigo":"${this.codigo}","row":"${rowIdx}"}'
                            name="pasarella"
                            src="${this.ruta_imagen}Imagen_no_disponible.png" />
                    `;

                    table
                        // @ts-ignore
                        .row()
                        .cell(rowIdx, 9)
                        .data(null)
                        // @ts-ignore
                        .render(htmltbl);

                    $('#modal_view_image').modal('hide');
                } else {
                    show_toast(json.title ?? 'Warning', json.message, 'warning', 'warning');
                }
            }
        },
        getNameImage: function () {
            // @ts-ignore
            const result = document.getElementById('foto').value.split('\\');
            $('#fileImg').val(result[2]);
        },
        backModal: function () {
            $('#modal_view_image').modal('hide');
        },
        load_bodegas_modal: async function (id_tipocodigo, codigo) {
            this.id_tipocodigo = id_tipocodigo;
            this.codigo = codigo;
            this.array_bodegas_asociadas = [];

            const fData = new FormData();
            fData.append('id_tipocodigo', id_tipocodigo);
            fData.append('codigo', codigo);

            const json = await versaFetch({
                url: '/api/getBodegasByCodigo',
                method: 'POST',
                data: fData,
            });
            if (typeof json != 'boolean') {
                this.array_bodegas_asociadas = json;
            }
            $('#modal_bodegas_asociadas').modal('show');
        },
        asociaOtraBodega: async function () {
            let array_bodegas = [];
            const json = (await versaFetch({
                url: '/api/getBodegas',
                method: 'POST',
                data: JSON.stringify({ estado: 1 }),
                headers: {
                    'Content-Type': 'application/json',
                },
            })) as VersaFetchResponse | false;
            if (json !== FALSE)
                // sólo extraigo bodegas que no estan asociadas
                array_bodegas = json.filter(item => {
                    const result = this.array_bodegas_asociadas.find(value => value.cod_bodega == item.codigo);
                    if (result == undefined) return item;
                });

            if (array_bodegas.length > 0) {
                const html_txt = html`
                    <div class="col-lg-12">
                        <div class="row">
                            <label>Seleccione Bodega:</label>
                            <select id="select_bodega" class="form-control col-8 ml-5">
                                <option></option>
                                ${array_bodegas
                                    .map(
                                        value => html`
                                            <option value="${value.codigo}">${value.descripcion}</option>
                                        `
                                    )
                                    .join('')}
                            </select>
                        </div>

                        <div class="row mt-2">
                            <div class="form-group col-2">
                                <label for="stock_inicial">Stock Inicial</label>
                                <input
                                    id="stock_inicial"
                                    type="number"
                                    class="form-control text-right"
                                    onfocus="this.select()"
                                    value="0" />
                            </div>
                            <div class="form-group col-2">
                                <label for="stock_minimo">Stock Minimo</label>
                                <input
                                    id="stock_minimo"
                                    type="number"
                                    class="form-control text-right"
                                    onfocus="this.select()"
                                    value="0" />
                            </div>
                            <div class="form-group col-2">
                                <label for="stock_maximo">Stock Maximo</label>
                                <input
                                    id="stock_maximo"
                                    type="number"
                                    class="form-control text-right"
                                    onfocus="this.select()"
                                    value="0" />
                            </div>
                            <div class="form-group col-3">
                                <label for="preciocompra">P.Compra</label>
                                <input
                                    id="preciocompra"
                                    type="number"
                                    class="form-control text-right"
                                    onfocus="this.select()"
                                    value="0" />
                            </div>
                            <div class="form-group col-3">
                                <label for="precioventa">P.Venta</label>
                                <input
                                    id="precioventa"
                                    type="number"
                                    class="form-control text-right"
                                    onfocus="this.select()"
                                    value="0" />
                            </div>
                        </div>
                    </div>
                `;

                const result = await Swal.fire({
                    // icon: 'info',
                    title: 'Asociar a otra Bodega',
                    html: html_txt,
                    showCancelButton: true,
                    showConfirmButton: true,
                    confirmButtonText: 'Guardar',
                    showCloseButton: true,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    customClass: {
                        popup: 'swal-wide',
                        htmlContainer: 'swal-target',
                    },
                });

                if (result.isConfirmed) {
                    if (await this.saveNewBodegaAsociada()) {
                        this.load_bodegas_modal(this.id_tipocodigo, this.codigo);
                    }
                }
            }
        },
        saveNewBodegaAsociada: async function () {
            let error = FALSE;

            if ($('#select_bodega').val() == '') {
                show_toast('Mantenedor de Maestros', 'Debe seleccionar una bodega');
                error = true;
            }
            if ($('#stock_inicial').val() == '' || Number($('#stock_inicial').val()) <= 0) {
                show_toast('Mantenedor de Maestros', 'El Stock Inicial debe ser mayor a 0');
                error = true;
            }
            if ($('#stock_minimo').val() == '' || Number($('#stock_minimo').val()) < 0) {
                show_toast('Mantenedor de Maestros', 'El Stock Minimo debe ser mayor o igual a 0');
                error = true;
            }
            if ($('#sotck_maximo').val() == '' || Number($('#sotck_maximo').val()) < 0) {
                show_toast('Mantenedor de Maestros', 'El Stock Maximo debe ser mayor o igual a 0');
                error = true;
            }
            if ($('#preciocompra').val() == '' || Number($('#preciocompra').val()) < 0) {
                show_toast('Mantenedor de Maestros', 'El Precio de Compra debe ser mayor o igual a 0');
                error = true;
            }
            if ($('#precioventa').val() == '' || Number($('#precioventa').val()) < 0) {
                show_toast('Mantenedor de Maestros', 'El Precio de Venta debe ser mayor o igual a 0');
                error = true;
            }

            if (error === FALSE) {
                const array_option = {
                    id_tipocodigo: this.id_tipocodigo,
                    codigo: this.codigo,
                    cod_bodega: $('#select_bodega').val(),
                    stock_inicial: $('#stock_inicial').val(),
                    stock_minimo: $('#stock_minimo').val(),
                    stock_maximo: $('#stock_maximo').val(),
                    preciocompra: $('#preciocompra').val(),
                    precioventa: $('#precioventa').val(),
                };

                const json = await versaFetch({
                    url: '/api/newBodegaAsociadaCodigo',
                    method: 'POST',
                    data: JSON.stringify({ array_option }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (json.success === 1) {
                    show_toast('success', json.message, json.title, 'success');
                    return true;
                }
                show_toast('warning', json.message, json.title, 'warning');
                return false;
            }
            return false;
        },
        editMinimoMaximosBodega: async function (index) {
            let error = FALSE;

            if (
                this.array_bodegas_asociadas[index].stock_minimo == '' ||
                parseFloat(this.array_bodegas_asociadas[index].stock_minimo) < 0
            ) {
                show_toast('Mantenedor de Maestros', 'El Stock Minimo debe ser mayor o igual a 0');
                error = true;
            }
            if (
                this.array_bodegas_asociadas[index].stock_maximo == '' ||
                parseFloat(this.array_bodegas_asociadas[index].stock_maximo) < 0
            ) {
                show_toast('Mantenedor de Maestros', 'El Stock Maximo debe ser mayor o igual a 0');
                error = true;
            }

            if (error === FALSE) {
                const array_option = {
                    id_tipocodigo: this.id_tipocodigo,
                    codigo: this.codigo,
                    cod_bodega: this.array_bodegas_asociadas[index].cod_bodega,
                    stock_minimo: this.array_bodegas_asociadas[index].stock_minimo,
                    stock_maximo: this.array_bodegas_asociadas[index].stock_maximo,
                    preciocompra: this.array_bodegas_asociadas[index].preciocompra,
                    precioventa: this.array_bodegas_asociadas[index].precioventa,
                };

                const fData = new FormData();
                fData.append('array_option', JSON.stringify(array_option));

                const json = await versaFetch({
                    url: '/api/editBodegaAsociadaCodigo',
                    method: 'POST',
                    data: fData,
                });
                if (json.success == 1) {
                    show_toast('success', json.message, json.title, 'success');
                } else {
                    show_toast('warning', json.message, json.title, 'warning');
                }
            }
        },
        deleteAsociacionBodega: async function (index) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de eliminar esta asociación?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const json = await versaFetch({
                    url: '/api/deleteBodegaAsociadaCodigo',
                    method: 'POST',
                    data: JSON.stringify({
                        id_tipocodigo: this.id_tipocodigo,
                        codigo: this.codigo,
                        cod_bodega: this.array_bodegas_asociadas[index].cod_bodega,
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (json.success == 1) {
                    show_toast('success', json.message, json.title, 'success');
                    this.load_bodegas_modal(this.id_tipocodigo, this.codigo);
                } else {
                    show_toast('warning', json.message, json.title, 'warning');
                }
            }
        },
        pasarella(params) {
            const actions = {
                load_edit_modal: () => this.load_edit_modal(params.mode, params.id, params.row),
                load_bodegas_modal: () => this.load_bodegas_modal(params.id_tipocodigo, params.codigo),
                changeStateReg: () => this.changeStateReg(params.id, params.row),
                ShowModalZoom: () => this.ShowModalZoom(params.src, params.codigo, params.row),
                loadExcel: () => this.load_excel_base(params),
                default: () => {
                    show_toast('warning', 'Acción no definida');
                },
            };

            const fn = actions[params.accion] || actions['default'];
            if (typeof fn === 'function') {
                fn();
            }
        },
    },
});

document.addEventListener('click', function (event) {
    pasarella(_appMasterCodigos, event);
});
window.addEventListener('mouseup', function (e) {
    let flat = FALSE;
    const id_modal = 'modalviewtipocodigo';

    Array.prototype.forEach.call(e.composedPath(), function (entry) {
        if (entry.nodeName == 'DIV') {
            if (entry.getAttribute('id') == id_modal) {
                flat = true;
            }
        }
    });
    const testData = document.getElementById(id_modal);
    if (testData.style[0] == undefined && flat == FALSE) {
        _appMasterCodigos.showModal = FALSE;
    }
});
