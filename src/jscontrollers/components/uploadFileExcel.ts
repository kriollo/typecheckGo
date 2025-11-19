import { getSheetNames, readXlsx } from '@/jscontrollers/composables/useXlsx';
import { versaAlert } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import newModal from '@/jscontrollers/components/newModal';

import dropZone from '@/jscontrollers/components/dropZone';
import modal from '@/jscontrollers/components/modal';
/* eslint-disable */
const m = modal;
const dz = dropZone;
/* eslint-enable */

const uploadFileExcel = {
    name: 'uploadFileExcel',
    components: { newModal },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
        from: {
            type: String,
            default: 'edificio',
        },
    },
    setup(props) {
        const fileType = ['xlsx'];
        const files = Vue.ref([]);
        const showModal = Vue.computed(() => props.showModal);
        const fileTypesString = Vue.computed(() => fileType.join(', '));

        const from = Vue.computed(() => props.from);

        Vue.watch(showModal, val => {
            if (val) {
                files.value = [];
            }
        });

        return {
            fileType,
            fileTypesString,
            files,
            from,
            showModal,
        };
    },
    methods: {
        accion(accion) {
            const actions = {
                closeModal: () =>
                    this.$emit('accion', {
                        accion: 'closeModalUploadFileExcel',
                    }),
                default: () => {
                    this.showDiaglog(accion.files);
                },
            };

            const selectedAction = actions[accion.accion] || actions.default;
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        async showDiaglog(files) {
            const sheets = await getSheetNames(files.file);
            const result = await Swal.fire({
                title: '¿Está seguro de subir el archivo?',
                text: `Una vez subido el archivo: ${files.archivo}, no podrá ser revertido `,
                icon: 'warning',
                html: html`
                    <div class="flex flex-wrap content-start ">
                        <div class="form-group">
                            <label>Una vez subido el archivo: ${files.archivo}, no podrá ser revertido</label>
                        </div>
                        <div class="form-group">
                            <div class="icheck-primary">
                                <input id="checkPeraLinea" type="checkbox" checked />
                                <label for="checkPeraLinea">Usar Primera línea como encabezado</label>
                            </div>
                        </div>
                    </div>
                `,
                input: 'select',
                inputOptions: {
                    ...sheets,
                },
                inputPlaceholder: 'Seleccione la hoja',
                showCancelButton: true,
                confirmButtonText: 'Subir',
                cancelButtonText: 'Cancelar',
                inputValidator: (/** @type {Number} */ value) => {
                    if (!value) {
                        return 'Debe seleccionar una hoja';
                    }
                },
            });

            if (result.isConfirmed) {
                let primeraLinea = false;
                const check = document.getElementById('checkPeraLinea');
                if (check instanceof HTMLInputElement) {
                    primeraLinea = check.checked;
                }

                const data = await readXlsx(files.file, result.value);
                if (primeraLinea) data.shift();

                if (data.length === 0) {
                    versaAlert({
                        type: 'error',
                        title: 'Error',
                        message: 'No se encontraron registros en el archivo',
                    });
                    this.accion({ accion: 'closeModal' });
                    return;
                }
                this.$emit('accion', {
                    accion: 'loadExcel',
                    from: this.from,
                    data,
                    primeraLinea,
                    hoja: result.value,
                    files,
                });
            } else {
                this.files = [];
            }
        },
    },
    template: html`
        <newModal
            :draggable="true"
            :idModal="'modalUploadFile'+from"
            :key="'modalUploadFile'+from"
            :showModal="showModal"
            @accion="accion"
            sizeModal="default bg-green-500">
            <template v-slot:title>
                <strong class="text-green-700">Subir Archivo Excel</strong>
            </template>
            <template class=" " v-slot:body>
                <dropZone
                    :files="files"
                    :fileTypeValid="fileType"
                    :key="'dropUploadFile'+from"
                    :msgTiposArchivos="'Tipos de archivos permitidos: '+fileTypesString+' - < 10MB'"
                    :ultiple="'false'"
                    @accion="accion" />
            </template>
        </newModal>
    `,
};

Vue.component('uploadFileExcel', uploadFileExcel);

export default {
    name: 'uploadFileExcel',
    components: {
        uploadFileExcel,
    },
};
