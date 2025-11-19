import { $dom, blockedForm, validateFormRequired } from '@/jscontrollers/composables/dom-selector';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { defineComponent, watch, reactive, ref } = Vue;

import newModal from '@/jscontrollers/components/newModal';

import loader from '@/jscontrollers/components/loading';
import subirPresupuesto from '@/jscontrollers/docproveedor/gestionaProyectos/solicitante/subirPresupuesto';
import type { AccionData, actionsType } from 'versaTypes';

import { fecthCampus, fetchGetAreas, fetchGetCGestion } from '@/jscontrollers/composables/fetching';
import { versaAlert, versaFetch } from '@/jscontrollers/composables/utils';
import {
    CORRESPONDE_A,
    FileProyecto,
    newFileProyecto,
    newProyecto,
    type ProyectoReactive,
    ShowModalFormInjection,
} from '@/jscontrollers/docproveedor/gestionaProyectos/InjectKeys';

/* eslint-disable */
const l = loader;
/* eslint-enable */

export default defineComponent({
    name: 'formSolicitud',
    components: { subirPresupuesto, newModal },
    setup(_props, { emit }) {
        const array_campus = ref([]);
        const array_area = ref([]);
        const array_centrogestion = ref([]);
        const campusRef = ref(null);
        const areaRef = ref(null);
        const centrogestionRef = ref(null);
        const injectShowModalForm = ShowModalFormInjection.inject();
        const showLoader = ref(false);

        const localForm = reactive({ value: { ...newProyecto } }) as ProyectoReactive;

        interface responseGetFile extends FileProyecto {
            length: number;
        }

        const getFileProyecto = async (proyecto: number | string) => {
            if (proyecto === '' || proyecto === 0) return [];
            const response = (await versaFetch({
                url: `/api/proyectos/getFileByProyecto?codigoproyecto=${proyecto}`,
                method: 'GET',
            })) as unknown as responseGetFile;
            return response;
        };

        watch(
            () => injectShowModalForm.value,
            async newVal => {
                if (newVal) {
                    localForm.value = { ...injectShowModalForm.proyecto };
                    const response = (await getFileProyecto(localForm.value.codigoproyecto)) as unknown as FileProyecto;

                    if (response) {
                        injectShowModalForm.setFileProyecto(response);
                    }
                    array_campus.value = await fecthCampus();
                }
            }
        );
        const accion = (accion: AccionData) => {
            const action: actionsType = {
                closeModal: () => {
                    injectShowModalForm.setShowModal(false);
                    localForm.value = { ...newProyecto };
                    injectShowModalForm.setFileProyecto({ ...newFileProyecto });
                },
            };
            const fn = action[accion.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        const getCodList = async (listName: 'array_campus' | 'array_area' | 'array_centrogestion') => {
            switch (listName) {
                case 'array_campus': {
                    localForm.value.codigocampus = 0;
                    localForm.value.codigoarea = 0;
                    localForm.value.codigocentrogestion = 0;
                    localForm.value.desc_area = '';
                    localForm.value.desc_centrogestion = '';
                    areaRef.value.disabled = true;
                    centrogestionRef.value.disabled = true;
                    const campus = campusRef.value.value.trim().toLowerCase();
                    const index = array_campus.value.findIndex(
                        item => item.descripcion.trim().toLowerCase() === campus
                    );
                    if (index !== -1) {
                        localForm.value.codigocampus = array_campus.value[index].id;
                        areaRef.value.disabled = false;
                        areaRef.value.focus();
                        array_area.value = await fetchGetAreas(localForm.value.codigocampus);
                    }
                    break;
                }
                case 'array_area': {
                    localForm.value.codigoarea = 0;
                    localForm.value.codigocentrogestion = 0;
                    localForm.value.desc_centrogestion = '';
                    centrogestionRef.value.disabled = true;
                    const area = areaRef.value.value.trim().toLowerCase();
                    const index = array_area.value.findIndex(item => item.descripcion.trim().toLowerCase() === area);
                    if (index !== -1) {
                        localForm.value.codigoarea = array_area.value[index].codigo;
                        centrogestionRef.value.disabled = false;
                        centrogestionRef.value.focus();
                        array_centrogestion.value = await fetchGetCGestion(
                            localForm.value.codigocampus,
                            localForm.value.codigoarea
                        );
                    }
                    break;
                }
                case 'array_centrogestion': {
                    localForm.value.codigocentrogestion = 0;
                    const centrogestion = centrogestionRef.value.value.trim().toLowerCase();
                    const index = array_centrogestion.value.findIndex(
                        item => item.descripcion.trim().toLowerCase() === centrogestion
                    );
                    if (index !== -1) {
                        localForm.value.codigocentrogestion = array_centrogestion.value[index].codigo;
                    }
                    break;
                }
            }
        };

        const saveProyecto = async () => {
            const $form = $dom('#formSolicitud') as HTMLFormElement;

            blockedForm($form, 'true');

            if (localForm.value.monto <= 0) {
                versaAlert({
                    title: 'Error',
                    message: 'El monto debe ser mayor a 0',
                    type: 'error',
                });
                blockedForm($form, 'false');
                return;
            }
            if (
                localForm.value.codigoarea === 0 ||
                localForm.value.codigocentrogestion === 0 ||
                localForm.value.codigocampus === 0
            ) {
                versaAlert({
                    title: 'Error',
                    message: 'Todos los campos son obligatorios',
                    type: 'error',
                });
                blockedForm($form, 'false');
                return;
            }

            const formData = new FormData();
            formData.append('from', 'Solicitante');
            formData.append('dataProyecto', JSON.stringify(localForm.value));
            if (injectShowModalForm.fileProyecto.archivo !== '') {
                formData.append('dataFile', JSON.stringify(injectShowModalForm.fileProyecto));
                if (
                    injectShowModalForm.fileProyecto.file !== undefined &&
                    injectShowModalForm.fileProyecto.file !== null
                ) {
                    formData.append('file', injectShowModalForm.fileProyecto.file);
                }
            }

            if (validateFormRequired($form)) {
                showLoader.value = true;
                const response = await versaFetch({
                    url: '/api/proyectos/solicitar',
                    method: 'POST',
                    data: formData,
                });
                if (response.success === 0) {
                    versaAlert({
                        title: 'Error',
                        message: response.message || 'Error al guardar el proyecto',
                        type: 'error',
                    });
                    showLoader.value = false;
                    blockedForm($form, 'false');
                    return;
                }
                versaAlert({
                    title: '¡Éxito!',
                    message: 'Proyecto guardado correctamente',
                    type: 'success',
                    callback: () => {
                        showLoader.value = false;
                        injectShowModalForm.setShowModal(false);
                        injectShowModalForm.refreshTable = !injectShowModalForm.refreshTable;
                        emit('accion', { accion: 'reloadResume' });
                    },
                });
            }
            blockedForm($form, 'false');
        };

        const annoActual = new Date().getFullYear();

        const corresponde_a = CORRESPONDE_A;

        return {
            accion,
            injectShowModalForm,
            localForm,
            array_campus,
            array_area,
            array_centrogestion,
            getCodList,
            campusRef,
            areaRef,
            centrogestionRef,
            saveProyecto,
            annoActual,
            showLoader,
            corresponde_a,
        };
    },
    template: html`
        <newModal
            :showModal="injectShowModalForm.value"
            @accion="accion"
            idModal="modalFormSolicitud"
            key="modalFormSolicitud">
            <template v-slot:title>Solicitud de Presupuesto</template>
            <template v-slot:body>
                <form id="formSolicitud">
                    <div class="row">
                        <div class="form-group col-md-3">
                            <label for="anno" class="form-label">Año</label>
                            <input
                                type="number"
                                class="form-control"
                                id="anno"
                                :min="annoActual"
                                :max="annoActual + 1"
                                v-model="localForm.value.anno"
                                placeholder="Ingrese el año"
                                disabled
                                required />
                        </div>
                        <div class="form-group col-md-4" v-if="localForm.value.codigoproyecto !== ''">
                            <label for="codigoproyecto" class="form-label">Código Proyecto</label>
                            <input
                                type="text"
                                class="form-control"
                                id="codigoproyecto"
                                v-model="localForm.value.codigoproyecto"
                                placeholder="Ingrese el código del proyecto"
                                disabled />
                        </div>
                        <div class="col-md-5 flex items-center">
                            <subirPresupuesto />
                        </div>
                    </div>
                    <div class="row gap-3">
                        <div class="col-md-7">
                            <label for="descripcion" class="form-label">Descripción</label>
                            <input
                                type="text"
                                class="form-control"
                                id="descripcion"
                                v-model="localForm.value.descripcion"
                                placeholder="Ingrese la descripción"
                                required />
                        </div>
                        <div class="col-md-4">
                            <label for="monto" class="form-label">Monto</label>
                            <input
                                type="number"
                                class="form-control"
                                id="monto"
                                min="1"
                                v-model="localForm.value.monto"
                                placeholder="Ingrese el monto"
                                required />
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex align-items-center">
                                <label for="campus" class="form-label mb-0 me-2">Campus</label>
                                <input
                                    id="campus"
                                    type="text"
                                    class=""
                                    disabled
                                    size="10"
                                    v-model="localForm.value.codigocampus" />
                            </div>
                            <div class="input-group mt-1">
                                <input
                                    id="list_campus"
                                    class="form-control"
                                    @change="getCodList('array_campus')"
                                    autocomplete="off"
                                    list="array_campus"
                                    ref="campusRef"
                                    v-model="localForm.value.desc_campus"
                                    placeholder="Seleccione campus"
                                    required />
                                <datalist id="array_campus">
                                    <option :value="item.descripcion" :value2="item.id" v-for="item in array_campus" />
                                </datalist>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="d-flex align-items-center">
                                <label for="area" class="form-label mb-0 me-2">Área</label>
                                <input
                                    id="area"
                                    type="text"
                                    class=""
                                    disabled
                                    size="10"
                                    v-model="localForm.value.codigoarea" />
                            </div>
                            <div class="input-group mt-1">
                                <input
                                    id="list_area"
                                    class="form-control"
                                    @change="getCodList('array_area')"
                                    autocomplete="off"
                                    disabled
                                    list="array_area"
                                    ref="areaRef"
                                    v-model="localForm.value.desc_area"
                                    placeholder="Seleccione área"
                                    required />
                                <datalist id="array_area">
                                    <option
                                        :value="item.descripcion"
                                        :value2="item.codigo"
                                        v-for="item in array_area"></option>
                                </datalist>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="d-flex align-items-center">
                                <label for="centrogestion" class="form-label mb-0 me-2">Centro de Gestión</label>
                                <input
                                    id="centrogestion"
                                    type="text"
                                    class=""
                                    disabled
                                    size="10"
                                    v-model="localForm.value.codigocentrogestion" />
                            </div>
                            <div class="input-group mt-1">
                                <input
                                    id="list_centrogestion"
                                    class="form-control"
                                    @change="getCodList('array_centrogestion')"
                                    autocomplete="off"
                                    disabled
                                    list="array_centrogestion"
                                    ref="centrogestionRef"
                                    v-model="localForm.value.desc_centrogestion"
                                    placeholder="Seleccione centro de gestión"
                                    required />
                                <datalist id="array_centrogestion">
                                    <option
                                        :value="item.descripcion"
                                        :value2="item.codigo"
                                        v-for="item in array_centrogestion"></option>
                                </datalist>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label for="corresponde_a" class="form-label">Corresponde a</label>
                            <select
                                class="form-control"
                                id="corresponde_a"
                                v-model="localForm.value.corresponde_a"
                                required>
                                <option v-for="item in corresponde_a" :key="item" :value="item">{{ item }}</option>
                            </select>
                        </div>
                        <div class="col-md-12">
                            <label for="observacion" class="form-label">Observación</label>
                            <textarea
                                class="form-control"
                                id="observacion"
                                v-model="localForm.value.observacion"
                                rows="3"
                                placeholder="Ingrese una observación"
                                required></textarea>
                        </div>
                    </div>
                </form>
            </template>
            <template v-slot:footer>
                <div class="d-flex justify-content-end">
                    <button type="button" class="btn btn-secondary" @click="accion({ accion: 'closeModal' })">
                        Cerrar
                    </button>

                    <button
                        type="button"
                        class="btn btn-primary ms-2 flex"
                        @click="saveProyecto"
                        :disabled="showLoader">
                        Guardar
                        <loader v-if="showLoader" />
                    </button>
                </div>
            </template>
        </newModal>
    `,
});
