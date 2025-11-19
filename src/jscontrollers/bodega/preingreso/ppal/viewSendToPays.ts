import customTable from '@/jscontrollers/components/customTable';
import loader from '@/jscontrollers/components/loading';
import newModal from '@/jscontrollers/components/newModal';

import { addDias, getDiaActual } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import type { AccionData, actionsType } from 'versaTypes';
import type { Ref } from 'vue';

/* eslint-disable */
const c = customTable;
const l = loader;
/* eslint-enable */

const { computed, ref, watch } = Vue;
interface Props {
    showModal: boolean;
    disabledAll: boolean;
}

const props = <Props>{
    showModal: false,
    disabledAll: false,
};

export default Vue.component('viewSendToPays', {
    components: { newModal },
    props,
    setup(props: Props, { emit }) {
        const showModal = computed(() => props.showModal) as Ref<boolean>;
        const disabledAll = computed(() => props.disabledAll) as Ref<boolean>;

        const fechaDesde = ref(addDias(getDiaActual(), -30)) as Ref<string>;
        const fechaHasta = ref(getDiaActual()) as Ref<string>;
        const refresh = ref(false) as Ref<boolean>;
        const externalFilters = ref(`&fechaDesde=${fechaDesde.value}&fechaHasta=${fechaHasta.value}`) as Ref<string>;

        const submitForm = () => {
            externalFilters.value = `&fechaDesde=${fechaDesde.value}&fechaHasta=${fechaHasta.value}`;
            refresh.value = !refresh.value;
        };

        watch(
            () => showModal.value,
            () => {
                if (showModal.value) {
                    submitForm();
                }
            }
        );

        const accion = (accion: AccionData) => {
            const actions: actionsType = {
                closeModal: () => {
                    emit('accion', accion);
                },
                default: () => {
                    emit('accion', accion);
                },
            };
            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        };

        return {
            showModal,
            accion,
            externalFilters,
            refresh,
            fechaDesde,
            fechaHasta,
            submitForm,
            disabledAll,
        };
    },
    template: html`
        <newModal idModal="viewSendToPays" :showModal="showModal" @accion="accion">
            <template v-slot:title>
                <div class="flex flex-row align-items-center">
                    <span>Ver Pagos enviados</span>
                    <loader v-if="disabledAll" />
                </div>
            </template>
            <template v-slot:body>
                <div class="flex w-full flex-column">
                    <customTable
                        class="w-full"
                        id="viewSendToPaysTable"
                        titleTable="Pagos enviados"
                        url="/api/bodega/preingreso/getSendToPaymentBetweenDates"
                        :externalFilters="externalFilters"
                        :refresh="refresh"
                        :showExcel="false"
                        :perPage="4"
                        @accion="accion">
                        <template v-slot:headerButtons>
                            <form @submit.prevent="submitForm" class="row" :disabled="disabledAll">
                                <div class="col-4 flex-column flex">
                                    <label for="fechaDesde" class="">Fecha Desde</label>
                                    <input type="date" class="form-control" id="fechaDesde" v-model="fechaDesde" />
                                </div>
                                <div class="col-4 flex-column flex">
                                    <label for="fechaHasta">Fecha Hasta</label>
                                    <input type="date" class="form-control" id="fechaHasta" v-model="fechaHasta" />
                                </div>
                                <button type="submit" class="btn btn-primary col-4">
                                    <i class="fa fa-search"></i>
                                    Buscar Facturas
                                </button>
                            </form>
                        </template>
                    </customTable>
                </div>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-secondary" @click="accion({accion:'closeModal'})">Cerrar</button>
            </template>
        </newModal>
    `,
});
