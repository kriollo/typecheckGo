import newModal from '@/jscontrollers/components/newModal';
import { useGEDAStore } from '@/jscontrollers/stores/dependencias';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { defineComponent, ref, watch, computed } = Vue;

export default defineComponent({
    name: 'modalEditLine',
    components: { newModal },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
        item: {
            type: Object,
            required: true,
        },
        dataLength: {
            type: Number,
            required: true,
        },
        lastDependenciaSelected: {
            type: Object,
            required: false,
        },
    },
    setup(props) {
        const showModal = computed(() => props.showModal);
        const itemSel = computed(() => props.item);
        const dataLength = computed(() => props.dataLength);
        const lastDependenciaSelected = computed(() => props.lastDependenciaSelected);
        const dependencias = computed(() => useGEDAStore.state.dependencias);

        const itemForm = ref({});

        watch(itemSel, val => {
            itemForm.value = JSON.parse(JSON.stringify(val));
            if (lastDependenciaSelected.value !== undefined) {
                itemForm.value.cod_dependencia = lastDependenciaSelected.value.cod_dependencia;
                itemForm.value.desc_dependencia = lastDependenciaSelected.value.desc_dependencia;
            }
        });

        const optionsPropiedad = [
            { id: 'propio', value: 'propio', label: 'Propio' },
            { id: 'arriendo', value: 'arriendo', label: 'Arriendo' },
            { id: 'externo', value: 'externo', label: 'Externo' },
            { id: 'comodato', value: 'comodato', label: 'Comodato' },
        ];

        return {
            showModal,
            itemForm,
            dataLength,
            dependencias,
            optionsPropiedad,
        };
    },
    methods: {
        accion(accion) {
            const actions = {
                closeModal: () => this.$emit('accion', { accion: 'closeModalEditline' }),
                default: () => {
                    this.$emit('accion', accion);
                },
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
    },
    template: html`
        <newModal
            :draggable.bool="true"
            :escClose.bool="true"
            :showModal="showModal"
            @accion="accion"
            idModal="modalEditLine"
            key="modalEditLine"
            sizeModal="modal-lg">
            <template v-slot:title>
                Editar Material
                <button
                    class="btn btn-primary"
                    :disabled="itemForm.id === 0"
                    @click="accion({
                        'accion': 'up',
                        form: itemForm
                    })">
                    <i class="fas fa-arrow-alt-circle-up"></i>
                </button>
                <button
                    class="btn btn-primary"
                    :disabled="itemForm.id === dataLength"
                    @click="accion({
                        'accion': 'down',
                        form: itemForm
                    })">
                    <i class="fas fa-arrow-alt-circle-down"></i>
                </button>
            </template>

            <template v-slot:body>
                <div class="col col-md-12">
                    <div class="row">
                        <input type="hidden" v-model="itemForm.id" />
                        <div class="form-group col-4">
                            <label for="codigo">Código</label>
                            <input id="codigo" type="text" class="form-control" readonly v-model="itemForm.codigo" />
                        </div>
                        <div class="form-group col-8">
                            <label for="desc_codigo">Descripción</label>
                            <input
                                id="desc_codigo"
                                type="text"
                                class="form-control"
                                readonly
                                v-model="itemForm.desc_codigo" />
                        </div>
                    </div>
                    <div class="row">
                        <div class="form-group">
                            <label for="codigo_activo">Código Activo</label>
                            <input
                                id="codigo_activo"
                                type="text"
                                class="form-control"
                                readonly
                                v-model="itemForm.codigo_activo" />
                        </div>
                    </div>
                    <div class="row">
                        <div class="form-group col-6">
                            <label for="modalEditLine_categoria">Nro. Serie / Info Adicional</label>
                            <input id="modalEditLine_serie" type="text" class="form-control" v-model="itemForm.serie" />
                        </div>
                        <div class="form-group col-6">
                            <label for="modalEditLine_cod_sap">Código SAP</label>
                            <input
                                id="modalEditLine_cod_sap"
                                type="text"
                                class="form-control"
                                v-model="itemForm.cod_sap" />
                        </div>
                        <div class="col-md-4">
                            <div class="form-group">
                                <label for="modalEditLine_consumo_electrico">Consumo Eléctrico (W)</label>
                                <input
                                    id="modalEditLine_consumo_electrico"
                                    type="number"
                                    class="form-control"
                                    v-model="itemForm.consumo_electrico" />
                            </div>
                        </div>
                        <div class="form-group col-4">
                            <label for="modalEditLine_categoria">Cátegoria</label>
                            <select id="modalEditLine_categoria" class="form-control" v-model="itemForm.categoria">
                                <option>Normal</option>
                                <option>HyFlex</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <div class="form-group">
                                <label for="modalEditLine_fecha_revision">Fecha de Revisión</label>
                                <input
                                    id="modalEditLine_fecha_revision"
                                    type="date"
                                    class="form-control"
                                    v-model="itemForm.fecha_revision" />
                            </div>
                        </div>

                        <div class="col-4">
                            <iRadio
                                :options="optionsPropiedad"
                                :horizontalList="true"
                                iClass="icheck-primary"
                                key="propiedad"
                                label="Propiedad"
                                v-model="itemForm.propiedad" />
                        </div>
                        <div class="form-group col-12">
                            <inputDataList
                                id="modalEditLine_dependencia"
                                :fieldsReturn="{ idField:'codigo', descripcionField:'desc_dependencia'}"
                                :list="dependencias"
                                :msgItem="['desc_campus','desc_edificio','desc_piso','desc_dependencia']"
                                :value="{ idField:itemForm.cod_dependencia, descripcionField: itemForm.desc_dependencia}"
                                @changeDataList="itemForm.cod_dependencia = $event.idField;itemForm.desc_dependencia=$event.descripcionField"
                                itemValueOption="codigo"
                                key="dependencia"
                                label="Dependencia" />
                        </div>
                    </div>
                </div>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-secondary" @click="accion({ accion: 'closeModal' })">
                    Cerrar
                </button>
                <button
                    type="button"
                    class="btn btn-success"
                    @click="accion({ accion: 'saveCloseEdit', form: itemForm })">
                    Guardar
                </button>
            </template>
        </newModal>
    `,
});
