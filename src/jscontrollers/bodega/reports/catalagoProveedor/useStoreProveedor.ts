import { versaFetch } from '@/jscontrollers/composables/utils';

export const useStoreProveedor = new Vuex.Store({
    strict: mode_build,
    plugins: mode_build ? [Vuex.createLogger()] : [],
    state: {
        categoria_selected: [],
    },
    mutations: {
        setCategoriaSelected(state, item) {
            state.categoria_selected = item;
        },
    },
    getters: {},
    actions: {
        async load_proveedores({ _commit }, id_categoria) {
            const response = await versaFetch({
                url: '/api/getProveedoresByCategoria',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ id_categoria: id_categoria }),
            });
            return response;
        },
    },
});
