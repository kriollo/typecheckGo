import { versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import newModal from '@/jscontrollers/components/newModal';

const { defineComponent, computed, ref, watch } = Vue;

export default defineComponent({
    name: 'viewDetalleMovimiento',
    components: { newModal },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
        token: {
            type: String,
            default: '',
        },
    },
    setup(props) {
        const showModalDetalleMovimiento = computed(() => props.showModal);
        const token = computed(() => props.token);
        const data = ref([]);

        const getDetalleMovimiento = async token => {
            if (token === '') {
                return;
            }

            const response = await versaFetch({
                method: 'GET',
                url: `/api/GEDA/getDetalleMovimiento?token=${token}`,
            });

            if (response.success === 1) {
                data.value = response.data;
            }
        };

        watch(
            showModalDetalleMovimiento,
            val => {
                if (val) {
                    getDetalleMovimiento(token.value);
                } else {
                    data.value = [];
                }
            },
            { immediate: true }
        );

        return {
            showModalDetalleMovimiento,
            data,
        };
    },
    methods: {
        accion(accion) {
            const actions = {
                closeModal: () => this.$emit('accion', accion),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
    },
    template: html`
        <newModal
            :showModal="showModalDetalleMovimiento"
            @accion="accion"
            idModal="detalleMovimiento"
            key="detalleMovimiento"
            size="max-w-7xl">
            <template v-slot:title>Detalle Movimiento</template>
            <template v-slot:body>
                <div class="col col-md-12 table-responsive">
                    <table class="table table-bordered table-striped">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Código Activo</th>
                                <th>Código SAP</th>
                                <th>Descripción</th>
                                <th>Campus</th>
                                <th>Edificio</th>
                                <th>Piso</th>
                                <th>Dependencia</th>
                                <th>Propiedad</th>
                                <th>Categoría</th>
                                <th>Fecha de Revisión</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in data.detalle">
                                <td>{{ item.codigo }}</td>
                                <td>{{ item.codigo_activo }}</td>
                                <td>{{ item.cod_sap }}</td>
                                <td>{{ item.desc_codigo }}</td>
                                <td>{{ item.desc_campus }}</td>
                                <td>{{ item.desc_edificio }}</td>
                                <td>{{ item.desc_piso }}</td>
                                <td>{{ item.desc_dependencia }}</td>
                                <td>{{ item.propiedad }}</td>
                                <td>{{ item.categoria }}</td>
                                <td>{{ item.fecha_revision }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-secondary" @click="accion({ accion: 'closeModal' })">
                    Cerrar
                </button>
            </template>
        </newModal>
    `,
});
