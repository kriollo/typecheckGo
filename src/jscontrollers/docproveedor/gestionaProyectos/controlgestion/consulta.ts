import { useXlsx } from '@/jscontrollers/composables/useXlsx';
import { show_toast } from '@/jscontrollers/composables/utils';
import {
    changeEstadoProyecto,
    getHistorialProyecto,
    getStatusProyectos,
} from '@/jscontrollers/docproveedor/gestionaProyectos/fetchProyects';
import type { Proyecto } from '@/jscontrollers/docproveedor/gestionaProyectos/InjectKeys';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
import type { AccionData, actionsType } from 'versaTypes';

const { defineComponent, toRefs, ref, watchEffect, onMounted } = Vue;

export default defineComponent({
    name: 'consulta',
    props: {
        showTable: {
            type: String,
        },
    },
    setup(props) {
        const { showTable } = toRefs(props);
        const annio = ref(new Date().getFullYear());
        const estado = ref(9);

        const estados = ref([]);

        const filterExterno = ref('');
        const refresh = ref(false);

        watchEffect(() => {
            filterExterno.value = `anno=${annio.value}`;
            if (estado.value === 9) {
                return;
            }

            const estadoSelected = estados.value.find(e => e.id === estado.value);

            filterExterno.value += `&estado_aprobacion=${estadoSelected?.estado_aprobacion}&estado=${estadoSelected?.estado}`;
        });

        onMounted(async () => {
            const response = await getStatusProyectos();
            estados.value = response;
        });

        const formatComentario = (comentario: string) => {
            return comentario.replace(/\n/g, '<br>');
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

        const DescargarPresupuesto = async (path: string) => {
            window.open(path, '_blank');
        };

        const cerrarProyecto = async (item: Proyecto) => {
            const result = await Swal.fire({
                title: '¿Está seguro de cerrar el proyecto?',
                text: 'Ya no se podrán realizar más modificaciones.',
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
        const abrirProyecto = async (item: Proyecto) => {
            const result = await Swal.fire({
                title: '¿Está seguro de reabrir el proyecto?',
                text: 'Se podrá realizar modificaciones o asociar nuevamente.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, reabrir proyecto!',
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
            const actions: actionsType = {
                VerHistorial: () => getHistorialProyectoLocal(data.item.codigoproyecto),
                DescargarPresupuesto: () => DescargarPresupuesto(data.item.path),
                CerrarProyecto: () => cerrarProyecto(data.item),
                AbrirProyecto: () => abrirProyecto(data.item),
                VerGastos: () => verGastos(data.item),
                VerProvisiones: () => verProvision(data.item),
            };
            const fn = actions[data.accion];
            if (fn instanceof Function) {
                fn();
            }
        };

        return { showTable, annio, estado, filterExterno, refresh, estados, accion };
    },
    template: html`
        <div
            class="tab-pane fade"
            :class="{ show: showTable === 'consulta', active: showTable === 'consulta' }"
            id="Consulta"
            role="tabpanel"
            aria-labelledby="Consulta-tab">
            <div class="flex" v-if="showTable === 'consulta'">
                <div class="col-md-4 mb-3">
                    <label for="anio" class="form-label">Año</label>
                    <input type="number" class="form-control" id="anio" placeholder="Ingrese el año" v-model="annio" />
                </div>
                <div class="col-md-6 mb-3">
                    <label for="estado" class="form-label">Estado</label>
                    <select id="estado" class="form-control" v-model="estado">
                        <option value="9">Todos</option>
                        <option v-for="item in estados" :key="item.id" :value="item.id">{{ item.descripcion }}</option>
                    </select>
                </div>
                <div class="col-md-2 mb-3 d-flex align-items-end">
                    <button class="btn btn-primary w-100" @click="refresh = !refresh">
                        <i class="bi bi-funnel me-2"></i>
                        Filtrar
                    </button>
                </div>
            </div>
            <div class="table-responsive" v-if="showTable === 'consulta'">
                <customTable
                    id="tblPendientes"
                    titleTable="Detalle de consulta de proyectos"
                    url="/api/proyectos/getProyectosConsultaGeneralCGestion"
                    :externalFilters="filterExterno"
                    :refresh="refresh"
                    fieldOrder="codigoproyecto"
                    @accion="accion" />
            </div>
        </div>
    `,
});
