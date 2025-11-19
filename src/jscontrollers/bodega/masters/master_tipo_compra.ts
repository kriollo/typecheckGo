import { show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import customTable from '@/jscontrollers/components/customTable.js';
import iCheck from '@/jscontrollers/components/iCheck.js';
import modal from '@/jscontrollers/components/modal.js';
/* eslint-disable */
const md = modal;
const ct = customTable;
const ic = iCheck;
/* eslint-enable */

Vue.component('crumb', {
    template: html`
        <div class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1 class="m-0 text-dark">
                            <i class="fa fa-money-check-alt"></i>
                            Mantenedor de Tipo Compra
                        </h1>
                    </div>
                    <div class="col-sm-6">
                        <ol class="breadcrumb float-sm-right">
                            <li class="breadcrumb-item">
                                <a href="/portal">Home</a>
                            </li>
                            <li class="breadcrumb-item">
                                <a href="/bodega_maestros">Maestros</a>
                            </li>
                            <li class="breadcrumb-item active">Maestro Tipo Compra</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    `,
});

import newModal from '@/jscontrollers/components/newModal';

Vue.component('item', {
    components: { newModal },
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
        item: {
            type: Object,
            default: () => ({}),
        },
    },
    setup(props) {
        const item = Vue.computed(() => props.item);
        const showModal = Vue.computed(() => props.showModal);

        const itemEditable = Vue.ref({});
        Vue.watch(showModal, value => {
            if (value) {
                itemEditable.value = JSON.parse(JSON.stringify(item.value));
                itemEditable.value.estado = item.value.estado == 1;
            }
        });

        return { showModal, itemEditable };
    },
    methods: {
        accion(accion) {
            if (accion.accion === 'saveItem') {
                if (accion.item.descripcion === '') {
                    show_toast('Alerta', 'Debe ingresar la descripción', 'warning', 'warning');
                    return;
                }
            }
            this.$emit('accion', accion);
        },
    },
    template: html`
        <newModal :showModal="showModal" @accion="accion" idModal="item" size="max-w-md">
            <template v-slot:title>Tipo Compra</template>
            <template v-slot:body>
                <div class="col col-md-12">
                    <div class="form-group" v-if="itemEditable.id !== 0">
                        <label for="codigo">Id</label>
                        <input
                            id="codigo"
                            type="text"
                            class="form-control"
                            disabled
                            placeholder="Id"
                            v-model="itemEditable.id" />
                    </div>
                    <div class="form-group">
                        <label for="descripcion">Descripción</label>
                        <input
                            id="descripcion"
                            type="text"
                            class="form-control"
                            placeholder="Descripción"
                            required
                            v-model="itemEditable.descripcion" />
                    </div>
                    <div class="form-group">
                        <iCheck
                            id="estado"
                            :checked="itemEditable.estado"
                            :disabled="false"
                            label="Estado"
                            v-model="itemEditable.estado" />
                    </div>
                </div>
            </template>
            <template v-slot:footer>
                <div class="flex justify-between">
                    <button
                        type="button"
                        class="btn btn-success"
                        @click="accion({ accion: 'saveItem', item: itemEditable })">
                        <i class="fa fa-save"></i>
                        Guardar
                    </button>
                    <button type="button" class="btn btn-secondary" @click="accion({ accion: 'closeModal' })">
                        <i class="fa fa-times"></i>
                        Cancelar
                    </button>
                </div>
            </template>
        </newModal>
    `,
});

const _appMasterTipoCompra = new Vue({
    el: '#ppal',
    setup() {
        const refreshData = Vue.ref(false);
        const otherFilters = Vue.ref('');

        const showModalItem = Vue.ref(false);

        const newItem = {
            id: 0,
            descripcion: '',
            estado: true,
        };

        const itemSelected = Vue.ref({ ...newItem });

        return {
            refreshData,
            otherFilters,
            showModalItem,
            itemSelected,
            newItem,
        };
    },
    methods: {
        accion(accion) {
            const actions = {
                closeModal: () => {
                    this.showModalItem = false;
                },
                newItem: () => {
                    this.itemSelected = { ...this.newItem };
                    this.showModalItem = true;
                },
                selectEditarItem: () => {
                    this.itemSelected = accion.item;
                    this.showModalItem = true;
                },
                saveItem: () => this.saveItem(accion.item),
                default: () => {
                    show_toast('Error', 'Acción no definida', 'error', 'error');
                },
                changeEstado: () => this.changeEstado(accion.item),
            };
            const fn = actions[accion.accion] || actions.default;
            if (typeof fn === 'function') {
                fn();
            }
        },
        async saveItem(item) {
            const response = await versaFetch({
                url: '/api/saveMasterTipoCompra',
                method: 'POST',
                data: JSON.stringify(item),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (response.success === 1) {
                show_toast('Exito', response.message, 'success', 'success');
                this.refreshData = !this.refreshData;
            } else {
                show_toast('Error', response.message, 'error', 'error');
            }
            this.showModalItem = false;
        },
        async changeEstado(item) {
            const result = await Swal.fire({
                title: 'Cambiar Estado',
                text: `¿Está seguro de cambiar el estado de ${item.descripcion}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                item.estado = item.estado == 1 || item.estado === true ? 0 : 1;
                await this.saveItem(item);
            }
        },
    },
    template: html`
        <div>
            <crumb />
            <!-- Main content -->
            <div class="content">
                <div class="container-fluid">
                    <item :item="itemSelected" :showModal="showModalItem" @accion="accion" />
                    <customTable
                        id="masterTipoCompra"
                        :externalFilters="otherFilters"
                        :refresh="refreshData"
                        @accion="accion"
                        key="masterTipoCompra"
                        titleTable=""
                        url="/api/getMasterTipoCompraPaginate">
                        <template v-slot:headerButtons>
                            <button class="btn btn-primary" @click="accion({'accion':'newItem'})">
                                <i class="fa fa-plus"></i>
                                Nuevo Tipo Compra
                            </button>
                        </template>
                    </customTable>
                </div>
            </div>
        </div>
    `,
});
