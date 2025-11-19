import { GetUniquedArrayObject, versaFetch } from '@/jscontrollers/composables/utils';

export const usePPalStore = new Vuex.Store({
    strict: mode_build,
    plugins: mode_build ? [Vuex.createLogger()] : [],
    state: {
        FileTypeValid: [
            {
                type: 'application/pdf',
                ext: 'pdf',
                icon: 'bi bi-file-earmark-pdf',
                color: 'text-danger',
            },
            {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                ext: 'docx',
                icon: 'bi bi-filetype-docx',
                color: 'text-primary',
            },
            {
                type: 'application/msword',
                ext: 'doc',
                icon: 'bi bi-filetype-doc',
                color: 'text-primary',
            },
            {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                ext: 'xlsx',
                icon: 'bi bi-filetype-xlsx',
                color: 'text-success',
            },
            {
                type: 'application/vnd.ms-excel',
                ext: 'xls',
                icon: 'bi bi-filetype-xls',
                color: 'text-success',
            },
            {
                type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                ext: 'pptx',
                icon: 'bi bi-filetype-pptx',
                color: 'text-warning',
            },
            {
                type: 'application/vnd.ms-powerpoint',
                ext: 'ppt',
                icon: 'bi bi-filetype-ppt',
                color: 'text-warning',
            },
        ],
        owner_user: owner_user,
        campusSessions: campusSessions,
        showLoader: false,
        functionsPasarella: null,
        IVA: IVA,
        user_menu: userMenu,
        op: op,
    },
    mutations: {
        setShowLoader(state, value) {
            state.showLoader = value;
        },
        /**
         * @param {{ functionsPasarella: any; }} state
         * @param {any} functions
         */
        SET_FUNCTIONS_PASARELLA(state, functions) {
            state.functionsPasarella = functions;
        },
    },
    getters: {
        getFileTypeValid: (/** @type {{ FileTypeValid: any[]; }} */ state) =>
            state.FileTypeValid.map((/** @type {{ type: any; }} */ item) => item.type),
        getShowLoader: (/** @type {{ showLoader: Boolean; }} */ state) => state.showLoader,
        getMenu: (/** @type {{ user_menu: Object; op: Object }} */ state) => {
            if (state.op !== null) {
                const id_menu = state.op?.id_menu;
                const id_submenu = state.op?.id_submenu;

                const data = JSON.parse(JSON.stringify(state.user_menu)).reverse();
                const new_data = data.filter(el => el.id_menu == id_menu && el.id_submenu != id_submenu);
                const MenuUnique = GetUniquedArrayObject('id_submenu', new_data);
                return MenuUnique.reverse();
            }
            const data = JSON.parse(JSON.stringify(state.user_menu));

            return GetUniquedArrayObject('id_menu', data);
        },
    },
    actions: {
        async loadBaseParticipantes() {
            const response = await versaFetch({
                url: '/api/getUsersParticipantes',
                method: 'POST',
            });
            return response;
        },
    },
});
