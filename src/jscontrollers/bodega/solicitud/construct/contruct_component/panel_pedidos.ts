import { storeCPB } from '@/jscontrollers/bodega/solicitud/construct/construct_pedido_STORE';
import { FALSE } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { defineComponent } = Vue;
export default defineComponent({
    store: storeCPB,
    name: 'panel_pedidos',
    computed: {
        ...Vuex.mapState(['view_edit_pedido', 'pedidos', 'pedido']),
    },
    methods: {
        ...Vuex.mapMutations(['SET_VIEW_EDIT_PEDIDO', 'LOAD_PEDIDOS', 'SET_PEDIDO']),
        ...Vuex.mapActions(['getPedidos']),
        show_edit_pedido(key) {
            if (key === -1) {
                this.pedido.id = 0;
                this.pedido.descripcion = '';
                this.pedido.estado = 1;
            } else {
                this.SET_PEDIDO(JSON.parse(JSON.stringify(this.pedidos[key])));
            }
            this.SET_VIEW_EDIT_PEDIDO(true);
        },
        getPedidosLocal() {
            this.getPedidos().then(pedidos => {
                if (pedidos.data !== FALSE) this.LOAD_PEDIDOS(pedidos.data);
                else this.LOAD_PEDIDOS([]);
            });
        },
        setPedido(key) {
            this.SET_PEDIDO(JSON.parse(JSON.stringify(this.pedidos[key])));
            this.SET_VIEW_EDIT_PEDIDO(false);
        },
    },
    mounted() {
        this.getPedidosLocal();
    },
    template: html`
        <div class="col col-md-3">
            <div class="card card-outline card-cyan">
                <div class="card-header">
                    <h3 class="card-title">Pedidos</h3>
                    <div class="card-tools" v-if="!view_edit_pedido">
                        <button type="button" class="btn btn-tool" @click="show_edit_pedido(-1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <ul class="list-group">
                        <li
                            class="list-group-item list-group-item-action"
                            style="cursor:pointer"
                            :class="forPedido.id == pedido.id ? 'active':'' "
                            :key="forPedido.id"
                            @click="setPedido(key)"
                            v-for="(forPedido,key) in pedidos">
                            {{forPedido.descripcion}}
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    `,
});
