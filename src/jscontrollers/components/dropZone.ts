import { useFileZise, useValidFile } from '@/jscontrollers/composables/useValidFile';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
import { $dom } from '../composables/dom-selector';

import loader from '@/jscontrollers/components/loading';
/* eslint-disable */
const ld = loader;
/* eslint-enable */

const { defineComponent } = Vue;

const filesError = defineComponent({
    name: 'filesError',
    emits: ['accion'],
    props: {
        FilesErrors: {
            type: Array,
            required: true,
        },
    },
    setup(props) {
        const FilesErrors = Vue.computed(() => props.FilesErrors);

        return {
            FilesErrors,
        };
    },
    template: html`
        <div class="files-error-container">
            <!-- Encabezado de errores -->
            <div class="files-error-header">
                <div class="files-error-header-title">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h5>Errores detectados</h5>
                </div>

                <!-- Lista de errores -->
                <div class="files-error-list">
                    <div v-for="(item, index) in FilesErrors" :key="index" class="files-error-item">
                        <!-- Nombre del archivo -->
                        <div class="files-error-item-name">
                            <i class="fas fa-file-exclamation"></i>
                            <p>{{ item.name }}</p>
                        </div>

                        <!-- Mensaje de error -->
                        <p class="files-error-item-message">{{ item.error_msg }}</p>
                    </div>
                </div>
            </div>

            <!-- Acciones -->
            <div class="files-error-actions">
                <button type="button" class="files-error-btn" @click="$emit('accion', {accion:'closeModalFilesError'})">
                    <i class="fas fa-redo"></i>
                    Volver a Intentar
                </button>
            </div>
        </div>
    `,
});

