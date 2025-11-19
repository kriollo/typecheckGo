import { fecthCampus, fetchGetAreas, fetchGetCGestion } from '@/jscontrollers/composables/fetching';
import { FALSE, TRUE, show_toast, text_capitalize, versaFetch } from '@/jscontrollers/composables/utils';

import type { VersaFetchResponse } from 'versaTypes';

Vue.component('modalviewestructura', {
    name: 'modalviewestructura',
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
                <i class="fa fa-cubes"></i> Estructura asignada
            </header>
            <div class="card-body vertical-scrollable">
                <div id="tree"></div>
            </div>
            <div class="card-footer"></div>
        </div>
    `,
    methods: {
        changestatusshowmodal() {
            setTimeout(() => {
                this.$emit('cambiarmodal', false);
            }, 500);
        },
    },
});
Vue.component('modalnewjefatura', {
    name: 'modalnewjefatura',
    props: {
        param: [],
        id_user: null,
    },
    template: `
        <div class="card card-outline card-info text-capitalize">
            <header class="card-header">
                <div class="card-tools">
                    <button type="button" class="btn btn-tool" @click="changestatusshowmodal" data-card-widget="remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <i class="fa fa-cubes"></i> Asignar jefatura
            </header>
            <div class="card-body">
                <div class="row">
                    <div class="col-3 ml-0">
                        <div class="form-check">
                            <p class="mb-0">
                                <input id="requiere_validacion" type="checkbox" class="form-check-input" :checked="param.requiere_validacion" v-model="param.requiere_validacion">
                                <label class="form-check-label" for="requiere_validacion">Requiere Aprobación</label>
                            </p>
                            <p class="mt-0">
                            <input id="requiere_notificacion" type="checkbox" class="form-check-input" :checked="param.requiere_notificacion" v-model="param.requiere_notificacion">
                            <label class="form-check-label" for="requiere_notificacion">Requiere Notificación</label>
                            </p>
                        </div>
                    </div>
                    <div class="col-4 ml-0 mr-0">
                        <div class="form-group">
                            <label class="requiere_notificacion">Nombre Jefe</label>
                            <input id="nombre_jefe" type="text" class="form-control" v-model="param.nombre_jefatura">
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="form-group">
                            <label class="requiere_notificacion">Correo Jefe</label>
                            <input id="correo_jefe" type="text" class="form-control" v-model="param.correo_jefatura">
                        </div>
                    </div>
                    <div class="col col-1 text-center">
                        <button type="button" class="btn btn-success" @click="save_perfil_bodega_item">
                            <i class="fas fa-save"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="card-footer"></div>
        </div>
    `,
    methods: {
        changestatusshowmodal() {
            setTimeout(() => {
                this.$emit('cambiarmodal', false);
            }, 500);
        },
        async save_perfil_bodega_item() {
            let error = false;
            if (
                this.param.requiere_notificacion == FALSE &&
                this.param.requiere_validacion == FALSE &&
                this.param.correo_jefatura == '' &&
                this.param.nombre_jefatura == ''
            ) {
                show_toast(
                    'Perfil Usuario Bodega',
                    'Debe especificar nombre y correo de jefatura, si desea que se informe o aprueben los pedidos a bodegas generados por el usuario'
                );
                error = true;
            }
            if (
                (this.param.requiere_notificacion == TRUE || this.param.requiere_validacion == TRUE) &&
                (this.param.correo_jefatura == '' || this.param.nombre_jefatura == '')
            ) {
                show_toast(
                    'Perfil Usuario Bodega',
                    'Debe especificar nombre y correo de jefatura, si desea que se informe o aprueben los pedidos a bodegas generados por el usuario'
                );
                error = true;
            }
            if (error == FALSE) {
                const result = await Swal.fire({
                    title: 'Atención',
                    text: 'Está seguro que desea guardar este item?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Aceptar',
                    cancelButtonText: 'Cancelar',
                });
                if (result.isConfirmed) {
                    const json = await versaFetch({
                        url: '/api/save_bodega_perfil_item',
                        method: 'POST',
                        data: JSON.stringify({
                            data: this.param,
                        }),
                        headers: { 'Content-Type': 'application/json' },
                    });

                    if (json.success == 1) {
                        show_toast(json.title, json.message, 'success', 'success');

                        setTimeout(() => {
                            this.$emit('cambiarmodal', false);
                            this.$emit('update_perfil_user', this.param.id_user);
                        }, 500);
                    } else {
                        show_toast(json.title, json.message, 'warning', 'warning');
                    }
                }
            }
        },
    },
});
const _appPerfilUserBodega = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    data: function () {
        return {
            array_users: [],
            array_users_filter: [],
            array_bodega_perfil: [],
            array_cgestion_user: [],
            show_detalle_perfil: false,
            array_campus: [],
            array_area_filter: [],
            array_area: [],
            array_cgestion_filter: [],
            array_cgestion: [],
            showbtnsavecgestion: false,
            showModal: false,
            showbtnsavebodega: false,
            array_tree: [],
            text_filter_cgestion: '',
            text_filter_area: '',
            text_filter_user: '',
            array_bodegas: [],
            showModal_perfil: false,
            array_perfil_edit: [],
            id_user: '',
        };
    },
    mounted: async function () {
        const response = (await versaFetch({
            url: '/api/getUserWhithPedidoMenu',
            method: 'POST',
        })) as VersaFetchResponse | false;
        if (response != FALSE) {
            this.array_users_filter = response;
            this.array_users_filter.map(item => {
                item.active = false;
            });

            this.array_users = response;
        }

        // Carga Campus
        const responseCampus = await fecthCampus();
        responseCampus.map(item => {
            this.array_campus.push({
                descripcion: item.descripcion,
                codigo: item.id,
                active: false,
            });
        });
    },
    methods: {
        show_perfil_user: async function (id_user) {
            this.array_area = [];
            this.array_cgestion = [];
            this.array_cgestion_user = [];
            this.array_bodega_perfil = [];

            this.array_campus.map(item => {
                item.active = false;
            });
            this.array_users.map(item => {
                item.active = false;
                if (item.id_user == id_user) {
                    item.active = !item.active;
                    this.show_detalle_perfil = item.active;
                }
            });
            this.array_cgestion_user = false;

            const response = await versaFetch({
                url: '/api/getPerfilUsuarioBodega',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    id_user,
                }),
            });

            if (typeof response.perfil !== 'boolean') {
                this.array_bodega_perfil = response.perfil;
                this.array_bodega_perfil.map(item => {
                    item.requiere_notificacion = item.requiere_notificacion == 1;
                    item.requiere_validacion = item.requiere_validacion == 1;
                });
            }
            this.array_bodegas = typeof response.bodegas === 'boolean' ? [] : response.bodegas;
            this.array_bodegas.map(item => {
                item.active = item.active == 1;
            });
            this.array_cgestion_user = typeof response.estructura === 'boolean' ? [] : response.estructura;
        },
        filter_user: function () {
            if (this.text_filter_user != '')
                this.array_users_filter = this.array_users.filter(item =>
                    item.name.toLowerCase().includes(this.text_filter_user.toLowerCase())
                );
            else this.array_users_filter = this.array_users;
        },
        filter_area: function () {
            if (this.text_filter_area != '')
                this.array_area_filter = this.array_area.filter(item =>
                    item.descripcion.toLowerCase().includes(this.text_filter_area.toLowerCase())
                );
            else this.array_area_filter = this.array_area;
        },
        filter_cgestion: function () {
            if (this.text_filter_cgestion != '')
                this.array_cgestion_filter = this.array_cgestion.filter(
                    item =>
                        item.descripcion.toLowerCase().includes(this.text_filter_cgestion.toLowerCase()) ||
                        item.codigo.toLowerCase().includes(this.text_filter_cgestion.toLowerCase())
                );
            else this.array_cgestion_filter = this.array_cgestion;
        },
        select_campus: async function (id_campus) {
            // dejo todas los campos como inactivos
            this.array_campus.map(item => {
                item.active = false;
                if (item.codigo == id_campus) {
                    item.active = true;
                }
            });

            // limpio y cargo las areas
            this.array_area = [];
            this.array_cgestion = [];
            this.showbtnsavecgestion = false;
            this.array_area_filter = [];
            this.array_cgestion_cgestion = [];
            this.text_filter_area = '';
            this.text_filter_cgestion = '';

            const response = await fetchGetAreas(id_campus);
            if (typeof response === 'boolean') return;
            let orden = 0;
            response.map(value => {
                orden = 0;
                if (typeof this.array_cgestion_user !== 'boolean') {
                    const result = this.array_cgestion_user.filter(
                        item => item.cod_campus === id_campus && item.cod_area == value.codigo
                    );
                    if (result.length > 0) {
                        orden = 1;
                    }
                }
                this.array_area.push({
                    codigo: value.codigo,
                    descripcion: value.descripcion,
                    active: false,
                    orden,
                });
            });

            // ordeno las areas por orden descendente y por codigo_area ascendente
            this.array_area.sort(function (a, b) {
                return b.orden - a.orden || a.codigo - b.codigo;
            });
            this.array_area_filter = this.array_area;
        },
        select_area: async function (id_area) {
            const id_campus = this.array_campus.filter(item => item.active == TRUE);

            this.array_area.map(item => {
                item.active = false;
                if (item.codigo == id_area) {
                    item.active = true;
                }
            });
            this.array_cgestion = [];
            this.array_cgestion_filter = [];
            this.showbtnsavecgestion = false;

            const response = await fetchGetCGestion(id_campus[0].codigo, id_area);
            if (typeof response === 'boolean') return;

            let active = false;
            response.map(value => {
                active = false;
                if (this.array_cgestion_user != FALSE) {
                    const result = this.array_cgestion_user.filter(
                        item =>
                            item.cod_campus == id_campus[0].codigo &&
                            item.cod_area == id_area &&
                            item.cod_cgestion == value.codigo
                    );
                    if (result.length > 0) {
                        active = true;
                    }
                }
                this.array_cgestion.push({
                    codigo: value.codigo,
                    descripcion: value.descripcion,
                    active,
                });
            });

            // ordernar por estado active true y codigo_cgestion
            this.array_cgestion.sort(function (a, b) {
                return b.active - a.active || a.codigo - b.codigo;
            });

            this.array_cgestion_filter = this.array_cgestion;
        },
        select_cgestion: function (id_cgestion) {
            this.array_cgestion.map(item => {
                if (item.codigo == id_cgestion) {
                    item.active = !item.active;
                }
            });
            this.showbtnsavecgestion = true;
        },
        save_estructura_user: async function () {
            const id_user_result = this.array_users.filter(item => item.active == TRUE);
            const id_user = id_user_result[0].id_user;

            const id_campus_result = this.array_campus.filter(item => item.active == TRUE);
            const cod_campus = id_campus_result[0].codigo;

            const id_area_result = this.array_area.filter(item => item.active == TRUE);
            const cod_area = id_area_result[0].codigo;

            const id_cgestion_result = this.array_cgestion.filter(item => item.active == TRUE);

            const json = await versaFetch({
                url: '/api/save_estructura_user_bodega',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    id_user,
                    cod_campus,
                    cod_area,
                    array_estructura: id_cgestion_result,
                }),
            });

            if (json.success == 1) {
                show_toast(json.title, json.message, 'success', 'success');

                this.text_filter_cgestion = '';
                this.filter_cgestion();
                this.array_cgestion_user = [];
                const response = await versaFetch({
                    url: '/api/getPerfilUsuarioBodega',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        id_user,
                    }),
                });
                if (typeof response === 'boolean') return;
                this.array_cgestion_user = response.estructura;
            } else {
                show_toast(json.title, json.message, 'warning', 'warning');
            }
        },
        show_estructura: function () {
            this.array_tree = [];

            let campus = '';
            let area = '';
            for (const itemC of this.array_cgestion_user) {
                if (campus != itemC['cod_campus']) {
                    this.array_tree.push({
                        text: text_capitalize(itemC.desc_campus),
                        icon: 'fas fa-minus',
                        selectedIcon: 'fas fa-plus',
                        selectable: false,
                        nodes: [],
                        state: {
                            expanded: true,
                            selected: false,
                        },
                    });
                    campus = itemC['cod_campus'];
                    area = '';
                }

                const ultimo_l1 = this.array_tree.length - 1;
                if (area != itemC['cod_area']) {
                    this.array_tree[ultimo_l1].nodes.push({
                        text: text_capitalize(itemC.desc_area),
                        icon: 'fas fa-minus',
                        selectable: false,
                        nodes: [],
                        state: {
                            expanded: true,
                            selected: false,
                        },
                    });
                    area = itemC['cod_area'];
                }

                const ultimo_l2 = this.array_tree[ultimo_l1].nodes.length - 1;
                this.array_tree[ultimo_l1].nodes[ultimo_l2].nodes.push({
                    text: `${itemC.cod_cgestion} - ${text_capitalize(itemC.desc_cgestion)}`,
                    icon: 'fas fa-minus',
                    selectable: false,
                });
            }
            // @ts-ignore
            $('#tree').treeview({
                data: this.array_tree,
            });

            this.showModal = true;
        },
        change_update_modal: function (estatus) {
            this.showModal = estatus;
        },
        select_bodega: function (id_bodega) {
            this.showbtnsavebodega = true;
            this.array_bodegas.map(item => {
                if (item.id == id_bodega) {
                    item.active = !item.active;
                }
            });
        },
        save_bodegas_user: async function () {
            const id_user_result = this.array_users.filter(item => item.active == TRUE);
            const id_user = id_user_result[0].id_user;

            const array_bodegas = this.array_bodegas.filter(item => item.active == TRUE);

            const json = await versaFetch({
                url: '/api/save_user_bodega',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    id_user,
                    array_bodegas,
                }),
            });

            if (json.success == 1) {
                show_toast(json.title, json.message, 'success', 'success');
            } else {
                show_toast(json.title, json.message, 'warning', 'warning');
            }
        },
        show_perfil_edit: function (op, index) {
            const id_user_result = this.array_users.filter(item => item.active == TRUE);

            if (op == 'create') {
                this.array_perfil_edit = {
                    requiere_validacion: false,
                    requiere_notificacion: false,
                    nombre_jefatura: '',
                    correo_jefatura: '',
                    id_user: id_user_result[0].id_user,
                    op: 'create',
                };
            } else {
                this.array_perfil_edit = this.array_bodega_perfil[index];
            }

            this.showModal_perfil = true;
        },
        change_update_modal_perfil: function (estatus) {
            this.showModal_perfil = estatus;
        },
        delete_item_perfil: async function (index) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de eliminar este item?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const json = await versaFetch({
                    url: '/api/delete_bodega_perfil_item',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        id: this.array_bodega_perfil[index].id,
                    }),
                });

                if (json.success == 1) {
                    show_toast(json.title, json.message, 'success', 'success');
                    this.array_bodega_perfil.splice(index, 1);
                } else {
                    show_toast(json.title, json.message, 'warning', 'warning');
                }
            }
        },
    },
});
window.addEventListener('mouseup', function (e) {
    let flat = false;

    Array.prototype.forEach.call(e.composedPath(), function (entry) {
        if (entry.nodeName == 'DIV') {
            if (entry.getAttribute('id') == 'modalviewestructura') {
                flat = true;
            }
            if (entry.getAttribute('id') == 'modalnewjefatura') {
                flat = true;
            }
            if (entry.getAttribute('class') != null && entry.getAttribute('class')) {
                if (entry.getAttribute('class').substr(1, 7) == 'confirm') {
                    flat = true;
                }
            }
        }
    });

    const testData = document.getElementById('modalviewestructura');
    if (testData.style[0] == undefined && flat == FALSE) {
        _appPerfilUserBodega.showModal = false;
    }
    const testData1 = document.getElementById('modalnewjefatura');
    if (testData1.style[0] == undefined && flat == FALSE) {
        _appPerfilUserBodega.showModal_perfil = false;
    }
});
