import { fetchAllDependencias } from '@/jscontrollers/composables/fetching.js';

export const useGEDAStore = new Vuex.Store({
    strict: mode_build,
    plugins: mode_build ? [Vuex.createLogger()] : [],
    state: {
        dependencias: [],
    },
    mutations: {
        setDependencias(state, dependencias) {
            state.dependencias = JSON.parse(JSON.stringify(dependencias));
        },
    },
    getters: {},
    actions: {
        async getDependencias({ commit }) {
            fetchAllDependencias().then(response => {
                if (response.success === 1) {
                    commit('setDependencias', response.data);
                }
            });
        },
    },
});
