import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { defineComponent, ref, computed, watch } = Vue;

import uploadFile from '@/jscontrollers/components/uploadFile';
import { show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { ShowModalFormInjection } from '@/jscontrollers/docproveedor/gestionaProyectos/InjectKeys';
import { usePPalStore } from '@/jscontrollers/usePPalStore';
import { AccionData, actionsType } from 'versaTypes';

interface Props {
    proyecto: string;
    file: File | null;
}

export default defineComponent({
    name: 'subirPresupuesto',
    components: { uploadFile },
    props: {
        proyecto: {
            type: String,
            required: false,
            default: '',
        },
        file: {
            type: Object,
            required: false,
        },
    },
    setup(props: Props, { emit }) {
        const injectShowModalForm = ShowModalFormInjection.inject();

        const showModal = ref(false);
        const fileLocal = ref(null);
        const typeFiles = computed(() => usePPalStore.state.FileTypeValid);

        const message = ref('Subir Presupuesto');

        watch(
            () => injectShowModalForm.fileProyecto,
            newVal => {
                fileLocal.value = { ...newVal };
            }
        );

        const accion = (data: AccionData) => {
            const actions: actionsType = {
                showModal: () => {
                    showModal.value = true;
                },
                closeModalUploadFileExcel: () => {
                    showModal.value = false;
                },
                loadExcel: () => {
                    message.value = 'Actualizar Presupuesto';
                    injectShowModalForm.setFileProyecto({ ...data.files });
                    showModal.value = false;
                },
                deleteFile: () => {
                    emit('accion', { accion: 'deleteFile' });
                },
                default: () => {
                    // console.log('Accion no definida en subirPresupuesto.ts', data);
                },
            };
            const fn = actions[data.accion] || actions['default'];
            if (typeof fn === 'function') {
                fn();
            }
        };

        const getType = type => {
            const typeSearch = typeFiles.value.find(item => item.type === type);
            if (typeSearch === undefined) return 'bi bi-file-earmark';
            return `${typeSearch.color} ${typeSearch.icon}`;
        };
        const descargaBlob = () => {
            const blob = new Blob([fileLocal.file], {
                type: fileLocal.type,
            });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileLocal.archivo;
            link.click();

            // Limpiar después de la descarga
            setTimeout(() => {
                window.URL.revokeObjectURL(link.href);
                link.remove();
            }, 700);
        };
        const saveDocumentoDirect = async () => {
            const result = await Swal.fire({
                title: '¿Estas seguro de guardar este documento?',
                text: 'No podras revertir esta acción!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, guardar!',
                cancelButtonText: 'No, cancelar!',
            });
            if (result.isConfirmed) {
                const formData = new FormData();
                formData.append('codigoproyecto', injectShowModalForm.proyecto.codigoproyecto.toString());

                if (fileLocal.value?.archivo !== undefined) {
                    formData.append('dataFile', JSON.stringify(fileLocal.value));
                    formData.append('file', fileLocal.value.file);
                }

                const response = await versaFetch({
                    url: '/api/proyectos/saveDocumentoDirect',
                    method: 'POST',
                    data: formData,
                });
                if (response.success == 1) {
                    show_toast(response.title, response.message, 'Success', 'success');
                } else {
                    show_toast(response.title, response.message, 'Alerta', 'warning');
                }
            }
        };

        return {
            injectShowModalForm,
            fileLocal,
            message,
            showModal,
            accion,
            getType,
            descargaBlob,
            saveDocumentoDirect,
        };
    },
    template: html`
        <div class="d-flex justify-content-between align-items-center border-info border p-2 gap-2">
            <uploadFile :showModal="showModal" from="subirPresupuesto" @accion="accion" />
            <div v-if="fileLocal?.type">
                <i :class="getType(file?.type)+' fa-1x'"></i>
                <a style="cursor: pointer;" @click="descargaBlob" download v-if="fileLocal?.id === undefined">
                    {{ fileLocal?.archivo }}
                </a>
                <a :href="fileLocal.ruta" download v-else>{{ fileLocal?.archivo }}</a>
            </div>
            <div class="d-flex justify-content-between gap-1">
                <button
                    type="button"
                    class="btn btn-primary btn-xs btn-sm"
                    @click="accion({accion:'showModal'})"
                    title="Cargar Archivo">
                    <i class="fa fa-upload"></i>
                    {{ message }}
                </button>
                <button
                    type="button"
                    class="btn btn-danger btn-xs btn-sm"
                    @click="accion({accion:'deleteFile'})"
                    title="Eliminar Archivo"
                    v-if="fileLocal?.archivo !== undefined">
                    <i class="fa fa-trash"></i>
                </button>
                <button
                    type="button"
                    class="btn btn-success btn-xs btn-sm"
                    @click="saveDocumentoDirect"
                    title="Guardar Archivo"
                    v-if="fileLocal?.archivo !== undefined && injectShowModalForm.proyecto.codigoproyecto !== ''">
                    <i class="fa fa-save"></i>
                </button>
            </div>
        </div>
    `,
});
