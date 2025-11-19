import { ShowModalFormInjection } from '@/jscontrollers/docproveedor/gestionaProyectos/InjectKeys';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import customTable from '@/jscontrollers/components/customTable';
import { AccionData, actionsType } from 'versaTypes';
/* eslint-disable */
const ct = customTable;
/* eslint-enable */

const { defineComponent, toRefs } = Vue;

export default defineComponent({
    name: 'rechazadas',
    props: {
        showTable: {
            type: String,
        },
    },
    setup(props, { emit }) {
        const { showTable } = toRefs(props);

        const injectShowModalForm = ShowModalFormInjection.inject();

        const accion = (accion: AccionData) => {
            const actions: actionsType = {
                EditarProyecto: () => {
                    injectShowModalForm.setProyecto(accion.item);
                    injectShowModalForm.setShowModal(true);
                },
                deleteProyecto: () => {
                    emit('accion', { ...accion });
                },
            };
            const fn = actions[accion.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        return { injectShowModalForm, showTable, accion };
    },
    template: html`
        <div
            class="tab-pane fade"
            :class="{ show: showTable === 'rechazadas', active: showTable === 'rechazadas' }"
            id="Rechazadas"
            role="tabpanel"
            aria-labelledby="custom-tabs-rechazadas-tab">
            <customTable
                v-if="showTable === 'rechazadas'"
                id="tblPendientes"
                titleTable="Solicitudes Rechazadas"
                url="/api/proyectosBySolicitante"
                externalFilters="pp.estado_aprobacion=3"
                :refresh="injectShowModalForm.refreshTable"
                fieldOrder="codigoproyecto"
                @accion="accion" />
        </div>
    `,
});
