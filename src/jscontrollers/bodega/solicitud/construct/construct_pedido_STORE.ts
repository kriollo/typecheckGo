import { versaFetch } from '@/jscontrollers/composables/utils';

export const storeCPB = new Vuex.Store({
    state: {
        function_pasarella: null,
        view_edit_pedido: false,
        pedidos: [],
        pedido: {
            id: 0,
            descripcion: '',
            estado: 1,
        },
        tipo_codigo: [],
        productos: [],
        array_title_productos: [],
        usuarios: [],
        usuarios_local: [],
        shoModalUpload: false,
    },
    mutations: {
        SET_FUNCTIONS_PASARELLA(state, value) {
            state.function_pasarella = value;
        },
        SET_VIEW_EDIT_PEDIDO(state, value) {
            state.view_edit_pedido = value;
        },
        LOAD_PEDIDOS(state, pedidos) {
            state.pedidos = pedidos;
        },
        SET_PEDIDO(state, pedido) {
            state.pedido = pedido;
        },
        EDIT_PEDIDO(state, pedido) {
            state.pedidos.forEach((forPedido, key) => {
                if (forPedido.id === pedido.id) {
                    state.pedidos[key] = pedido;
                }
            });
        },
        SET_TIPOCODIGO(state, tipo_codigo) {
            state.tipo_codigo = tipo_codigo;
        },
        SET_USUARIOS(state, usuarios) {
            state.usuarios = usuarios;
        },
        DEL_USUARIOS_VALUE(state, index) {
            state.usuarios.splice(index, 1);
        },
        SET_USUARIOS_LOCAL(state, usuarios_local) {
            state.usuarios_local = usuarios_local;
        },
        SET_PRODUCTOS(state, productos) {
            state.productos = productos;
        },
        SET_ARRAY_TITLE_PRODUCTOS(state, array_title_productos) {
            state.array_title_productos = array_title_productos;
        },
        DELETE_PRODUCTO(state, index) {
            state.productos.splice(index, 1);
        },
        SET_SHOW_MODAL_UPLOAD(state, value) {
            state.shoModalUpload = value;
        },
    },
    actions: {
        async getPedidos() {
            //api que obtiene sólo clientes activos
            const headersList = {
                'Content-Type': 'application/json',
            };

            const data = await versaFetch({
                url: '/api/getConstructPedidos',
                method: 'POST',
                headers: headersList,
            });
            return data;
        },
        async getPedido(context, id) {
            //api que obtiene sólo clientes activos
            const headersList = {
                'Content-Type': 'application/json',
            };

            const data = await versaFetch({
                url: '/api/getConstructPedido',
                method: 'POST',
                headers: headersList,
                data: JSON.stringify({ id }),
            });
            return data;
        },
        async savePedido(context, params) {
            //api que obtiene sólo clientes activos
            const headersList = {
                'Content-Type': 'application/json',
            };

            const data = await versaFetch({
                url: '/api/saveConstructPedidos',
                method: 'PUT',
                headers: headersList,
                data: JSON.stringify(params),
            });
            return data;
        },
        async deleteConstructPedido(context, pedido, newEstado) {
            //api que obtiene sólo clientes activos
            const headersList = {
                'Content-Type': 'application/json',
            };

            const data = await versaFetch({
                url: '/api/deleteConstructPedido',
                method: 'DELETE',
                headers: headersList,
                data: JSON.stringify({ id: pedido.id, estado: newEstado }),
            });
            return data;
        },
        async publicPedido(context, pedido, newEstado) {
            //api que obtiene sólo clientes activos
            const headersList = {
                'Content-Type': 'application/json',
            };

            const data = await versaFetch({
                url: '/api/publicarConstructPedido',
                method: 'PATCH',
                headers: headersList,
                data: JSON.stringify({ id: pedido.id, estado: newEstado }),
            });
            return data;
        },
        async getTipoCodigo() {
            const headersList = {
                'Content-Type': 'application/json',
            };
            const data = {
                estado: 1,
            };
            const response = await versaFetch({
                url: '/api/getTipoCodigo',
                method: 'POST',
                headers: headersList,
                data: JSON.stringify(data),
            });
            return response;
        },
        async getUsers() {
            const headersList = {
                'Content-Type': 'application/json',
            };
            const data = {
                estado: 1,
            };
            const response = await versaFetch({
                url: '/api/getAllUsersConstruct',
                method: 'POST',
                headers: headersList,
                data: JSON.stringify(data),
            });
            return response;
        },
        async delProductoPedido(context, id) {
            const headersList = {
                'Content-Type': 'application/json',
            };
            const data = {
                id,
            };
            const dataResponse = await versaFetch({
                url: '/api/deleteConstructProductoPedido',
                method: 'DELETE',
                headers: headersList,
                data: JSON.stringify(data),
            });
            return dataResponse;
        },
        async getProductoPedido(context, param) {
            const headersList = {
                'Content-Type': 'application/json',
            };
            const dataResponse = await versaFetch({
                url: '/api/getConstructProductoPedido',
                method: 'POST',
                headers: headersList,
                data: JSON.stringify(param),
            });
            return dataResponse;
        },
        async saveProductoPedidoMasivo(context, param) {
            const headersList = {
                'Content-Type': 'application/json',
            };
            const dataResponse = await versaFetch({
                url: '/api/saveConstructProductoPedidoMasivo',
                method: 'POST',
                headers: headersList,
                data: JSON.stringify(param),
            });
            return dataResponse;
        },
    },
});
