import barCode from '@/jscontrollers/bodega/salidaExpress/barCode';
import { useSalidaExpressStore } from '@/jscontrollers/bodega/salidaExpress/salidaExpresStore';

import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import type { Product } from '@/jscontrollers/bodega/salidaExpress/types.d.ts';
import { $dom } from '@/jscontrollers/composables/dom-selector';
import { show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import type { AccionData, actionsType } from 'versaTypes';
import type { Ref } from 'vue';

const { ref, computed, watch, defineComponent, watchEffect, onMounted, nextTick } = Vue;
export default defineComponent({
    name: 'editProduct',
    props: {},
    components: {
        barCode,
    },
    setup(props, { emit }) {
        const product = computed(() => useSalidaExpressStore.state.productSelected) as Ref<Product>;
        const productLocal = ref({}) as Ref<Product>;
        const showModalBarcode = ref(false);
        const disabledSave = ref(true);
        const showAlert = ref(false);

        type BodegaType = {
            cod_bodega: string;
            desc_bodega: string;
            id_tipocodigo: string;
            desc_tipocodigo: string;
            stock_actual: number;
            preciocompra: number;
        };
        const bodegaSelected = ref(null) as Ref<BodegaType>;

        const bodegas = ref([]) as Ref<BodegaType[]>;

        const limpiar = () => {
            bodegas.value = [];
            productLocal.value.cantidad = 0;
            productLocal.value.valor = 0;
            productLocal.value.cod_bodega = null;
            productLocal.value.desc_bodega = null;
            productLocal.value.descripcion = null;
            productLocal.value.cod_tipocodigo = 0;
        };
        const searchProduct = async (codigo: string) => {
            limpiar();
            const response = await versaFetch({
                url: '/api/masters/getProductAndBodegas',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ codigo }),
            });
            if (response.success === 1) {
                productLocal.value.codigo = codigo;
                productLocal.value.descripcion = response.data[0].descripcion;

                bodegas.value = response.data.map((bodega: any) => {
                    return {
                        cod_bodega: bodega.cod_bodega,
                        desc_bodega: bodega.desc_bodega,
                        id_tipocodigo: bodega.id_tipocodigo,
                        desc_tipocodigo: bodega.desc_tipocodigo,
                        stock_actual: bodega.stock_actual,
                        preciocompra: bodega.preciocompra,
                    };
                });

                if (bodegas.value.length === 1) {
                    bodegaSelected.value = bodegas.value[0];
                    productLocal.value.cod_bodega = bodegas.value[0].cod_bodega;
                    productLocal.value.desc_bodega = bodegas.value[0].desc_bodega;
                    productLocal.value.valor = bodegas.value[0].preciocompra;
                    productLocal.value.cod_tipocodigo = Number(bodegas.value[0].id_tipocodigo);
                }

                return;
            }
            show_toast('Alerta', response.message, 'Salida Express', 'warning');

            return;
        };

        //load al cargar el componente
        watch(
            () => product.value,
            async newValue => {
                if (newValue.codigo && newValue.codigo !== '') {
                    await searchProduct(newValue.codigo);
                }
                productLocal.value = { ...newValue };
                bodegaSelected.value = bodegas.value.find(
                    bodega => bodega.cod_bodega === productLocal.value.cod_bodega
                );
                if (bodegaSelected.value) {
                    productLocal.value.desc_bodega = bodegaSelected.value.desc_bodega;
                    productLocal.value.valor = bodegaSelected.value.preciocompra;
                    productLocal.value.cod_tipocodigo = Number(bodegaSelected.value.id_tipocodigo);
                }
            },
            { immediate: true }
        );

        watch(
            () => productLocal.value.cod_bodega,
            newValue => {
                bodegaSelected.value = null;
                if (newValue) {
                    bodegaSelected.value = bodegas.value.find(bodega => bodega.cod_bodega === newValue);
                    productLocal.value.desc_bodega = bodegaSelected.value.desc_bodega;
                    productLocal.value.valor = bodegaSelected.value.preciocompra;
                    productLocal.value.cod_tipocodigo = Number(bodegaSelected.value.id_tipocodigo);
                }
            }
        );

        watchEffect(() => {
            disabledSave.value =
                productLocal.value.cantidad <= 0 ||
                !productLocal.value.codigo ||
                !productLocal.value.descripcion ||
                !productLocal.value.cod_bodega ||
                productLocal.value.cantidad > bodegaSelected.value.stock_actual;
            if (bodegaSelected.value) {
                productLocal.value.valor = bodegaSelected.value.preciocompra;
            }

            showAlert.value =
                productLocal.value.cantidad >
                (bodegaSelected.value?.stock_actual ? bodegaSelected.value.stock_actual : 0);
        });

        const editProduct = () => {
            emit('accion', { accion: 'editProduct', product: productLocal.value });
        };

        onMounted(() => {
            nextTick(() => {
                const input = $dom('#codigo');
                if (input instanceof HTMLInputElement) {
                    input.focus();
                }
            });
        });

        const selectedContentedInput = (event: Event) => {
            const target = event.target as HTMLInputElement;
            if (target) {
                target.select();
            }
        };

        const accion = (data: AccionData) => {
            const actions: actionsType = {
                closeModalBarCode: () => {
                    showModalBarcode.value = false;
                },
                scanCode: () => searchProduct(data.codigo),
            };
            const fn = actions[data.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        return {
            productLocal,
            editProduct,
            showModalBarcode,
            accion,
            disabledSave,
            searchProduct,
            bodegas,
            bodegaSelected,
            selectedContentedInput,
            showAlert,
        };
    },
    template: html`
        <div>
            <barCode :showModal="showModalBarcode" @accion="accion" />
            <form class="col col-12 grid justify-center" @submit.prevent="editProduct">
                <div class="w-full space-y-4 md:space-y-0 md:flex md:items-start md:gap-4">
                    <div class="w-full md:w-6/12">
                        <label for="codigo" class="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                            Código
                            <span class="text-red-500">*</span>
                        </label>
                        <div class="flex items-center gap-2">
                            <input
                                type="text"
                                id="codigo"
                                v-model="productLocal.codigo"
                                class="w-full form-control"
                                @keyup.enter="searchProduct(productLocal.codigo)"
                                autocomplete="off"
                                required />
                            <button
                                type="button"
                                class="btn btn-primary flex-shrink-0 flex items-center justify-center w-10 h-10"
                                @click="searchProduct(productLocal.codigo)">
                                <span class="sr-only">Buscar</span>
                                <i class="bi bi-search"></i>
                            </button>
                            <button
                                type="button"
                                class="btn btn-primary flex-shrink-0 flex items-center justify-center w-10 h-10"
                                @click="showModalBarcode = true">
                                <span class="sr-only">Scan</span>
                                <i class="bi bi-qr-code"></i>
                            </button>
                        </div>
                    </div>
                    <div class="w-full md:w-7/12">
                        <label
                            for="descripcion"
                            class="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                            Descripción
                            <span class="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="descripcion"
                            v-model="productLocal.descripcion"
                            class="w-full form-control"
                            required />
                    </div>
                </div>
                <div class="w-full mt-4">
                    <div class="flex items-center justify-between mb-2">
                        <span class="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                            Bodega
                            <span class="text-red-500">*</span>
                        </span>
                        <span>Cantidad Disponible: {{ bodegaSelected ? bodegaSelected.stock_actual : 0 }}</span>
                    </div>
                    <select
                        id="bodega"
                        v-model="productLocal.cod_bodega"
                        class="w-full form-control"
                        :disabled="bodegas.length === 1">
                        <option value="">Seleccione una bodega</option>
                        <option v-for="bodega in bodegas" :key="bodega.cod_bodega" :value="bodega.cod_bodega">
                            {{ bodega.desc_bodega }}
                        </option>
                    </select>
                </div>
                <!--
                <div v-else-if="bodegas.length === 1" class="w-full mt-4">
                    <div class="flex items-center justify-between mb-2">
                        <span class="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                            Bodega
                            <span class="text-red-500">*</span>
                        </span>
                        <span>Cantidad Disponible: {{ bodegaSelected ? bodegaSelected.stock_actual : 0 }}</span>
                    </div>
                    <select id="bodega" v-model="productLocal.cod_bodega" class="w-full form-control" disabled>
                        <option :value="productLocal.cod_bodega">{{ productLocal.desc_bodega }}</option>
                    </select>
                </div>
                -->

                <div v-if="bodegaSelected" class="w-full mt-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label
                                for="stock_actual"
                                class="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                                Cantidad a extraer
                                <span class="text-red-500">*</span>
                            </label>
                            <input
                                @click="selectedContentedInput($event)"
                                type="number"
                                id="stock_actual"
                                autocomplete="off"
                                min="1"
                                v-model.number="productLocal.cantidad"
                                class="w-full form-control" />
                        </div>
                        <div>
                            <label
                                for="preciocompra"
                                class="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                                Precio Compra
                            </label>
                            <input
                                type="text"
                                id="preciocompra"
                                v-model="productLocal.valor"
                                class="w-full form-control text-right"
                                disabled />
                        </div>
                    </div>
                </div>

                <div class="w-full mt-8 px-4 md:px-0">
                    <div
                        v-if="showAlert"
                        class="flex items-center gap-2 p-4 mb-4 text-yellow-800 border-l-4 border-yellow-300 bg-yellow-50 dark:text-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-500">
                        <i class="bi bi-exclamation-triangle text-xl"></i>
                        <p class="text-sm font-medium">
                            La cantidad a extraer no puede ser mayor a la cantidad disponible en bodega
                        </p>
                    </div>
                    <button
                        type="submit"
                        class="w-full md:max-w-md mx-auto block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                        :disabled="disabledSave">
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    `,
});
