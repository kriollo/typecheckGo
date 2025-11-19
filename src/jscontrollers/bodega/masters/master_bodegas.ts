import { FALSE, pasarella, show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
import type { VersaFetchResponse } from 'versaTypes';

Vue.component('modalviewform', {
    name: 'modalviewform',
    props: {
        param: [],
    },
    template: `
        <div class="card card-outline card-info text-capitalize">
            <header class="card-header">
                <div class="card-tools">
                    <button type="button" class="btn btn-tool" @click="changestatusshowmodal" data-card-widget="remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <i class="fa fa-cubes"></i> {{ param[0].title }}
            </header>
            <div class="card-body">
                <table>
                    <tr v-for="item in param[0]['data']">
                        <td>{{item.title}}</td>
                        <td class="p-2">
                            <input type="text" class="form-control" v-model:value="item.valor">
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
    },
});
const _appMasterBodega = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    data: function () {
        return {
            array_param_data: [
                {
                    title: 'Maestro Bodegas',
                    id: 0,
                    row: 0,
                    mode: 'new',
                    data: [
                        {
                            id: 0,
                            descripcion: '',
                        },
                    ],
                },
            ],
            array_data: [],
            showModal: false,
        };
    },
    mounted: function () {
        this.load_master();
    },
    methods: {
        change_update_modal: function (estatus) {
            this.showModal = estatus;
        },
        load_master: async function () {
            const json = (await versaFetch({
                url: '/api/getBodegas',
                method: 'POST',
                data: JSON.stringify({ origen: 'master' }),
                headers: {
                    'Content-Type': 'application/json',
                },
            })) as VersaFetchResponse | false;

            if (json != false) {
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
                                ${row['estado'] == 1
                                    ? html`
                                          <button
                                              class="btn btn-success btn-sm"
                                              data-value='{"accion":"load_edit_modal","mode":"edit" ,"id":"${row.id}","row":"${meta.row}"}'
                                              name="pasarella"
                                              title="Editar Registro">
                                              <i class="fas fa-edit"></i>
                                          </button>

                                          <button
                                              class="btn btn-danger btn-sm"
                                              data-value='{"accion":"changeStateReg", "id":"${row.id}", "row":"${meta.row}"}'
                                              name="pasarella"
                                              title="Desacticonst Registro">
                                              <i class="fas fa-power-off"></i>
                                          </button>
                                      `
                                    : html`
                                          <button
                                              class="btn btn-warning btn-sm"
                                              data-value='{"accion":"changeStateReg", "id":"${row.id}", "row":"${meta.row}"}'
                                              name="pasarella"
                                              title="Acticonst Registro">
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
                });
                $('#tblmaster').DataTable().columns.adjust().draw();
            }
        },
        load_edit_modal: function (mode, id, row) {
            if (mode == 'new') {
                this.array_param_data[0]['id'] = 0;
                this.array_param_data[0]['mode'] = mode;
                this.array_param_data[0]['row'] = 0;

                this.array_param_data[0]['data'].map(item => {
                    item.valor = '';
                });
            } else {
                this.array_param_data[0]['id'] = id;
                this.array_param_data[0]['mode'] = mode;
                this.array_param_data[0]['row'] = row;

                const table = $('#tblmaster').DataTable();
                this.array_param_data[0]['data'].map(item => {
                    // @ts-ignore
                    item.valor = table.row().cell(row, item.targets).data();
                });
            }
            this.showModal = true;
        },
        changeStateReg: async function (id, row) {
            const json = await versaFetch({
                url: '/api/changeEstadoMaster',
                method: 'POST',
                data: JSON.stringify({
                    tabla: 'tblmaster_bodegas',
                    campo_id: 'id',
                    id,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (json && json.success == 1) {
                show_toast(json.title ?? 'success', json.message, 'success', 'success');

                const table = $('#tblmaster').DataTable();
                let htmlInner = '';
                const rowIdx = row;

                // @ts-ignore
                const estado_actual = table.row().cell(rowIdx, 3).data();

                htmlInner =
                    estado_actual == 1
                        ? html`
                              <label class="text-danger">Desactivado</label>
                          `
                        : html`
                              <label class="text-success">Activado</label>
                          `;
                table
                    // @ts-ignore
                    .row()
                    .cell(rowIdx, 3)
                    .data(estado_actual == 1 ? 0 : 1)
                    // @ts-ignore
                    .render(htmlInner);

                if (estado_actual == 'Desactivado') {
                    htmlInner = html`
                        <button
                            class="btn btn-success btn-sm"
                            data-value='{"accion":"load_edit_modal","mode":"edit" ,"id":"${id}","row":"${row}"}'
                            name="pasarella"
                            title="Editar Registro">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button
                            class="btn btn-danger btn-sm"
                            data-value='{"accion":"changeStateReg", "id":"${id}", "row":"${row}"}'
                            name="pasarella"
                            title="Desacticonst Registro">
                            <i class="fas fa-power-off"></i>
                        </button>
                    `;
                } else {
                    htmlInner = html`
                        <button
                            class="btn btn-warning btn-sm"
                            data-value='{"accion":"changeStateReg", "id":"${id}", "row":"${row}"}'
                            name="pasarella"
                            title="Acticonst Registro">
                            <i class="fas fa-check"></i>
                        </button>
                    `;
                }
                // @ts-ignore
                table.row().cell(rowIdx, 4).data(id).render(htmlInner);

                table.draw();
            } else {
                show_toast(json.title ?? 'warning', json.message, 'warning', 'warning');
            }
        },
        edit_reg_master: async function (response) {
            this.showModal = false;
            const id = response[0].id;
            const mode = response[0].mode;
            const rowIdx = response[0].row;
            let api = '';
            if (mode == 'new') api = 'newBodegas';
            else api = 'editBodegas';

            const data = new FormData();
            data.append('origen', 'master');
            data.append('id', id);
            data.append('data', JSON.stringify(response[0].data));

            const json = await versaFetch({
                url: `/api/${api}`,
                method: 'POST',
                data: data,
            });

            if (json.success == 1) {
                show_toast(json.title, json.message, 'success', 'success');
                if (mode == 'new') this.load_master();
                else {
                    const table = $('#tblmaster').DataTable();
                    response[0]['data'].map(function (item) {
                        table
                            // @ts-ignore
                            .row()
                            .cell(rowIdx, item.targets)
                            .data(item.valor);
                    });
                }
            } else {
                show_toast(json.title, json.message, 'warning', 'warning');
            }
        },
        pasarella: function (/** @type {Object} */ params) {
            const actions = {
                load_edit_modal: () => this.load_edit_modal(params.mode, params.id, params.row),
                changeStateReg: () => this.changeStateReg(params.id, params.row),
            };
            const fn = actions[params.accion] || function () {};
            if (typeof fn === 'function') {
                fn();
            }
        },
    },
});

document.addEventListener('click', function (event) {
    pasarella(_appMasterBodega, event);
});
window.addEventListener('mouseup', function (e) {
    let flat = false;
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
        _appMasterBodega.showModal = false;
    }
});
