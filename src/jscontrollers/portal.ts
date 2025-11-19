import { usePPalStore } from '@/jscontrollers/usePPalStore';

import cardMenu from '@/jscontrollers/components/cardMenu';
/* eslint-disable */
const cm = cardMenu;
/* eslint-enable */

const _adminwys = new Vue({
    el: '#ppal',
    delimiters: ['${', '}'],
    store: usePPalStore,
    setup() {
        const menu = usePPalStore.getters.getMenu;
        const fieldshow = Vue.ref('menu');
        if (usePPalStore.state.op !== null) {
            fieldshow.value = 'descripcion';
        }

        return {
            menu,
            fieldshow,
        };
    },
});
