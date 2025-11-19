import inputDataList from '@/jscontrollers/components/inputDataList';
import inputDataListMobile from '@/jscontrollers/components/inputDataListMobile';
import newModal from '@/jscontrollers/components/newModal';

import { $dom, blockedForm, validateFormRequired } from '@/jscontrollers/composables/dom-selector';
import {
    fecthCampus,
    fetchGetAreas,
    fetchGetCGestion,
    fetchUsuarioSolicitante,
} from '@/jscontrollers/composables/fetching';
import { GetUniquedArrayObject, show_toast } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import type { SalidaExpressItem } from '@/jscontrollers/bodega/masters/salida_express';
import type { AccionData, actionsType, VersaFetchResponse } from 'versaTypes';
import type { Ref } from 'vue';

/* eslint-disable */
const idl = inputDataList;
/* eslint-enable */

const { ref, computed, watch, onMounted, defineComponent } = Vue;
export default defineComponent({
    name: 'form-entrada',
    components: {
        inputDataListMobile,
        newModal,
    },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
        PropsformData: {
            type: Object as () => SalidaExpressItem | null,
            required: true,
        },
        disabledAll: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, { emit }) {
        const PropsformData = computed(() => props.PropsformData) as Ref<SalidaExpressItem>;
        const showModal = computed(() => props.showModal) as Ref<boolean>;

        const formData = ref({}) as Ref<SalidaExpressItem>;

        watch(
            () => PropsformData.value,
            newValue => {
                formData.value = { ...newValue };
            }
        );

        const campus = ref([]);
        const area = ref([]);
        const cgestion = ref([]);
        const solicitante = ref([]);

        onMounted(async () => {
            campus.value = [];
            solicitante.value = [];
            const campusData = await fecthCampus();
            if (typeof campusData !== 'boolean') {
                campus.value = campusData;
            }
            const solicitantes = (await fetchUsuarioSolicitante({
                estado: '1',
                filtro: 'solicitantes',
            })) as unknown as VersaFetchResponse[] | boolean;
            if (typeof solicitantes !== 'boolean') {
                solicitante.value = GetUniquedArrayObject('solicitantes', solicitantes);
            }
        });

        watch(
            () => formData.value.cod_campus,
            async newValue => {
                area.value = [];
                if (newValue === '') {
                    formData.value.cod_area = '';
                    formData.value.desc_area = '';
                    return;
                }
                const resultArea = (await fetchGetAreas(newValue)) as VersaFetchResponse | boolean;
                if (typeof resultArea !== 'boolean') {
                    area.value = resultArea;
                }
            }
        );

        watch(
            () => formData.value.cod_area,
            async newValue => {
                cgestion.value = [];
                if (newValue === '') {
                    formData.value.cod_centrogestion = '';
                    formData.value.desc_centrogestion = '';
                    return;
                }
                const resultCGestion = (await fetchGetCGestion(formData.value.cod_campus, newValue)) as
                    | VersaFetchResponse
                    | boolean;
                if (typeof resultCGestion !== 'boolean') {
                    cgestion.value = resultCGestion;
                }
            }
        );

        watch(
            () => formData.value.cod_centrogestion,
            async newValue => {
                if (newValue === '') {
                    formData.value.cod_centrogestion = '';
                    formData.value.desc_centrogestion = '';
                    return;
                }
            }
        );

        const saveItemValidate = () => {
            const $form = $dom('#formSalidaExpress');

            if (!($form instanceof HTMLFormElement)) {
                show_toast('Error', 'Form not found', 'error');
                return;
            }

            blockedForm($form, 'true');

            if (!validateFormRequired($form)) {
                show_toast('Error', 'Debe completar todos los campos requeridos', 'error');
                blockedForm($form, 'false');
                return;
            }
            emit('accion', { accion: 'save', item: formData });
            blockedForm($form, 'false');
        };
        const accion = (accion: AccionData) => {
            const actions: actionsType = {
                closeModal: () => {
                    emit('accion', { accion: 'closeModalItem' });
                },
            };
            const fn = actions[accion.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        return {
            formData,
            campus,
            area,
            cgestion,
            solicitante,
            showModal,
            accion,
            saveItemValidate,
        };
    },
    template: html`
        <newModal idModal="modalSalidaExpressItem" :showModal="showModal" @accion="accion">
            <template #title>Salida Express</template>
            <template #body>
                <form class="space-y-4 w-full" id="formSalidaExpress">
                    <div class="col col-md-12 p-4 rounded-lg shadow-md">
                        <div class="col col-md-12 col-xs-12 pb-4">
                            <label for="descripcion" class="block mb-1 font-bold text-sm">
                                descripcion
                                <span class="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                class="w-full p-3 rounded border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 text-left flex justify-between items-center"
                                id="descripcion"
                                placeholder="Descripción"
                                v-model="formData.descripcion"
                                required />
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="col col-md-12 col-xs-12">
                                <inputDataListMobile
                                    id="select_campus"
                                    label="Campus"
                                    key="campus"
                                    :fieldsReturn="{ idField: 'id', descripcionField: 'descripcion' }"
                                    :list="campus"
                                    :msgItem="['descripcion']"
                                    :value="{ idField: formData.cod_campus, descripcionField: formData.desc_campus }"
                                    @changeDataList="formData.cod_campus = $event.idField; formData.desc_campus = $event.descripcionField"
                                    itemValueOption="correo_jefatura"
                                    :required="true"
                                    nextFocus="#cod_area" />
                            </div>
                            <div class="col col-md-12 col-xs-12">
                                <inputDataListMobile
                                    id="cod_area"
                                    label="Área"
                                    key="area"
                                    :fieldsReturn="{ idField: 'codigo', descripcionField: 'descripcion' }"
                                    :list="area"
                                    :msgItem="['descripcion']"
                                    :value="{ idField: formData.cod_area, descripcionField: formData.desc_area }"
                                    @changeDataList="formData.cod_area = $event.idField; formData.desc_area = $event.descripcionField"
                                    itemValueOption="codigo"
                                    :required="true"
                                    nextFocus="#cod_centrogestion" />
                            </div>
                            <div class="col col-md-12 col-xs-12">
                                <inputDataListMobile
                                    id="cod_centrogestion"
                                    label="Código Gestión"
                                    key="cgestion"
                                    :fieldsReturn="{ idField: 'codigo', descripcionField: 'descripcion' }"
                                    :list="cgestion"
                                    :msgItem="['codigo','descripcion']"
                                    :value="{ idField: formData.cod_centrogestion, descripcionField: formData.desc_centrogestion }"
                                    @changeDataList="formData.cod_centrogestion = $event.idField; formData.desc_centrogestion = $event.descripcionField"
                                    itemValueOption="codigo"
                                    :required="true"
                                    nextFocus="#solicitante" />
                            </div>
                            <div class="col col-md-12 col-xs-12">
                                <inputDataListMobile
                                    key="solicitante"
                                    id="solicitante"
                                    label="Solicitante"
                                    :list="solicitante"
                                    :msgItem="['solicitantes']"
                                    itemValueOption="solicitantes"
                                    :fieldsReturn="{idField: 'solicitantes'}"
                                    :value="{idField: formData.solicitante, descripcionField: formData.solicitante}"
                                    @changeDataList="formData.solicitante = $event.idField"
                                    placeholder="Seleccione un solicitante"
                                    nextFocus="jefatura"
                                    required />
                            </div>
                        </div>
                    </div>
                </form>
            </template>
            <template #footer>
                <div class="d-flex justify-between">
                    <button class="btn btn-success" @click="saveItemValidate()">Guardar</button>
                    <button class="btn btn-secondary" @click="accion({'accion':'closeModal'})">Cancelar</button>
                </div>
            </template>
        </newModal>
    `,
});
