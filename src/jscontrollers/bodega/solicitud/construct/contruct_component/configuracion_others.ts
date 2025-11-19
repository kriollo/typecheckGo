import { storeCPB } from '@/jscontrollers/bodega/solicitud/construct/construct_pedido_STORE';
import iCheck from '@/jscontrollers/components/iCheck';
import { html } from 'code-tag';
const { defineComponent, ref, computed, watchEffect } = Vue;

/* eslint-disable */
const ic = iCheck;
/* eslint-enable */

export default defineComponent({
    store: storeCPB,
    name: 'configuracion_others',
    setup() {
        const pedido = computed(() => storeCPB.state.pedido);
        const showWithoutStock = ref(pedido.value.show_with_stock === '1');
        const showStock = ref(pedido.value.show_stock === '1');
        const showValor = ref(pedido.value.show_valor === '1');
        const showTodos = ref(pedido.value.show_todos === '1');

        const SET_PEDIDO = pedido => {
            storeCPB.commit('SET_PEDIDO', pedido);
        };

        watchEffect(() => {
            SET_PEDIDO({
                ...pedido.value,
                show_with_stock: showWithoutStock.value ? '1' : '0',
                show_stock: showStock.value ? '1' : '0',
                show_valor: showValor.value ? '1' : '0',
                show_todos: showTodos.value ? '1' : '0',
            });
        });

        return {
            showWithoutStock,
            showStock,
            showValor,
            showTodos,
        };
    },
    template: html`
        <div class="row">
            <div class="col-md-12">
                <h3>Seleccione</h3>
                <div class="form-group">
                    <iCheck id="showStock" v-model="showStock" label="Mostrar Stock de Productos en Pedido" />
                    <iCheck id="showValor" v-model="showValor" label="Mostrar Valor de Productos en Pedido" />
                    <iCheck id="showTodos" type="checkbox" v-model="showTodos" label="Mostrar 'TODOS' en Productos" />
                    <iCheck
                        id="ShowWithoutStock"
                        v-model="showWithoutStock"
                        label="Mostrar Productos sin Stock"
                        iClass="icheck-warning" />
                </div>
            </div>
        </div>
    `,
});
