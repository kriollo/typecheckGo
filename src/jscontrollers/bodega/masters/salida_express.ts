import formEntrada from '@/jscontrollers/bodega/masters/salida_express/item';
import breadcrumb, { type Breadcrumb } from '@/jscontrollers/components/breadcrumb';
import customTable from '@/jscontrollers/components/customTable';

import type { AccionData, actionsType } from 'versaTypes';
import type { Ref } from 'vue';
export type SalidaExpressItem = {
    id: number;
    descripcion: string;
    cod_campus: string;
    desc_campus: string;
    cod_area: string;
    desc_area: string;
    cod_centrogestion: string;
    desc_centrogestion: string;
    solicitante: string;
    estado?: boolean;
};

import { show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
/* eslint-disable */
const ct = customTable;
/* eslint-enable */
const { ref } = Vue;
const _masterSalidaExpress = new Vue({
    el: '#ppal',
    components: {
        breadcrumb,
        formEntrada,
    },
    setup() {
        const listBreadcrumb: Breadcrumb[] = [
            { name: 'Home', link: '/' },
            { name: 'Maestros', link: '/bodega_maestros' },
            { name: 'Salida Express', link: '/bodega_maestros/salida_express', active: true },
        ];

        const refreshTable = ref(false);

        const showModalItem = ref(false);
        const newItem: SalidaExpressItem = {
            id: 0,
            descripcion: '',
            cod_campus: '',
            desc_campus: '',
            cod_area: '',
            desc_area: '',
            cod_centrogestion: '',
            desc_centrogestion: '',
            estado: true,
            solicitante: '',
        };
        const itemSelected = ref({ ...newItem }) as Ref<SalidaExpressItem | null>;

        const saveItem = async (item: SalidaExpressItem) => {
            const result = await Swal.fire({
                title: '¿Estas seguro de guardar el item?',
                text: 'No podrás revertir esto!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, guardar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    url: '/api/masters/saveMasterSalidaExpress',
                    method: 'POST',
                    data: JSON.stringify(item),
                    headers: { 'Content-Type': 'application/json' },
                });
                if (response.success === 1) {
                    show_toast('Success', 'Item guardado correctamente', 'success', 'success');
                    showModalItem.value = false;
                    itemSelected.value = { ...newItem };
                    refreshTable.value = !refreshTable.value;
                    return;
                }
                show_toast('Error', 'Ocurrio un error al guardar el item', 'error', 'error');
            }
        };

        const changeEstado = async (item: SalidaExpressItem) => {
            const result = await Swal.fire({
                title: '¿Estas seguro de cambiar el estado del item?',
                text: 'No podrás revertir esto!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, cambiar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    url: '/api/masters/changeEstadoSalidaExpress',
                    method: 'POST',
                    data: JSON.stringify({ id: item.id, estado: !item.estado }),
                    headers: { 'Content-Type': 'application/json' },
                });
                if (response.success === 1) {
                    show_toast('Success', response.message, 'success', 'success');
                    refreshTable.value = !refreshTable.value;
                    return;
                }
                show_toast('Error', response.message, 'error', 'error');
            }
        };

        const accion = (accion: AccionData) => {
            const actions: actionsType = {
                openModalItem: () => {
                    itemSelected.value = (accion.item as SalidaExpressItem) ? { ...accion.item } : { ...newItem };
                    showModalItem.value = true;
                },
                closeModalItem: () => {
                    showModalItem.value = false;
                    itemSelected.value = { ...newItem };
                },
                save: () => saveItem(accion.item as SalidaExpressItem),
                changeEstado: () => changeEstado(accion.item as SalidaExpressItem),
                selectEditarItem: () => {
                    itemSelected.value = (accion.item as SalidaExpressItem) ? { ...accion.item } : { ...newItem };
                    showModalItem.value = true;
                },
            };
            const fn = actions[accion.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        return {
            listBreadcrumb,
            showModalItem,
            accion,
            itemSelected,
            refreshTable,
        };
    },
    template: html`
        <div>
            <breadcrumb module="Constructor de Salida Express" :list="listBreadcrumb" />
            <form-entrada :PropsformData="itemSelected" :showModal="showModalItem" @accion="accion" />
            <div class="content">
                <div class="container-fluid">
                    <custom-table
                        titleTable="Salida Express"
                        url="/api/masters/getMasterSalidaExpress"
                        @accion="accion"
                        :refresh="refreshTable">
                        <template #headerButtons>
                            <button class="btn btn-primary" @click="accion({ accion: 'openModalItem', item: null })">
                                Agregar
                            </button>
                        </template>
                    </custom-table>
                </div>
            </div>
        </div>
    `,
});
