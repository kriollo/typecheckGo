import { type Proyecto, ShowModalFormInjection } from '@/jscontrollers/docproveedor/gestionaProyectos/InjectKeys';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import customTable from '@/jscontrollers/components/customTable';
import type { AccionData, actionsType } from 'versaTypes';
/* eslint-disable */
const ct = customTable;
/* eslint-enable */

const { defineComponent, toRefs } = Vue;

export default defineComponent({
    name: 'enProceso',
    props: {
        showTable: {
            type: String,
        },
    },
    setup(props) {
        const { showTable } = toRefs(props);

        const injectShowModalForm = ShowModalFormInjection.inject();
        const verGastos = async (item: Proyecto) => {
            // http://udd/registragasto/proyectos_vs_GASTOS/params?consulta=proyectos&codigoproyecto=250001&anno=2025
            window.open(
                `/registragasto/proyectos_vs_GASTOS/params?consulta=proyectos&codigoproyecto=${item.codigoproyecto}&anno=${item.anno}`,
                '_blank'
            );
        };

        const verProvision = async (item: Proyecto) => {
            // http://udd/registragasto/proyectos_vs_PROVISION/params?consulta=proyectos&codigoproyecto=250001&anno=2025
            window.open(
                `/registragasto/proyectos_vs_PROVISION/params?consulta=proyectos&codigoproyecto=${item.codigoproyecto}&anno=${item.anno}`,
                '_blank'
            );
        };

        const accion = (data: AccionData) => {
            console.log(data);
            const actions: actionsType = {
                VerGastos: () => verGastos(data.item),
                VerProvisiones: () => verProvision(data.item),
            };
            const fn = actions[data.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        return { injectShowModalForm, showTable, accion };
    },
    template: html`
        <div
            class="tab-pane fade"
            :class="{ show: showTable === 'enProceso', active: showTable === 'enProceso' }"
            id="en_proceso"
            role="tabpanel"
            aria-labelledby="custom-tabs-en_proceso-tab">
            <customTable
                @accion="accion"
                v-if="showTable === 'enProceso'"
                id="tblPendientes"
                titleTable="Proyectos activados y listos para utilizar"
                url="/api/proyectosBySolicitante"
                externalFilters="pp.estado_aprobacion=2"
                :refresh="injectShowModalForm.refreshTable"
                fieldOrder="codigoproyecto" />
        </div>
    `,
});
