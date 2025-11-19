import { $dom } from '@/jscontrollers/composables/dom-selector';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
import { Html5Qrcode } from 'P@/vendor/plugins/html5-qrcode/html5-qrcode.esm.js';

import modal from '@/jscontrollers/components/modal';
import newModal from '@/jscontrollers/components/newModal';
import { show_toast } from '@/jscontrollers/composables/utils';
import type { AccionData, actionsType } from 'versaTypes';

/* eslint-disable */
const m = modal;
/* eslint-enable */

const { defineComponent, computed, ref, onBeforeUnmount, onMounted, watch } = Vue;

export default defineComponent({
    name: 'barCode',
    components: { newModal },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            required: true,
        },
    },
    setup(props, { emit }) {
        const showModal = computed(() => props.showModal);
        const method = ref('camera');
        const step = ref(2);
        const cameras = ref([]);
        const selectedCamera = ref('');
        const html5qrCode = ref(null);
        const zoom = ref(1);
        const result = ref(false);
        const devices = ref([]);
        const notFound = ref(false);
        const getMediaSupport = ref(true);
        const audio = ref(null);
        const modeInput = ref('camera');
        const dataResult = ref({});

        const selectMethod = selectedMethod => {
            method.value = selectedMethod;
            step.value = 2;
            if (selectedMethod === 'camera') {
                getCameras();
            }
        };

        const getCameras = async () => {
            try {
                devices.value = await Html5Qrcode.getCameras();
                if (devices.value && devices.value.length > 0) {
                    cameras.value = devices.value;
                    selectedCamera.value = devices.value[0].id;
                    modeInput.value = 'camera';
                } else {
                    notFound.value = true;
                }
            } catch (error) {
                show_toast('error', error.message);
                notFound.value = true;
            }
        };

        const delay = (ms: number): Promise<void> => {
            // eslint-disable-next-line avoid-new
            return new Promise(resolve => setTimeout(resolve, ms));
        };

        const startCamera = async () => {
            try {
                step.value = 3;
                await delay(100);
                html5qrCode.value = new Html5Qrcode('reader', false);
                await html5qrCode.value.start(
                    {
                        deviceId: { exact: selectedCamera.value },
                    },
                    {
                        fps: 10,
                        qrbox: 250,
                        focusMode: 'continuous',
                        aspectRatio: 1,
                    },
                    onSuccessScan,
                    onErrorScan
                );
                await delay(100);
                const qrShadedRegion = $dom('#qr-shaded-region');
                const range = $dom('#range');
                if (qrShadedRegion) {
                    qrShadedRegion.innerHTML += range.outerHTML;
                    await delay(100);
                    const $newRange = $dom('#range', qrShadedRegion);
                    $newRange.classList.remove('hidden');
                    const inputRange = $dom('#qr-shaded-region input[type="range"]') as HTMLInputElement;
                    inputRange.value = zoom.value;
                    const p = $dom('p', $newRange);
                    inputRange.addEventListener('input', () => {
                        zoom.value = inputRange.value;
                        p.textContent = `Zoom: ${inputRange.value}x`;
                    });
                }

                await html5qrCode.value.applyVideoConstraints({
                    focusMode: 'continuous',
                    advanced: [{ zoom: zoom.value }],
                });
            } catch (e) {
                if (e instanceof OverconstrainedError) {
                    console.error('Error starting camera:', e);
                    if (e.constraint === 'focusMode') {
                        console.warn('Continuous focus mode not supported, trying auto focus.');
                        // Try a fallback focus mode here
                    } else if (e.constraint === 'zoom') {
                        console.warn('Zoom not supported.');
                        // Handle zoom not being supported
                    }
                } else {
                    console.error('Error starting camera:', e);
                }
            }
        };

        const togglePanel = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            result.value = !result.value;
        };

        const StopCapture = async () => {
            html5qrCode.value.stop();
            html5qrCode.value = null;
        };
        const resetZoom = () => {
            const inputRange = $dom('#qr-shaded-region input[type="range"]') as HTMLInputElement;
            const zoom = $dom('#qr-shaded-region p') as HTMLInputElement;
            inputRange.value = '1';
            zoom.textContent = 'Zoom: 1x';
            zoom.value = '1';
            if (html5qrCode.value) {
                html5qrCode.value.applyVideoConstraints({
                    focusMode: 'continuous',
                    advanced: [{ zoom: 1 }],
                });
            }
        };

        watch(zoom, value => {
            if (html5qrCode.value) {
                html5qrCode.value.applyVideoConstraints({
                    focusMode: 'continuous',
                    advanced: [{ zoom: value }],
                });
            }
        });

        const goBack = () => {
            if (devices.value.length === 0) {
                step.value = 1;
                return;
            }

            if (step.value === 3 && method.value === 'camera') {
                if (html5qrCode.value) {
                    html5qrCode.value.stop();
                    html5qrCode.value = null;
                    zoom.value = 1;
                }
            }
            // Reiniciamos el estado
            step.value = step.value - 1;
            method.value = 'camera';
            modeInput.value = 'camera';
        };
        const goBackScan = async () => {
            togglePanel();
            if (modeInput.value === 'camera') {
                if (html5qrCode.value === null) await startCamera();
                else html5qrCode.value.resume();
            } else {
                codeInput.value = '';
                const input = $dom('#codeInput') as HTMLInputElement;
                await delay(100);
                input.focus();
            }
        };

        const goInput = () => {
            step.value = 3;
            method.value = 'camera';
            modeInput.value = 'input';
        };

        const codeInput = ref('');
        const toogleInputMode = async () => {
            modeInput.value = modeInput.value === 'input' ? 'camera' : 'input';
            if (modeInput.value === 'camera') {
                codeInput.value = '';
                await startCamera();
            } else {
                await StopCapture();
                const input = $dom('#codeInput') as HTMLInputElement;
                input.focus();
            }
        };

        onBeforeUnmount(() => {
            if (html5qrCode.value) {
                html5qrCode.value.stop();
                html5qrCode.value = null;
            }
        });
        onMounted(async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                getMediaSupport.value = true;
                audio.value = new Audio('/assets/vendor/plugins/html5-qrcode/beep-07a.mp3');
            } else {
                getMediaSupport.value = false;
            }
        });

        watch(
            () => showModal.value,
            newValue => {
                if (newValue) {
                    selectMethod('camera');
                    if (devices.value.length === 0) {
                        getCameras();
                    }
                }
            }
        );

        const onSuccessScan = async (decodedText, _decodedResult) => {
            if (modeInput.value === 'camera') html5qrCode.value.pause();
            audio.value.play();

            emit('accion', { accion: 'scanCode', codigo: decodedText });
            goBack();
            emit('accion', { accion: 'closeModalBarCode' });
        };
        // eslint-disable-next-line no-unused-vars
        const onErrorScan = errorMessage => {
            // console.error('Error reading QR code:', errorMessage); // Uncommented error logging
        };

        const accion = (data: AccionData) => {
            const actions: actionsType = {
                closeModal: () => {
                    // closeBarcode();
                    emit('accion', { accion: 'closeModalBarCode' });
                },
            };
            const fn = actions[data.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        return {
            showModal,
            accion,
            method,
            step,
            cameras,
            selectedCamera,
            html5qrCode,
            zoom,
            result,
            devices,
            notFound,
            getMediaSupport,
            audio,
            modeInput,
            dataResult,
            selectMethod,
            getCameras,
            startCamera,
            onSuccessScan,
            onErrorScan,
            goBack,
            resetZoom,
            toogleInputMode,
            goBackScan,
            codeInput,
            goInput,
        };
    },
    template: html`
        <newModal idModal="barCodeModal" :showModal="showModal" @accion="accion">
            <template v-slot:title>Barcode</template>
            <template v-slot:body>
                <div class="w-full">
                    <div id="range" class="range-container hidden">
                        <p class="text-center mb-1">Zoom: {{ zoom }}x</p>
                        <input type="range" min="1" max="8" step="0.1" value="1" class="range-input" />
                    </div>
                    <div
                        v-if="getMediaSupport"
                        class="lg:flex lg:justify-between max-sm:flex-col max-sm:flex-wrap pb-10">
                        <div class="relative sm:max-w-xl sm:mx-auto">
                            <!--<div
                                class="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
                            -->
                            <div class="relative p-2 bg-white shadow-lg sm:rounded-3xl sm:p-20">
                                <div class="max-w-md mx-auto">
                                    <div>
                                        <h1 class="text-2xl font-semibold text-center">Escaneo de Codigo</h1>
                                    </div>
                                    <div class="divide-y divide-gray-200">
                                        <div
                                            class="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                                            <div v-if="step === 1">
                                                <p class="text-center mb-4">Seleccione el método de escaneo:</p>
                                                <div class="flex justify-center space-x-4">
                                                    <button
                                                        @click="selectMethod('camera')"
                                                        class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                                        Comenzar Escaneo
                                                    </button>
                                                    <!--<button
                                                        @click="goInput()"
                                                        class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                                        Ingresar Manualmente
                                                    </button>-->
                                                </div>
                                            </div>

                                            <div v-if="step === 2 && method === 'camera'">
                                                <div v-if="devices.length === 0">
                                                    <p class="text-center mb-4" v-if="notFound">
                                                        No se encontraron cámaras disponibles.
                                                    </p>
                                                    <p class="text-center mb-4" v-else>Cargando cámaras...</p>
                                                </div>
                                                <div v-else>
                                                    <p class="text-center mb-4">Seleccione la cámara:</p>
                                                    <select
                                                        v-model="selectedCamera"
                                                        class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                                        <option
                                                            v-for="camera in cameras"
                                                            :key="camera.id"
                                                            :value="camera.id">
                                                            {{ camera.label }}
                                                        </option>
                                                    </select>
                                                    <button
                                                        @click="startCamera"
                                                        class="mt-4 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                                        Iniciar Captura
                                                    </button>
                                                </div>
                                                <!-- <button
                                                    @click="goBack"
                                                    class="mt-2 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                                    Volver
                                                </button>-->
                                            </div>

                                            <div v-if="step === 3 && method === 'camera'">
                                                <div id="reader"></div>
                                                <div v-if="modeInput === 'input'" class="flex items-center w-full mt-2">
                                                    <input
                                                        autofocus
                                                        autocomplete="off"
                                                        id="codeInput"
                                                        type="text"
                                                        v-model="codeInput"
                                                        @keydown.enter="onSuccessScan(codeInput)"
                                                        placeholder="Ingresar código manualmente"
                                                        class="flex-grow p-2.5 text-sm text-gray-900 bg-gray-50 rounded-l-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" />
                                                    <button
                                                        type="button"
                                                        class="p-2.5 text-sm font-medium text-white bg-green-700 rounded-r-lg border border-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                                                        @click="onSuccessScan(codeInput)">
                                                        <i class="bi bi-send"></i>
                                                        <span class="sr-only">Enviar</span>
                                                    </button>
                                                </div>
                                                <div class="grid grid-cols-2 gap-4 items-center">
                                                    <button
                                                        v-if="html5qrCode"
                                                        @click="resetZoom"
                                                        class="mt-2 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                                        Restablecer Zoom
                                                    </button>
                                                    <!--<button
                                                        @click="toogleInputMode"
                                                        class="mt-2 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                                        {{ modeInput === 'input' ? 'Escanear' : 'Ingresar Código' }}
                                                    </button>-->
                                                    <button
                                                        @click="goBack"
                                                        class="mt-2 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                                        Volver
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else>
                        <h1>El Navegador no soporta el uso de camaras</h1>
                    </div>
                </div>
            </template>
            <template v-slot:footer>
                <div class="flex justify-end space-x-2">
                    <button
                        @click="accion({ accion: 'closeModal' })"
                        class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                        Cancelar
                    </button>
                </div>
            </template>
        </newModal>
    `,
});
