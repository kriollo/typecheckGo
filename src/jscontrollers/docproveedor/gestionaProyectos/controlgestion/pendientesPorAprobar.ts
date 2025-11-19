import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { defineComponent, toRefs, ref } = Vue;

import customTable from '@/jscontrollers/components/customTable';
import { $dom, changeButtonSpinner } from '@/jscontrollers/composables/dom-selector';
import { show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import type { Proyecto } from '@/jscontrollers/docproveedor/gestionaProyectos/InjectKeys';
import { AccionData, actionsType } from 'versaTypes';
/* eslint-disable */
const ct = customTable;
/* eslint-enable  */

export default defineComponent({
    name: 'PendientesPorAprobar',
    props: {
        showTable: {
            type: String,
        },
    },
    setup(props) {
        const { showTable } = toRefs(props);
        const refresh = ref(false);

        const aprobarProyecto = async (codigoProyecto: string, anno: string) => {
            let buttonOriginalBkp = '';
            const buttonTable = $dom(`#codigoproyecto_${codigoProyecto}_AprobarProyecto`);
            if (buttonTable) {
                buttonOriginalBkp = buttonTable.innerHTML;
                changeButtonSpinner(`codigoproyecto_${codigoProyecto}_AprobarProyecto`, true, buttonOriginalBkp);
            }
            const result = await Swal.fire({
                title: '¿Está seguro de aprobar el proyecto?',
                text: 'Esta acción no se puede deshacer',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, aprobar',
                cancelButtonText: 'Cancelar',
                input: 'select',
                inputOptions: {
                    Gasto: 'Gasto',
                    Inversión: 'Inversión',
                },
                inputPlaceholder: 'Selecciona el tipo de proyecto',
                inputValidator: value => (!value ? 'Debe seleccionar un tipo de proyecto' : undefined),
            });

            if (result.isConfirmed) {
                const response = await versaFetch({
                    url: '/api/proyectos/aprobarProyecto',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ codigoproyecto: codigoProyecto, anno, tipo: result.value }),
                });
                if (response.success === 1) {
                    changeButtonSpinner(`codigoproyecto_${codigoProyecto}_AprobarProyecto`, false, buttonOriginalBkp);
                    show_toast(response.title, response.message, 'Success', 'success');
                    refresh.value = !refresh.value;
                    return;
                }
                show_toast(response.title, response.message, 'Alerta', 'warning');
            }
            changeButtonSpinner(`codigoproyecto_${codigoProyecto}_AprobarProyecto`, false, buttonOriginalBkp);
        };
        const rechazarProyecto = async (codigoProyecto: string, anno: string) => {
            const buttonTable = $dom(`#codigoproyecto_${codigoProyecto}_RechazarProyecto`);
            let buttonOriginalBkp = '';
            if (buttonTable) {
                buttonOriginalBkp = buttonTable.innerHTML;
                changeButtonSpinner(`codigoproyecto_${codigoProyecto}_RechazarProyecto`, true, buttonOriginalBkp);
            }
            const { value: motivo_rechazo } = await Swal.fire({
                title: 'Motivo del rechazo',
                input: 'textarea',
                inputPlaceholder: 'Escribe el motivo del rechazo aquí...',
                inputAttributes: {
                    color: 'white',
                    'aria-label': 'Escribe el motivo del rechazo aquí',
                },
                showCancelButton: true,
            });
            if (motivo_rechazo) {
                const response = await versaFetch({
                    url: '/api/proyectos/rechazarProyecto',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ codigoproyecto: codigoProyecto, motivo_rechazo, anno }),
                });
                if (response.success === 1) {
                    changeButtonSpinner(`codigoproyecto_${codigoProyecto}_RechazarProyecto`, false, buttonOriginalBkp);
                    show_toast(response.title, response.message, 'Success', 'success');
                    refresh.value = !refresh.value;
                    return;
                }
                show_toast(response.title, response.message, 'Alerta', 'warning');
            }
            changeButtonSpinner(`codigoproyecto_${codigoProyecto}_RechazarProyecto`, false, buttonOriginalBkp);
        };

        const VerDetallesProyecto = (proyecto: Proyecto) => {
            Swal.fire({
                title: `Detalles del Proyecto ${proyecto.codigoproyecto}`,
                html: html`
                    <div class="text-left">
                        <p class="mb-2">
                            <strong>Descripción:</strong>
                            <span style="white-space: pre-wrap;">${proyecto.descripcion}</span>
                        </p>
                        <p class="mb-2">
                            <strong>Observación:</strong>
                            <span style="white-space: pre-wrap;">${proyecto.observacion}</span>
                        </p>
                    </div>
                `,
                width: '80%',
                confirmButtonText: 'Cerrar',
            });
        };

        const accion = (accion: AccionData) => {
            const actions: actionsType = {
                AprobarProyecto: () => aprobarProyecto(accion.item.codigoproyecto, accion.item.anno),
                RechazarProyecto: () => rechazarProyecto(accion.item.codigoproyecto, accion.item.anno),
                VerDetallesProyecto: () => VerDetallesProyecto(accion.item),
            };
            const fn = actions[accion.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        return { showTable, refresh, accion };
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
                url="/api/proyectosByCGestionPendientes"
                externalFilters="pp.estado_aprobacion=1"
                :refresh="refresh"
                fieldOrder="codigoproyecto"
                @accion="accion" />
        </div>
    `,
});
