import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import newModal from '@/jscontrollers/components/newModal';

import dropZone from '@/jscontrollers/components/dropZone';
import modal from '@/jscontrollers/components/modal';
/* eslint-disable */
const m = modal;
const dz = dropZone;
/* eslint-enable */

const { defineComponent, ref, computed, watch } = Vue;

export default defineComponent({
    name: 'uploadFile',
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
        const fileType = ['xlsx', 'xls', 'csv', 'pdf', 'doc', 'docx'];
        const files = ref([]);
        const showModal = computed(() => props.showModal);
        const fileTypesString = computed(() => fileType.join(', '));

        const from = computed(() => props.from);

        watch(showModal, val => {
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
            this.$emit('accion', {
                accion: 'loadExcel',
                from: this.from,
                files,
            });
        },
    },
    template: html`
        <newModal
            :draggable="true"
            :idModal="'modalUploadFile'+from"
            :key="'modalUploadFile'+from"
            :showModal="showModal"
            @accion="accion"
            sizeModal="default bg-blue-500">
            <template v-slot:title>
                <strong class="text-blue-700">Subir Archivo</strong>
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
});
