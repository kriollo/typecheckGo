import { useSalidaExpressStore } from '@/jscontrollers/bodega/salidaExpress/salidaExpresStore';

import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { computed, defineComponent } = Vue;

export default defineComponent({
    name: 'list-products',
    setup(_props, { emit }) {
        const products = computed(() => useSalidaExpressStore.state.products);

        const removeProduct = index => {
            emit('accion', { accion: 'removeProduct', id: index });
        };
        const editProduct = index => {
            emit('accion', { accion: 'setProductSelected', id: index });
        };

        const formatPrice = (price: number) => {
            return new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
            }).format(price);
        };

        const saveProducts = () => {
            emit('accion', { accion: 'saveProducts' });
        };

        const irAEtapa = (nuevaEtapa: number) => {
            useSalidaExpressStore.commit('setEtapa', nuevaEtapa);
        };

        const addItem = () => {
            emit('accion', { accion: 'setProductSelected', id: -1 });
        };

        return {
            products,
            removeProduct,
            formatPrice,
            editProduct,
            saveProducts,
            irAEtapa,
            addItem,
        };
    },
    template: html`
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div class="mb-2 flex justify-between items-center">
                <h2 class="text-lg font-semibold dark:text-gray-800">Lista de Productos</h2>
                <div class="flex gap-2">
                    <button
                        @click="addItem"
                        class="flex gap-2 items-center text-white bg-green-700 hover:bg-green-900 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 py-2 px-4 rounded-md">
                        <div class="flex gap-2 items-center">
                            <span class="hidden md:block">Añadir</span>
                            <i class="fa fa-plus"></i>
                        </div>
                    </button>
                    <button
                        v-if="products.length > 0"
                        @click="irAEtapa(3)"
                        class="flex gap-2 items-center text-white bg-slate-700 hover:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-slate-500 dark:bg-slate-600 dark:hover:bg-slate-700 dark:focus:ring-slate-800 py-2 px-4 rounded-md">
                        <div class="flex gap-2 items-center">
                            <span class="hidden md:block">Finalizar</span>
                            <i class="fa fa-arrow-circle-right" aria-hidden="true"></i>
                        </div>
                    </button>
                </div>
            </div>

            <div v-if="products.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                No hay productos en la lista
            </div>
            <div v-else>
                <!-- Vista de tabla para pantallas grandes -->
                <div class="hidden md:block overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr class="border-b dark:border-gray-700">
                                <th class="py-2 px-3 text-left text-sm font-medium text-gray-500 dark:text-gray-800">
                                    Código
                                </th>
                                <th class="py-2 px-3 text-left text-sm font-medium text-gray-500 dark:text-gray-800">
                                    Bodega
                                </th>
                                <th class="py-2 px-3 text-left text-sm font-medium text-gray-500 dark:text-gray-800">
                                    Descripción
                                </th>
                                <th class="py-2 px-3 text-left text-sm font-medium text-gray-500 dark:text-gray-800">
                                    Cantidad
                                </th>
                                <th class="py-2 px-3 text-left text-sm font-medium text-gray-500 dark:text-gray-800">
                                    Precio
                                </th>
                                <th class="py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-800">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(product, index) in products" :key="index" class="border-b dark:border-gray-700">
                                <td class="py-3 px-3 text-sm dark:text-gray-700">{{ product.codigo }}</td>
                                <td class="py-3 px-3 text-sm dark:text-gray-700">{{ product.desc_bodega }}</td>
                                <td class="py-3 px-3 text-sm dark:text-gray-700">{{ product.descripcion }}</td>
                                <td class="py-3 px-3 text-sm dark:text-gray-700">{{ product.cantidad }}</td>
                                <td class="py-3 px-3 text-sm dark:text-gray-700">{{ formatPrice(product.valor) }}</td>
                                <td class="py-3 px-3 text-center">
                                    <button
                                        @click="removeProduct(index)"
                                        class="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                    <button
                                        @click="editProduct(index)"
                                        class="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Vista de tarjetas para móviles -->
                <div class="md:hidden space-y-4">
                    <div
                        v-for="(product, index) in products"
                        :key="index"
                        class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-semibold dark:text-gray-200">Código: {{ product.codigo }}</span>
                            <div class="flex space-x-2">
                                <button
                                    @click="editProduct(index)"
                                    class="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button
                                    @click="removeProduct(index)"
                                    class="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div class="space-y-1 text-sm dark:text-gray-300">
                            <p>
                                <span class="font-medium">Bodega:</span>
                                {{ product.desc_bodega }}
                            </p>
                            <p>
                                <span class="font-medium">Descripción:</span>
                                {{ product.descripcion }}
                            </p>
                            <div class="flex justify-between">
                                <p>
                                    <span class="font-medium">Cantidad:</span>
                                    {{ product.cantidad }}
                                </p>
                                <p>
                                    <span class="font-medium">Precio:</span>
                                    {{ formatPrice(product.valor) }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});
