import type { FormularioEntrada, Product } from '@/jscontrollers/bodega/salidaExpress/types.d.ts';

export const useSalidaExpressStore = new Vuex.Store({
    strict: mode_build,
    plugins: mode_build ? [Vuex.createLogger()] : [],
    state: {
        etapa: 0,
        formularioEntrada: {
            cod_campus: '',
            desc_campus: '',
            cod_area: '',
            desc_area: '',
            cod_centrogestion: '',
            desc_centrogestion: '',
            solicitante: '',
            jefatura: '',
            observacion: 'Salida express',
        } as FormularioEntrada,
        products: [] as Product[],
        productSelected: {
            codigo: '',
            descripcion: '',
            cantidad: 0,
            valor: 0,
            cod_bodega: '',
            desc_bodega: '',
            cod_tipocodigo: 0,
        } as Product,
    },
    mutations: {
        setEtapa(state: { etapa: number }, etapa: number) {
            state.etapa = etapa;
        },
        setFormularioEntrada(state: { formularioEntrada: FormularioEntrada }, data: FormularioEntrada) {
            state.formularioEntrada = { ...state.formularioEntrada, ...data };
        },
        setProduct(state: { products: Product[] }, data: Product) {
            const product = state.products.find(
                item => item.codigo === data.codigo && item.cod_bodega === data.cod_bodega
            );
            if (product) {
                for (const key in data) {
                    if (Object.prototype.hasOwnProperty.call(data, key)) {
                        product[key] = data[key];
                    }
                }
            } else {
                state.products.push(data);
            }
        },
        setProductSelected(state: { productSelected: Product }, data: Product) {
            state.productSelected = { ...state.productSelected, ...data };
        },
    },
    actions: {},
    getters: {
        getFormularioEntrada(state: { formularioEntrada: FormularioEntrada }): FormularioEntrada {
            return state.formularioEntrada;
        },
        getProducts(state: { products: Product[] }): Product[] {
            return state.products;
        },
        getEtapa(state: { etapa: number }): number {
            return state.etapa;
        },
    },
    modules: {},
    namespaced: true,
});
