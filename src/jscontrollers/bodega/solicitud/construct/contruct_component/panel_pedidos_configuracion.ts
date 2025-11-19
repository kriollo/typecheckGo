import { storeCPB } from '@/jscontrollers/bodega/solicitud/construct/construct_pedido_STORE';
import configuracion_others from '@/jscontrollers/bodega/solicitud/construct/contruct_component/configuracion_others';
import configuracion_productos from '@/jscontrollers/bodega/solicitud/construct/contruct_component/configuracion_productos';
import configuracion_usuarios from '@/jscontrollers/bodega/solicitud/construct/contruct_component/configuracion_usuarios';
import edit_pedido from '@/jscontrollers/bodega/solicitud/construct/contruct_component/edit_pedido';
import { FALSE, show_toast } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { defineComponent } = Vue;
export default defineComponent({
    store: storeCPB,
    name: 'panel_pedidos_configuracion',
    components: {
        configuracion_productos,
        configuracion_usuarios,
        configuracion_others,
        edit_pedido,
    },
    computed: {
        ...Vuex.mapState(['view_edit_pedido', 'pedidos', 'pedido']),
    },
    methods: {
        ...Vuex.mapMutations([
            'SET_VIEW_EDIT_PEDIDO',
            'LOAD_PEDIDOS',
            'SET_PEDIDO',
            'EDIT_PEDIDO',
            'SET_USUARIOS_LOCAL',
            'SET_PRODUCTOS',
            'SET_ARRAY_TITLE_PRODUCTOS',
        ]),
        ...Vuex.mapActions(['getPedidos', 'deleteConstructPedido', 'publicPedido', 'getPedido']),
        show_edit_pedido() {
            this.getPedid_local(this.pedido.id);
        },
        getPedidosLocal(response) {
            this.getPedidos().then(pedidos => {
                if (pedidos.data !== FALSE) this.LOAD_PEDIDOS(pedidos.data);
                if (response !== null && response !== undefined) {
                    this.SET_PEDIDO(
                        JSON.parse(JSON.stringify(this.pedidos.find(pedido => Number(pedido.id) === Number(response))))
                    );
                } else this.LOAD_PEDIDOS([]);
            });
        },
        deleteConstructPedido_local() {
            this.pedido.estado = this.pedido.estado !== 0 ? 0 : 1;
            this.deleteConstructPedido(this.pedido, this.pedido.estado).then(response => {
                if (response.success === 1) {
                    show_toast(response.title, response.message, 'success', 'success');
                    this.EDIT_PEDIDO(this.pedido, this.pedido.estado);
                } else {
                    show_toast(response.title, response.message, 'warning', 'warning');
                }
            });
        },
        publicPedido_local() {
            this.pedido.estado = this.pedido.estado !== 3 ? 3 : 1;
            this.publicPedido(this.pedido, this.pedido.estado)
                .then(response => {
                    if (response.success === 1) {
                        show_toast(response.title, response.message, 'success', 'success');
                        this.EDIT_PEDIDO(this.pedido);
                    } else {
                        show_toast(response.title, response.message, 'warning', 'warning');
                    }
                })
                .catch(function (error) {
                    show_toast('Error', error, 'error', 'error');
                });
        },
        getPedid_local(id) {
            this.SET_USUARIOS_LOCAL([]);
            this.getPedido(id)
                .then(pedido => {
                    if (pedido.success === 1) {
                        this.SET_PRODUCTOS(pedido.productos);
                        this.SET_ARRAY_TITLE_PRODUCTOS(pedido.array_title_productos);

                        pedido.usuarios.forEach(function (usuario) {
                            usuario.value = true;
                        });

                        this.SET_USUARIOS_LOCAL(pedido.usuarios);
                    }
                    this.SET_VIEW_EDIT_PEDIDO(true);
                })
                .catch(function (error) {
                    show_toast('Error', error, 'error', 'error');
                });
        },
    },
    template: html`
        <div class="col col-md-9">
            <div class="card card-outline card-cyan">
                <div class="card-header">
                    <div class="row">
                        <div class="col col-md-8">
                            <h3 class="card-title" v-if="!view_edit_pedido">{{ pedido.descripcion }}</h3>
                            <edit_pedido @reload="getPedidosLocal" v-if="view_edit_pedido"></edit_pedido>
                        </div>
                        <div class="col col-md-4 float-right" v-if="pedido.id != 0">
                            <button
                                type="button"
                                class="btn btn-sm btn-success"
                                @click="show_edit_pedido()"
                                title="Modificar Pedido"
                                v-if="pedido.estado > 0">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button
                                type="button"
                                class="btn btn-sm"
                                :class="pedido.estado == 0 ? 'btn-warning':'btn-danger'"
                                @click="deleteConstructPedido_local()"
                                title="Desactivar Pedido">
                                <i class="fas" :class="pedido.estado == 0 ? 'fa-check':'fa-power-off' "></i>
                            </button>
                            <button
                                type="button"
                                class="btn btn-sm btn-flat"
                                :class="pedido.estado == 3 ? 'btn-info':''"
                                @click="publicPedido_local()"
                                title="Publicar Pedido">
                                <i class="fas fa-bullseye" v-if="pedido.estado > 0"></i>
                                Publicar Pedido
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body" v-if="pedido.id != 0 && view_edit_pedido">
                    <div class="col col-md-12">
                        <div class="card card-info card-tabs card-outline card-outline-tabs">
                            <div class="card-header p-0 border-bottom-0">
                                <ul id="custom-tabs-four-tab" class="nav nav-tabs" role="tablist">
                                    <li class="nav-item">
                                        <a
                                            id="custom-tabs-Productos"
                                            class="nav-link active"
                                            aria-controls="productos"
                                            aria-selected="false"
                                            data-toggle="pill"
                                            href="#productos"
                                            role="tab">
                                            Productos
                                        </a>
                                    </li>
                                    <li class="nav-item">
                                        <a
                                            id="custom-tabs-usuarios"
                                            class="nav-link"
                                            aria-controls="usuarios"
                                            aria-selected="false"
                                            data-toggle="pill"
                                            href="#usuarios"
                                            role="tab">
                                            Usuarios
                                        </a>
                                    </li>
                                    <li class="nav-item">
                                        <a
                                            id="custom-tabs-others"
                                            class="nav-link"
                                            aria-controls="others"
                                            aria-selected="false"
                                            data-toggle="pill"
                                            href="#others"
                                            role="tab">
                                            Otras Configuraciones
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            <div class="card-body" style="height: 600px">
                                <div id="custom-tabs-two-tabContent" class="tab-content">
                                    <div
                                        id="productos"
                                        class="tab-pane fade active show"
                                        aria-labelledby="custom-tabs-productos"
                                        role="tabpanel">
                                        <configuracion_productos></configuracion_productos>
                                    </div>
                                    <div
                                        id="usuarios"
                                        class="tab-pane fade"
                                        aria-labelledby="custom-tabs-usuarios"
                                        role="tabpanel">
                                        <configuracion_usuarios></configuracion_usuarios>
                                    </div>
                                    <div
                                        id="others"
                                        class="tab-pane fade"
                                        aria-labelledby="custom-tabs-others"
                                        role="tabpanel">
                                        <configuracion_others></configuracion_others>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});
