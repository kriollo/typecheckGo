import { storeCPB } from '@/jscontrollers/bodega/solicitud/construct/construct_pedido_STORE';
import { show_toast } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { defineComponent } = Vue;

export default defineComponent({
    name: 'edit_pedido',
    store: storeCPB,
    computed: {
        ...Vuex.mapState(['pedido', 'usuarios_local']),
    },
    methods: {
        ...Vuex.mapMutations(['SET_VIEW_EDIT_PEDIDO']),
        ...Vuex.mapActions(['savePedido']),
        cancel_edit_pedido() {
            this.SET_VIEW_EDIT_PEDIDO(false);
        },
        save_pedido_local() {
            if (this.pedido.descripcion === '' || this.pedido.descripcion === null) {
                show_toast('Debe completar todos los campos', 'danger', 'danger');
                return;
            }

            if (this.usuarios_local.length === 0 && this.pedido.id !== 0) {
                show_toast('Debe seleccionar al menos un usuario', 'danger', 'danger');
                return;
            }

            const params = {
                pedido: this.pedido,
                productos: this.productos,
                usuarios: this.usuarios_local,
            };

            this.savePedido(params).then(response => {
                if (response.success === 1) {
                    show_toast(response.title, response.message, 'success', 'success');

                    this.SET_VIEW_EDIT_PEDIDO(false);
                    this.$emit('reload', response.id);
                } else {
                    show_toast(response.title, response.message, 'warning', 'warning');
                }
            });
        },
    },
    template: html`
        <div class="row">
            <div class="col col-md-8">
                <input type="text" class="form-control" v-model="pedido.descripcion" />
            </div>
            <div class="col col-md-4">
                <button type="button" class="btn btn-sm btn-success" @click="save_pedido_local">
                    <i class="fas fa-save"></i>
                </button>
                <button type="button" class="btn btn-sm btn-warning" @click="cancel_edit_pedido">Cancelar</button>
            </div>
        </div>
    `,
});
