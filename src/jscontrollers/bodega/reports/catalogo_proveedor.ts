import { useStoreProveedor } from '@/jscontrollers/bodega/reports/catalagoProveedor/useStoreProveedor';
import { show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
import type { AccionData, actionsType } from 'versaTypes';

import categoria from '@/jscontrollers/bodega/reports/catalagoProveedor/categoria';
import modallistado from '@/jscontrollers/bodega/reports/catalagoProveedor/modalListado';
import cardProveedorModal from '@/jscontrollers/components/cardProveedorModal';

const { defineComponent, onMounted, ref } = Vue;

const app = defineComponent({
    name: 'app',
    components: {
        categoria,
        modallistado,
        cardProveedorModal,
    },
    setup() {
        const array_categoria = ref([]);
        const array_categoria_filter = ref([]);
        const filter = ref('');
        const rutProveedorFilter = ref('');
        const showModal = ref(false);
        const showModalProveedor = ref(false);

        const load_categorias = async () => {
            const response = await versaFetch({
                url: '/api/getMasterCategorias',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            array_categoria.value = response;
            array_categoria_filter.value = JSON.parse(JSON.stringify(response));
        };

        const changeShowModal = estado => {
            showModal.value = estado;
        };

        const filterCategoria = () => {
            if (filter.value.length > 0) {
                array_categoria.value = array_categoria_filter.value.filter(item =>
                    item.descripcion.toLowerCase().includes(filter.value.toLowerCase())
                );
            } else {
                array_categoria.value = JSON.parse(JSON.stringify(array_categoria_filter.value));
            }
        };

        const showModalProveedorFN = () => {
            if (rutProveedorFilter.value.length === 0) {
                show_toast('error', 'Ingrese un rut de proveedor', 'Error');
                return;
            }
            showModalProveedor.value = !showModalProveedor.value;
        };

        const accion = (accion: AccionData) => {
            const actions: actionsType = {
                closeModal: () => {
                    showModalProveedor.value = false;
                },
            };
            const fn = actions[accion.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        onMounted(() => {
            load_categorias();
        });

        return {
            array_categoria,
            array_categoria_filter,
            filter,
            showModal,
            changeShowModal,
            filterCategoria,
            rutProveedorFilter,
            accion,
            showModalProveedorFN,
            showModalProveedor,
        };
    },
    template: html`
        <div class="container-fluid">
            <div class="row">
                <div class="col-md-4 col-xs-2">
                    <div class="input-group mb-3">
                        <input
                            type="text"
                            class="form-control"
                            @input="filterCategoria"
                            aria-describedby="basic-addon2"
                            aria-label="Buscar Categoria"
                            placeholder="Buscar Categoria"
                            v-model="filter" />
                        <div class="input-group-append">
                            <button type="button" class="btn btn-outline-secondary">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 col-xs-4">
                    <div class="input-group mb-3">
                        <input
                            type="text"
                            class="form-control"
                            placeholder="12.345.678-9"
                            v-model="rutProveedorFilter"
                            aria-label="Buscar Proveedor"
                            @keyup.enter="showModalProveedorFN" />
                        <div class="input-group-append">
                            <button type="button" class="btn btn-outline-secondary" @click="showModalProveedorFN">
                                <i class="fas fa-eye"></i>
                                Ver Proveedor
                            </button>
                        </div>
                    </div>
                    <!-- Closing the div for input-group mb-3 -->
                </div>
                <!-- Closing the div for the second column -->
            </div>
            <div class="row">
                <cardProveedorModal :proveedor="rutProveedorFilter" :showModal="showModalProveedor" @accion="accion" />
                <modallistado :showModal="showModal" @closeModal="changeShowModal"></modallistado>
                <categoria
                    :categoria="item"
                    :key="item.id"
                    @showModal="changeShowModal"
                    v-for="item in array_categoria" />
            </div>
        </div>
    `,
});

const _CP_App = new Vue({
    el: '.content',
    components: { app },
    delimiters: ['${', '}'],
    store: useStoreProveedor,
});
