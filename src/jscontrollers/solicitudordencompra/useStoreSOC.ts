'use strinct';
import { versaFetch } from '@/jscontrollers/composables/utils';

export const useStoreSOC = new Vuex.Store({
    strict: mode_build,
    plugins: mode_build ? [Vuex.createLogger()] : [],
    state: {
        formulario: {
            id: 0,
            descripcion: '',
            cod_campus: '',
            cod_area: '',
            cod_proyecto: '',
            observacion: '',
            mantencion_ot: '',
            mantencion_cod_equipo: '',
            mantencion_cod_tiposolicitud: '',
            mantencion_cod_caracteristica: '',
            mantencion_cod_areaencargada: '',
            desc_campus: '',
            desc_area: '',
            desc_proyecto: '',
            desc_equipo: '',
            desc_areaencargada: '',
            cod_condicion1: 0,
            cod_condicion2: 0,
            tipo_oc: '',
            tipo_soc: 'OC General',
        },
        files: [],
        participantes: [],
        progesoCompletitud: {
            formulario: false,
            participantes: false,
            archivos: false,
        },
        proveedores: [],
        cgestion: [],
    },
    mutations: {
        setFiles(state, files) {
            state.files = [...state.files, ...files];
        },
        setFileSelected(state, file) {
            if (file === null) {
                state.files.forEach(item => (item.selected = false));
                return;
            }

            state.files.forEach(item => (item.selected = false));
            const index = state.files.findIndex(item => item.name === file.name);
            if (index >= 0) {
                state.files[index].selected = true;
            }
        },
        setProgresoCompletitud(state, payload) {
            state.progesoCompletitud[payload['key']] = payload['status'];
        },
        setDataFile(state, payload) {
            if (payload['data']['seleccionado']) {
                state.files.forEach(item => {
                    item.data.seleccionado = false;
                    item.data.observacion = '';
                });
            }

            const index = state.files.findIndex(item => item.name === payload['file']);
            if (index >= 0) {
                state.files[index].data = payload['data'];
            }
        },
        deleteFileStore(state, file) {
            const index = state.files.findIndex(item => item.name === file.name);
            if (index >= 0) {
                state.files.splice(index, 1);
            }
        },
        setFormulario(state, payload) {
            state.formulario = { ...payload };
        },
        setParticipantes(state, payload) {
            state.participantes = [...state.participantes, payload];
        },
        deleteParticipante(state, index) {
            state.participantes.splice(index, 1);
        },
        updateParticipanteStore(state, payload) {
            state.participantes[payload.index][payload.data.key] = payload.data.value;
        },
        setIdFormulario(state, id) {
            state.formulario.id = id;
        },
        setProveedores(state, proveedores) {
            state.proveedores = JSON.parse(JSON.stringify(proveedores));
        },
        setCGestion(state, cgestion) {
            state.cgestion = JSON.parse(JSON.stringify(cgestion));
        },
    },
    getters: {
        getDataFileSortedBySelectedMonto: state => {
            // mostrar los archivos seleccionados primero
            const files = state.files.filter(item => item.data.seleccionado === true);
            const files2 = state.files.filter(item => item.data.seleccionado === false);

            const files3 = files2.sort((a, b) => {
                if (a.data.monto < b.data.monto) return -1;
                if (a.data.monto > b.data.monto) return 1;
                return 0;
            });

            return [...files, ...files3];
        },
        getFileSelected: state => state.files.find(item => item.data.seleccionado === true),
    },
    actions: {
        async saveSOCStore({ state }) {
            const formD = new FormData();
            formD.append('formulario', JSON.stringify(state.formulario));
            formD.append('participantes', JSON.stringify(state.participantes));
            formD.append('cgestion', JSON.stringify(state.cgestion));
            const data = [];
            for (const file of state.files) {
                formD.append('file[]', file.file.file);
                data.push({
                    name: file.name,
                    data: file.data,
                });
            }
            formD.append('data', JSON.stringify(data));

            const response = await versaFetch({
                url: '/api/saveSOC',
                method: 'POST',
                data: formD,
            });

            return response;
        },
        async getSOCByIdFullStore({ _state }, id) {
            const formD = new FormData();
            formD.append('id', id);
            const response = await versaFetch({
                url: '/api/getSOCById',
                method: 'POST',
                data: formD,
            });

            return response;
        },
    },
});
