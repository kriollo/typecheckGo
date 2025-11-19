import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { defineComponent, toRefs, ref } = Vue;

import customTable from '@/jscontrollers/components/customTable';
import { useXlsx } from '@/jscontrollers/composables/useXlsx';
import { show_toast } from '@/jscontrollers/composables/utils';
import {
    changeEstadoProyecto,
    getHistorialProyecto,
} from '@/jscontrollers/docproveedor/gestionaProyectos/fetchProyects';
import { ShowModalFormInjection, type Proyecto } from '@/jscontrollers/docproveedor/gestionaProyectos/InjectKeys';
import type { AccionData, actionsType } from 'versaTypes';
/* eslint-disable */
const ct = customTable;
/* eslint-enable  */

export default defineComponent({
    name: 'enEjecucion',
    props: {
        showTable: {
            type: String,
        },
    },
    setup(props) {
        const { showTable } = toRefs(props);
        const refresh = ref(false);
        const injectShowModalForm = ShowModalFormInjection.inject();

        const formatComentario = (comentario: string) => {
            return comentario.replace(/\n/g, '<br>');
        };

        const cerrarProyecto = async (item: Proyecto) => {
            const result = await Swal.fire({
                title: '¿Está seguro de cerrar el proyecto?',
                text: 'Esta acción no se puede deshacer',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, cerrar proyecto!',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const response = await changeEstadoProyecto(item, 2);
                if (response.success === 1) {
                    show_toast(response.title, response.message, 'Success', 'success');
                    refresh.value = !refresh.value;
                    return;
                }
                show_toast(response.title, response.message, 'Error', 'error');
            }
        };
        const ActivarProyecto = async (item: Proyecto) => {
            const result = await Swal.fire({
                title: '¿Está seguro de Activar el proyecto?',
                text: 'Haciendo esto el proyecto volverá a estar en ejecución',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, Activar proyecto!',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const response = await changeEstadoProyecto(item, 1);
                if (response.success === 1) {
                    show_toast(response.title, response.message, 'Success', 'success');
                    refresh.value = !refresh.value;
                    return;
                }
                show_toast(response.title, response.message, 'Error', 'error');
            }
        };
        const PausarProyecto = async (item: Proyecto) => {
            const result = await Swal.fire({
                title: '¿Está seguro de pausar el proyecto?',
                text: 'Haciendo esto el proyecto quedará en pausa y no se podrán registrar más SOC asociadas a este.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, pausar proyecto!',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const response = await changeEstadoProyecto(item, 0);
                if (response.success === 1) {
                    show_toast(response.title, response.message, 'Success', 'success');
                    refresh.value = !refresh.value;
                    return;
                }
                show_toast(response.title, response.message, 'Error', 'error');
            }
        };
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

        const DescargarPresupuesto = async (path: string) => {
            window.open(path, '_blank');
        };
        const getHistorialProyectoLocal = async (codigoproyecto: number) => {
            const response = await getHistorialProyecto(codigoproyecto);
            const htmlResponse = html`
                <div class="d-flex justify-center mb-2">
                    <button type="button" class="btn btn-secondary btn-sm" id="exportButtonHistorial">
                        <i class="bi bi-file-earmark-excel"></i>
                        Export Excel
                    </button>
                </div>
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Usuario</th>
                            <th>Acción</th>
                            <th>Comentario</th>
                            <th>Motivo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response
                            .map(
                                item => html`
                                    <tr>
                                        <td>${item.fecha}</td>
                                        <td>${item.nombre_usuario}</td>
                                        <td>${item.accion}</td>
                                        <td class="">${formatComentario(item.detalle)}</td>
                                        <td>${item.motivo}</td>
                                    </tr>
                                `
                            )
                            .join('')}
                    </tbody>
                </table>
            `;

            await Swal.fire({
                title: 'Historial de Modificaciones del Proyecto N° ' + codigoproyecto,
                html: `<div style="max-height: 400px; overflow-y: auto;">${htmlResponse}</div>`,
                width: '80%',
                confirmButtonText: 'Cerrar',
                didOpen: () => {
                    document.getElementById('exportButtonHistorial')?.addEventListener('click', () => {
                        const { exportToExcel } = useXlsx();
                        exportToExcel(response, `Historial Proyecto ${codigoproyecto}`);
                    });
                },
            });
        };

        const accion = (accion: AccionData) => {
            const actions: actionsType = {
                CerrarProyecto: () => cerrarProyecto(accion.item),
                ActivarProyecto: () => ActivarProyecto(accion.item),
                EditProyecto: () => {
                    injectShowModalForm.setProyecto(accion.item);
                    injectShowModalForm.setShowModal(true);
                },
                PausarProyecto: () => PausarProyecto(accion.item),
                DescargarPresupuesto: () => DescargarPresupuesto(accion.item.path),
                VerHistorial: () => getHistorialProyectoLocal(accion.item.codigoproyecto as number),
                VerGastos: () => verGastos(accion.item),
                VerProvisiones: () => verProvision(accion.item),
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
            :class="{ show: showTable === 'enProceso', active: showTable === 'enProceso' }"
            id="en_proceso"
            role="tabpanel"
            aria-labelledby="en_proceso-tab">
            <customTable
                v-if="showTable === 'enProceso'"
                id="tblenProceso"
                titleTable="Solicitudes en Ejecución"
                url="/api/proyectosByCGestionPendientes"
                externalFilters="pp.estado_aprobacion=2"
                :refresh="refresh"
                fieldOrder="codigoproyecto"
                @accion="accion" />
        </div>
    `,
});
