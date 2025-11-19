import { ShowModalFormInjection } from '@/jscontrollers/docproveedor/gestionaProyectos/InjectKeys';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import customTable from '@/jscontrollers/components/customTable';
import { $dom, changeButtonSpinner } from '@/jscontrollers/composables/dom-selector';
import { versaFetch } from '@/jscontrollers/composables/utils';
import { AccionData, actionsType } from 'versaTypes';
/* eslint-disable */
const ct = customTable;
/* eslint-enable */

const { defineComponent, toRefs } = Vue;

export default defineComponent({
    name: 'pendientes',
    props: {
        showTable: {
            type: String,
        },
    },
    setup(props, { emit }) {
        const { showTable } = toRefs(props);
        const injectShowModalForm = ShowModalFormInjection.inject();

        const sendReminder = async (proyecto: string, anno: string) => {
            const buttonReminder = $dom(`#codigoproyecto_${proyecto}_sendReminder`);
            let buttonOriginalBkp = '';
            // guardar el botón original, mostrar un loader y deshabilitar el botón
            if (buttonReminder) {
                buttonOriginalBkp = buttonReminder ? buttonReminder.innerHTML : '';
                changeButtonSpinner(`codigoproyecto_${proyecto}_sendReminder`, true, buttonOriginalBkp);
            }

            try {
                // simulamos la llamada/espera al servidor
                const response = await versaFetch({
                    url: '/api/proyectos/sendReminderCGestion',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ proyecto, anno }),
                });
                if (response.success === 0) {
                    throw new Error(response.message || 'Error al enviar el recordatorio');
                }
            } finally {
                // restaurar estado del botón incluso si ocurre un error
                if (buttonReminder && buttonOriginalBkp) {
                    changeButtonSpinner(`codigoproyecto_${proyecto}_sendReminder`, false, buttonOriginalBkp);
                }
            }
        };

        const accion = (accion: AccionData) => {
            const actions: actionsType = {
                EditarProyecto: () => {
                    injectShowModalForm.setProyecto(accion.item);
                    injectShowModalForm.setShowModal(true);
                },
                sendReminder: () => {
                    sendReminder(accion.item.codigoproyecto, accion.item.anno);
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
            :class="{ show: showTable === 'pendientes', active: showTable === 'pendientes' }"
            id="Por_Aprobar"
            role="tabpanel"
            aria-labelledby="Por_Aprobar-tab">
            <customTable
                v-if="showTable === 'pendientes'"
                id="tblPendientes"
                titleTable="Solicitudes Pendientes de Aprobación"
                url="/api/proyectosBySolicitante"
                externalFilters="pp.estado_aprobacion=1"
                :refresh="injectShowModalForm.refreshTable"
                fieldOrder="codigoproyecto"
                @accion="accion" />
        </div>
    `,
});
