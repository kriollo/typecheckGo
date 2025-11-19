import newModal from '@/jscontrollers/components/newModal';
import { versaAlert } from '@/jscontrollers/composables/utils';
import { fetchGetDetalleAsignacionValeSalida, generateFileBarCode } from '@/jscontrollers/geda/fechGeda';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { defineComponent, ref, computed, watch } = Vue;

export default defineComponent({
    name: 'viewASignacionValeSalida',
    components: { newModal },
    emits: ['accion'],
    props: {
        vale: {
            type: Number,
            required: true,
        },
        showModal: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const id_vale = computed(() => props.vale);
        const data = ref([]);
        const showModal = computed(() => props.showModal);

        const getDetalle = async () => {
            const response = await fetchGetDetalleAsignacionValeSalida(
                '/api/GEDA/getDetalleAsignacionValeSalida',
                id_vale.value
            );
            if (response.success === 1) {
                data.value = response.data;
            }
        };

        watch(showModal, () => {
            getDetalle();
        });

        return {
            id_vale,
            data,
        };
    },
    methods: {
        accion(accion) {
            this.$emit('accion', accion);
        },

        async generarFileBarCode() {
            const code = await generateFileBarCode(this.data);
            if (code === '') {
                versaAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'No se encontraron registros para generar el archivo o existen registros incompletos',
                });
                return;
            }
            //descargar archivo
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `file${this.id_vale}PrintCode.zpl`;
            a.click();

            //eliminar url de objeto y  elemento a
            URL.revokeObjectURL(url);
            a.remove();
        },
    },
    template: html`
        <newModal
            :escClose.bool="true"
            :showModal="showModal"
            @accion="accion"
            idModal="viewASignacionValeSalida"
            key="viewASignacionValeSalida"
            size="max-w-7xl">
            <template v-slot:title>Detalle de Asignación Vale de Salida Nº {{ id_vale }}</template>
            <template v-slot:body>
                <div class="col col-md-12">
                    <table class="table table-bordered table-striped table-responsive">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Descripción</th>
                                <th>Código Activo</th>
                                <th>Código SAP</th>
                                <th>Cátegoria</th>
                                <th>Propiedad</th>
                                <th>Fecha de Revisión</th>
                                <th>Consumo Eléctrico (W)</th>
                                <th>Campus</th>
                                <th>Edificio</th>
                                <th>Dependencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in data">
                                <td>{{ item.codigo }}</td>
                                <td>{{ item.desc_codigo }}</td>
                                <td>{{ item.codigo_activo }}</td>
                                <td>{{ item.cod_sap }}</td>
                                <td>{{ item.categoria }}</td>
                                <td>{{ item.propiedad }}</td>
                                <td>{{ item.fecha_revision }}</td>
                                <td>{{ item.consumo_electrico }}</td>
                                <td>{{ item.desc_campus }}</td>
                                <td>{{ item.desc_edificio }}</td>
                                <td>{{ item.desc_dependencia }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>
            <template v-slot:footer>
                <div class="flex justify-between">
                    <button type="button" class="btn btn-secondary" @click="accion({ accion: 'closeModal' })">
                        Cerrar
                    </button>
                    <button type="button" class="btn btn-primary" @click="generarFileBarCode">
                        <i class="bi bi-printer"></i>
                        Imprimir Codigos de Barras
                    </button>
                </div>
            </template>
        </newModal>
    `,
});
