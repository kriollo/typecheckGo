import confirmacion from '@/jscontrollers/bodega/salidaExpress/confirmacion';
import editProduct from '@/jscontrollers/bodega/salidaExpress/editProduct';
import indicadorEtapa from '@/jscontrollers/bodega/salidaExpress/indicadorEtapa';
import listProducts from '@/jscontrollers/bodega/salidaExpress/listProducts';
import selectSalidaExpress from '@/jscontrollers/bodega/salidaExpress/selectSalidaExpress';
import breadcrumb, { type Breadcrumb } from '@/jscontrollers/components/breadcrumb';

import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import { useSalidaExpressStore } from '@/jscontrollers/bodega/salidaExpress/salidaExpresStore';

import type { Product } from '@/jscontrollers/bodega/salidaExpress/types.d.ts';
import { scrollToTop } from '@/jscontrollers/composables/dom-selector';
import type { AccionData, actionsType } from 'versaTypes';

const { computed } = Vue;

const _appSalidaExpress = new Vue({
    el: '#ppal',
    store: useSalidaExpressStore,
    components: {
        breadcrumb,
        indicadorEtapa,
        listProducts,
        editProduct,
        confirmacion,
        selectSalidaExpress,
    },
    setup() {
        const listBreadcrumb: Breadcrumb[] = [
            { name: 'Home', link: '/' },
            { name: 'Bodega', link: '/bodega', active: true },
            { name: 'Salida Express', link: '/bodega/salida_express', active: true },
        ];
        const etapa = computed(() => useSalidaExpressStore.state.etapa);
        const products = computed(() => useSalidaExpressStore.state.products);

        const accion = (data: AccionData) => {
            const actions: actionsType = {
                setProductSelected: () => {
                    if (data.id === -1) {
                        useSalidaExpressStore.commit('setProductSelected', {
                            codigo: '',
                            descripcion: '',
                            cantidad: 0,
                            valor: 0,
                            cod_bodega: '',
                            desc_bodega: '',
                        } as Product);
                    } else {
                        useSalidaExpressStore.commit('setProductSelected', products.value[data.id]);
                    }
                    useSalidaExpressStore.commit('setEtapa', 2);
                },
                editProduct: () => {
                    useSalidaExpressStore.commit('setProduct', data.product);
                    useSalidaExpressStore.commit('setEtapa', 1);
                },
            };
            const fn = actions[data.accion];
            if (typeof fn === 'function') {
                fn();
                scrollToTop('.content-wrapper');
            }
        };

        return {
            etapa,
            listBreadcrumb,
            accion,
        };
    },
    template: html`
        <div class="content-header">
            <breadcrumb module="Salida Express" :list="listBreadcrumb" />
            <div class="content">
                <div class="container-fluid">
                    <indicadorEtapa class="mb-10" />
                    <select-salida-express v-if="etapa === 0" />
                    <list-products v-else-if="etapa === 1" @accion="accion" />
                    <edit-product v-else-if="etapa === 2" @accion="accion" />
                    <confirmacion v-else-if="etapa === 3" @accion="accion" />
                </div>
            </div>
        </div>
    `,
});
