import { useSalidaExpressStore } from '@/jscontrollers/bodega/salidaExpress/salidaExpresStore';
import inputDataListMobile from '@/jscontrollers/components/inputDataListMobile';

import { fetchUsuarioSolicitante } from '@/jscontrollers/composables/fetching';
import { show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import type { SwalResult } from 'versaTypes';
const { defineComponent, computed, ref, onMounted, watch } = Vue;
export default defineComponent({
    name: 'confirmacion',
    components: {
        inputDataListMobile,
    },
    setup() {
        const FormularioEntrada = computed(() => useSalidaExpressStore.state.formularioEntrada);
        const products = computed(() => useSalidaExpressStore.state.products);

        const solicitante = ref([]);
        const jefatura = ref([]);

        const dataConfirmacion = ref({
            solicitante: FormularioEntrada.value.solicitante,
            jefatura: '',
            observacion: FormularioEntrada.value.observacion,
        });
        const loadJefatura = async (newValue: string) => {
            jefatura.value = [];
            const result = solicitante.value.filter(
                item => item.solicitantes === newValue && item.correo_jefatura !== ''
            );
            if (result.length > 0) {
                jefatura.value = result;
                if (jefatura.value.length === 1) {
                    dataConfirmacion.value.jefatura = jefatura.value[0].correo_jefatura;
                }
            }
        };
        onMounted(async () => {
            const solicitantes = await fetchUsuarioSolicitante({
                estado: '1',
                filtro: 'solicitantes',
            });
            if (typeof solicitantes !== 'boolean') {
                solicitante.value = solicitantes;
            }
            if (FormularioEntrada.value.solicitante) {
                loadJefatura(FormularioEntrada.value.solicitante);
            }
        });

        watch(
            () => dataConfirmacion.value.solicitante,
            newValue => {
                if (newValue) {
                    dataConfirmacion.value.jefatura = '';
                    useSalidaExpressStore.commit('setFormularioEntrada', {
                        ...FormularioEntrada.value,
                    });
                    loadJefatura(newValue);
                }
            },
            { immediate: true }
        );

        watch(
            () => dataConfirmacion.value,
            newValue => {
                useSalidaExpressStore.commit('setFormularioEntrada', newValue);
            },
            { deep: true }
        );

        const guardar = async () => {
            useSalidaExpressStore.commit('setFormularioEntrada', {
                ...FormularioEntrada.value,
            });
            const result = (await Swal.fire({
                title: '¿Está seguro de guardar la salida?',
                text: 'Esta acción no se puede deshacer.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, guardar',
                cancelButtonText: 'Cancelar',
            })) as SwalResult;
            if (result.isConfirmed) {
                const response = await versaFetch({
                    url: '/api/bodega/salidaExpress/guardarSalidaExpress',
                    method: 'POST',
                    data: JSON.stringify({ formulario: FormularioEntrada.value, productos: products.value }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (response.success === 1) {
                    show_toast('Salida Express', 'Salida guardada correctamente', 'success', 'success');
                    location.reload();
                }
                show_toast('salida Express', response.message, 'error', 'error');
            }
        };

        const enabledSave = computed(() => {
            return (
                dataConfirmacion.value.solicitante !== '' &&
                dataConfirmacion.value.observacion !== '' &&
                products.value.length > 0 &&
                FormularioEntrada.value.cod_campus !== ''
            );
        });

        return {
            FormularioEntrada,
            products,
            solicitante,
            jefatura,
            guardar,
            dataConfirmacion,
            enabledSave,
        };
    },
    template: html`
        <div class="p-4 max-w-lg mx-auto space-y-6">
            <!-- Resumen del formulario -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
                <h2 class="text-lg font-semibold dark:text-gray-800">Resumen de Salida</h2>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="dark:text-gray-600">Campus:</span>
                        <span class="font-medium dark:text-gray-400">{{ FormularioEntrada.desc_campus }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="dark:text-gray-600">Area:</span>
                        <span class="font-medium dark:text-gray-400">{{ FormularioEntrada.desc_area }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="dark:text-gray-600">Centro Gestión:</span>
                        <span class="font-medium dark:text-gray-400">{{ FormularioEntrada.desc_centrogestion }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="dark:text-gray-600">Total Productos:</span>
                        <span class="font-medium dark:text-gray-400">{{ products.length }}</span>
                    </div>
                </div>
            </div>

            <!-- Formulario -->

            <form class="space-y-4" @submit.prevent="guardar">
                <!-- solicitante -->
                <inputDataListMobile
                    key="solicitante"
                    id="solicitante"
                    label="Solicitante"
                    :list="solicitante"
                    :msgItem="['solicitantes']"
                    itemValueOption="solicitantes"
                    :fieldsReturn="{idField: 'solicitantes'}"
                    :value="{idField: dataConfirmacion.solicitante, descripcionField: dataConfirmacion.solicitante}"
                    @changeDataList="dataConfirmacion.solicitante = $event.idField"
                    placeholder="Seleccione un solicitante"
                    nextFocus="jefatura"
                    required />

                <!-- Jefatura -->
                <inputDataListMobile
                    key="jefatura"
                    id="jefatura"
                    label="Jefatura"
                    :list="jefatura"
                    :msgItem="['nombre_jefatura', 'correo_jefatura']"
                    itemValueOption="correo_jefatura"
                    :fieldsReturn="{idField: 'correo_jefatura'}"
                    :value="{idField: dataConfirmacion.jefatura, descripcionField: dataConfirmacion.jefatura}"
                    @changeDataList="dataConfirmacion.jefatura = $event.idField"
                    placeholder="Seleccione una jefatura"
                    :disabled="jefatura.length <= 1" />

                <!-- Observación -->
                <div class="hidden">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Observación
                        <span class="text-red-500">*</span>
                    </label>
                    <textarea
                        v-model="dataConfirmacion.observacion"
                        rows="3"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                               bg-white dark:bg-gray-700
                               text-gray-900 dark:text-gray-100
                               focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"></textarea>
                </div>

                <!-- Botón guardar -->
                <button
                    type="submit"
                    class="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                           text-white font-medium py-2 px-4 rounded-md
                           transition duration-150 ease-in-out"
                    :disabled="!enabledSave"
                    :class="!enabledSave ? 'opacity-50 cursor-not-allowed' : ''">
                    Guardar Salida
                </button>
            </form>
        </div>
    `,
});
