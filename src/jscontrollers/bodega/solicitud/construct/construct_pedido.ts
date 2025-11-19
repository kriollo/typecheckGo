import { storeCPB } from '@/jscontrollers/bodega/solicitud/construct/construct_pedido_STORE';
import { pasarella } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import panel_pedidos from '@/jscontrollers/bodega/solicitud/construct/contruct_component/panel_pedidos';
import panel_pedidos_configuracion from '@/jscontrollers/bodega/solicitud/construct/contruct_component/panel_pedidos_configuracion';

import breadcrumb, { type Breadcrumb } from '@/jscontrollers/components/breadcrumb';
import iCheck from '@/jscontrollers/components/iCheck';
import iRadio from '@/jscontrollers/components/iRadio';
import uploadFileExcel from '@/jscontrollers/components/uploadFileExcel';
/* eslint-disable */
const ic = iCheck;
const ir = iRadio;
const ue = uploadFileExcel;
/* eslint-enable */

const { defineComponent } = Vue;

const appComponent = defineComponent({
    name: 'ppal',
    components: {
        panel_pedidos,
        panel_pedidos_configuracion,
    },
    template: html`
        <div class="row">
            <panel_pedidos></panel_pedidos>
            <panel_pedidos_configuracion></panel_pedidos_configuracion>
        </div>
    `,
});

const appCPB = new Vue({
    el: '#ppal',
    store: storeCPB,
    components: {
        ppal: appComponent,
        breadcrumb,
    },
    setup() {
        const listBreadcrumb: Breadcrumb[] = [
            { name: 'Home', link: '/portal' },
            { name: 'Maestros', link: '/bodega_maestros/mantenedor' },
            { name: 'Constructor Pedidos', link: '', active: true },
        ];
        return {
            listBreadcrumb,
        };
    },
    methods: {
        ...Vuex.mapMutations(['SET_FUNCTIONS_PASARELLA']),
        pasarella(params) {
            this.SET_FUNCTIONS_PASARELLA({
                param: params.param,
                funcion: params.function,
            });
        },
    },
    template: html`
        <div>
            <breadcrumb module="Constructor Pedidos a Bodega" :list="listBreadcrumb" />

            <div class="content px-3" id="panel">
                <ppal></ppal>
            </div>
        </div>
    `,
});

document.addEventListener('click', function (event) {
    pasarella(appCPB, event);
});
