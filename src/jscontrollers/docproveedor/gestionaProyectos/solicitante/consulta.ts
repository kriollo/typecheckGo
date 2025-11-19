import { getStatusProyectos } from '@/jscontrollers/docproveedor/gestionaProyectos/fetchProyects';
import type { Proyecto } from '@/jscontrollers/docproveedor/gestionaProyectos/InjectKeys';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
import { AccionData, actionsType } from 'versaTypes';

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
                    @accion="accion"
                    id="tblPendientes"
                    titleTable="Detalle de consulta de proyectos"
                    url="/api/proyectos/getProyectosConsultaGeneralSolicitante"
                    :externalFilters="filterExterno"
                    :refresh="refresh"
                    fieldOrder="codigoproyecto"></customTable>
            </div>
        </div>
    `,
});
