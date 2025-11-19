import { addDias, getDiaActual } from '@/jscontrollers/composables/utils';
import { useGEDAStore } from '@/jscontrollers/stores/dependencias.js';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm.js';

import crumb from '@/jscontrollers/geda/asingancion/crumb';
import showModalValeSalida from '@/jscontrollers/geda/asingancion/showModalValeSalida';
import viewASignacionValeSalida from '@/jscontrollers/geda/asingancion/viewASignacionValeSalida';
import type { AccionData, actionsType } from 'versaTypes';

const { defineComponent, ref, watch } = Vue;

const ppal = defineComponent({
    name: 'ppal',
    components: { showModalValeSalida, viewASignacionValeSalida },
    setup() {
        const refreshData = ref(false);
        const otherFilters = ref('');
        const showModalVS = ref(false);
        const valeSalidaSelected = ref({});
        const PendientesVS = ref(0);

        const countPendientesMovimientos = ref(0);
        Vue.provide('countPendientesMovimientos', countPendientesMovimientos);

        const filterVSA = ref({
            desde: addDias(getDiaActual(), -30),
            hasta: getDiaActual(),
        });
        const refreshDataVSA = ref(false);
        const otherFiltersVSA = ref(
            `date(ga.created_at) BETWEEN '${addDias(getDiaActual(), -30)}' AND '${getDiaActual()}'`
        );
        const showModalVSA = ref(false);
        const valeSalidaVSA = ref(0);

        watch(
            filterVSA,
            val => {
                if (val.desde !== '' && val.hasta !== '') {
                    otherFiltersVSA.value = `date(ga.created_at) BETWEEN '${filterVSA.value.desde}' AND '${filterVSA.value.hasta}'`;
                }
            },
            {
                deep: true,
            }
        );

        useGEDAStore.dispatch('getDependencias');

        return {
            refreshData,
            otherFilters,
            showModalVS,
            valeSalidaSelected,
            PendientesVS,
            countPendientesMovimientos,
            refreshDataVSA,
            filterVSA,
            otherFiltersVSA,
            showModalVSA,
            valeSalidaVSA,
        };
    },
    methods: {
        accion(accion: AccionData) {
            const actions: actionsType = {
                AsingaVS: () => this.showModalVSM(accion),
                closeModal: () => {
                    this.showModalVS = false;
                    this.showModalVSA = false;
                },
                'refresh-table': () => (this.refreshData = !this.refreshData),
                VerDetalleAsignacionValeSalida: () => this.VerDetalleAsignacionValeSalida(accion.item),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        showModalVSM(accion: AccionData) {
            this.showModalVS = true;
            this.valeSalidaSelected = accion.item;
        },
        otherFilterss(tipocodigo: number) {
            this.otherFilters = `id_tipocodigo = ${tipocodigo}`;
            this.refreshData = !this.refreshData;
        },
        VerDetalleAsignacionValeSalida(item: { id_vale_salida: number }) {
            this.valeSalidaVSA = Number(item.id_vale_salida);
            this.showModalVSA = true;
        },
    },
    template: html`
        <div class="col col-md-12">
            <div class="card card-info card-outline card-outline-tabs">
                <div class="card-header p-0 border-bottom-0">
                    <ul id="custom-tabs-four-tab" class="nav nav-tabs" role="tablist">
                        <li class="nav-item">
                            <a
                                id="custom-tabs-pendienteVS-tab"
                                class="nav-link active"
                                @click="refreshData = !refreshData"
                                aria-controls="pendienteVS-tab"
                                aria-selected="true"
                                data-toggle="pill"
                                href="#pendienteVS"
                                role="tab">
                                Pendiente VS ( {{PendientesVS}} )
                            </a>
                        </li>
                        <li class="nav-item">
                            <a
                                id="custom-tabs-valeAsignado-tab"
                                class="nav-link"
                                @click=""
                                aria-controls="valeAsignado-tab"
                                aria-selected="false"
                                data-toggle="pill"
                                href="#valeAsignado"
                                role="tab">
                                Vales de Salida Asignados
                            </a>
                        </li>
                    </ul>
                </div>
                <div class="card-body">
                    <div id="custom-tabs-four-tabContent" class="tab-content">
                        <div
                            id="pendienteVS"
                            class="tab-pane fade active show table-responsive"
                            aria-labelledby="pendienteVS-tab"
                            role="tabpanel">
                            <customTable
                                id="valesSalida"
                                :externalFilters="otherFilters"
                                :refresh="refreshData"
                                @accion="accion"
                                key="valesSalida"
                                titleTable="Vales Pendientes por Asignar"
                                url="/api/getValesSalidaSAsiciosarPaginate"
                                v-model="PendientesVS" />

                            <showModalValeSalida :showModal="showModalVS" :vale="valeSalidaSelected" @accion="accion" />
                        </div>
                        <div
                            id="valeAsignado"
                            class="tab-pane fade "
                            aria-labelledby="valeAsignado-tab"
                            role="tabpanel">
                            <customTable
                                id="valesSalidaAsignados"
                                :externalFilters="otherFiltersVSA"
                                :refresh="refreshDataVSA"
                                @accion="accion"
                                key="valesSalidaAsignados"
                                titleTable="Vales de Salida Asignados"
                                url="/api/GEDA/getValesSalidasAsingados">
                                <template v-slot:headerButtons>
                                    <div class="flex items-end gap-x-1 m-0 p-0">
                                        <div class="form-group m-0">
                                            <span for="dateStart">Desde</span>
                                            <input
                                                id="dateStart"
                                                type="date"
                                                class="form-control"
                                                v-model="filterVSA.desde" />
                                        </div>
                                        <div class="form-group m-0">
                                            <span for="dateEnd">Hasta</span>
                                            <input
                                                id="dateEnd"
                                                type="date"
                                                class="form-control"
                                                v-model="filterVSA.hasta" />
                                        </div>
                                        <div class="form-group m-0">
                                            <button class="btn btn-primary" @click="refreshDataVSA = !refreshDataVSA">
                                                <i class="fas fa-search"></i>
                                            </button>
                                        </div>
                                    </div>
                                </template>
                            </customTable>

                            <viewASignacionValeSalida
                                :showModal="showModalVSA"
                                :vale="valeSalidaVSA"
                                @accion="accion" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});

const _ppalGEDA = new Vue({
    el: '#ppal',
    delimiters: ['${', '}'],
    components: { ppal, crumb },
});