const dropZone = {
    components: { filesError },
    name: 'dropZone',
    emits: ['accion'],
    props: {
        multiple: {
            type: Boolean,
            required: false,
            default: false,
        },
        nfilesMultiple: {
            type: Number,
            required: false,
            default: 1,
        },
        files: {
            type: Array,
            required: false,
        },
        msgTiposArchivos: {
            type: String,
            required: false,
            default: 'Tipos Validos: .doc .docx .pdf .xlsx .xls .ppt .pptx - < 10 MB',
        },
        fileTypeValid: {
            type: Array,
            required: false,
            default: () => ['xlsx', 'xls', 'doc', 'docx', 'pdf', 'ppt', 'pptx'],
        },
    },
    setup(props, { emit }) {
        const multiple = Vue.computed(() => props.multiple);
        const nfilesMultiple = Vue.computed(() => props.nfilesMultiple);
        const fileTypeValid = Vue.computed(() => props.fileTypeValid);
        const msgTiposArchivos = Vue.computed(() => props.msgTiposArchivos);

        const files = Vue.computed(() => {
            if (props.files !== undefined) return props.files;
            return [];
        });

        const mensaje = Vue.ref('Arrastra y Suelta Archivos');
        const classActive = Vue.ref(false);
        const loading = Vue.ref(false);

        const ShowModalFilesError = Vue.ref(false);
        const ArrayFilesErrors = Vue.ref([]);

        const btn_SelectFile = () => {
            loading.value = true;
        };

        const accionBarraComando = value => {
            switch (value.accion) {
                case 'closeModalFilesError':
                case 'closeModal':
                    ShowModalFilesError.value = false;
                    break;
                default:
                    emit('accion', value);
                    break;
            }
        };

        const validaFiles = file => {
            if (!useValidFile(fileTypeValid.value, file)) {
                return {
                    name: file.name,
                    error_msg: 'Tipo de Archivo no permitido',
                    isValid: false,
                };
            }
            if (!useFileZise(file, 10)) {
                return {
                    name: file.name,
                    error_msg: 'Archivo no debe ser mayor a 10MB',
                    isValid: false,
                };
            }

            const indexFile = files.value.findIndex(item => item.archivo === file.name || item.name === file.name);
            if (indexFile >= 0) {
                return {
                    name: file.name,
                    error_msg: 'Archivo ya existe en la lista',
                    isValid: false,
                };
            }
            return {
                name: file.name,
                isValid: true,
            };
        };

        const setFilesLocal = filesInput => {
            ArrayFilesErrors.value = [];
            const fileLocal = [];
            if (filesInput.length <= 0) {
                loading.value = false;
                return;
            }

            if (filesInput.length > nfilesMultiple.value) {
                ArrayFilesErrors.value.push({
                    name: 'Multiples Archivos',
                    error_msg: `Solo se permiten ${nfilesMultiple.value} archivo a la vez`,
                });
            }

            if (ArrayFilesErrors.value.length > 0) {
                ShowModalFilesError.value = true;
                loading.value = false;
                return;
            }

            for (const file of filesInput) {
                const result = validaFiles(file);
                if (result.isValid)
                    fileLocal.push({
                        archivo: file.name,
                        type: file.type,
                        size: file.size,
                        file: file,
                    });
                else ArrayFilesErrors.value.push(result);
            }
            const inputFile = $dom('#file');
            if (inputFile && inputFile instanceof HTMLInputElement) {
                inputFile.value = '';
            }

            loading.value = false;

            if (ArrayFilesErrors.value.length > 0) ShowModalFilesError.value = true;
            else if (fileLocal.length > 0)
                accionBarraComando({
                    accion: 'addFiles',
                    files: multiple.value ? fileLocal : fileLocal[0],
                });
        };

        const DesdeInputChange = e => {
            e.preventDefault();
            setFilesLocal(e.target.files);
        };

        return {
            mensaje,
            classActive,
            ShowModalFilesError,
            ArrayFilesErrors,
            files,
            multiple,
            nfilesMultiple,
            loading,
            btn_SelectFile,
            DesdeInputChange,
            setFilesLocal,
            accionBarraComando,
            msgTiposArchivos,
        };
    },
    methods: {
        drag: function (e) {
            e.preventDefault();
            this.classActive = true;
            this.mensaje = 'Suelta para Subir';
        },
        drop: function (e) {
            this.loading = true;
            e.preventDefault();
            this.classActive = false;
            this.mensaje = 'Arrastra y Suelta Archivos';
            this.setFilesLocal(e.dataTransfer.files);
        },
        dragleave: function (e) {
            e.preventDefault();
            this.classActive = false;
            this.mensaje = 'Arrastra y Suelta Archivos';
        },
    },
    template: html`
        <div class="w-full h-[200px]">
            <label
                v-if="!ShowModalFilesError"
                class="DragDropArea group relative block w-full h-full rounded-lg border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden p-0"
                :class="classActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-400 dark:hover:border-blue-400'"
                @click="btn_SelectFile"
                @dragleave="dragleave"
                @dragover="drag"
                @drop="drop"
                ref="DragDropArea"
                title="Puedes dar click o arrastrar los archivos">
                <!-- Fondo decorativo -->
                <div class="absolute inset-0 opacity-5 dark:opacity-10">
                    <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" stroke-width="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" class="text-blue-500" />
                    </svg>
                </div>

                <!-- Contenido -->
                <div class="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                    <!-- Icono -->
                    <div
                        class="mb-3 transform transition-transform group-hover:scale-110"
                        :class="classActive ? 'scale-125' : ''">
                        <svg
                            v-if="!loading"
                            class="w-12 h-12 text-blue-500 dark:text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <loader v-else class="text-blue-500 dark:text-blue-400"></loader>
                    </div>

                    <!-- Texto principal -->
                    <h4
                        class="text-center font-semibold text-lg transition-colors"
                        :class="classActive
                            ? 'text-blue-600 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-200'">
                        {{ mensaje }}
                    </h4>

                    <!-- Texto secundario -->
                    <span class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center px-4 max-w-xs">
                        {{msgTiposArchivos}}
                    </span>

                    <!-- Instrucción adicional -->
                    <p
                        class="text-xs text-gray-400 dark:text-gray-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        O haz clic para seleccionar
                    </p>
                </div>

                <!-- Input oculto -->
                <input
                    id="file"
                    type="file"
                    class="form-control"
                    @change="DesdeInputChange"
                    hidden
                    multiple
                    name="file" />
            </label>

            <!-- Componente de errores -->
            <filesError v-else :FilesErrors="ArrayFilesErrors" key="fileErrorDropZone" @accion="accionBarraComando" />
        </div>
    `,
};

Vue.component('dropZone', dropZone);
Vue.component('filesError', filesError);

export default {
    name: 'dropZone',
    components: {
        dropZone,
    },
};
