import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const modal = {
    emits: ['accion'],
    props: {
        idModal: {
            type: String,
            required: true,
        },
        showModal: {
            type: Boolean,
            required: true,
        },
        sizeModal: {
            type: String,
            required: false,
            default: 'modal-xl',
        },
        draggable: {
            type: Boolean,
            default: false,
        },
        escClose: {
            type: Boolean,
            default: false,
        },
        styleModal: {
            type: String,
            default: '',
        },
    },
    setup(props) {
        const showModal = Vue.computed(() => props.showModal);
        const idModal = Vue.computed(() => props.idModal);
        const sizeModal = Vue.computed(() => props.sizeModal);
        const draggable = Vue.computed(() => props.draggable);
        const escClose = Vue.computed(() => props.escClose);
        const style = Vue.computed(() => props.styleModal);

        Vue.watchEffect(() => {
            if (showModal.value) {
                Vue.nextTick(() => {
                    const modalElement = $(`#${idModal.value}`);

                    if (draggable.value) {
                        modalElement.modal({
                            backdrop: 'static', // Prevenir cierre al hacer clic fuera
                            keyboard: false, // Prevenir cierre con ESC (a menos que esté habilitado en el componente)
                            focus: true,
                        });
                        // @ts-ignore
                        $(`#${idModal.value} .modal-dialog`).draggable({
                            handle: '.modal-header',
                            cursor: 'move',
                        });
                    } else {
                        modalElement.modal({
                            backdrop: 'static', // Prevenir cierre al hacer clic fuera
                            keyboard: false, // Prevenir cierre con ESC (a menos que esté habilitado en el componente)
                            focus: true,
                        });
                    }

                    // Función para corregir aria-hidden de forma agresiva
                    const forceFixAriaHidden = () => {
                        const wrapper = $('#wrapper');
                        modalElement.removeAttr('aria-hidden');
                        modalElement.attr('aria-modal', 'true');
                        modalElement.attr('role', 'dialog');

                        if (wrapper.length > 0) {
                            wrapper.removeAttr('aria-hidden');
                        }
                    };

                    // Corregir ANTES de que se muestre (prevenir que Bootstrap aplique aria-hidden)
                    modalElement.on('show.bs.modal', function () {
                        forceFixAriaHidden();
                    });

                    // Corregir DESPUÉS de que Bootstrap muestre el modal
                    modalElement.on('shown.bs.modal', function () {
                        // Múltiples intentos para asegurar que se corrija
                        forceFixAriaHidden();
                        setTimeout(forceFixAriaHidden, 50);
                        setTimeout(forceFixAriaHidden, 100);
                        setTimeout(forceFixAriaHidden, 200);
                    });

                    // Limpiar eventos cuando se oculta
                    modalElement.on('hidden.bs.modal', function () {
                        // Restaurar aria-hidden del wrapper si es necesario
                        const wrapper = $('#wrapper');
                        if (wrapper.length > 0 && !$('.modal.show').length) {
                            // Solo remover si no hay otros modales abiertos
                            wrapper.removeAttr('aria-hidden');
                        }

                        modalElement.off('show.bs.modal');
                        modalElement.off('shown.bs.modal');
                        modalElement.off('hidden.bs.modal');
                    });
                });
            } else {
                $(`#${idModal.value}`).modal('hide');
            }
        });

        return {
            idModal,
            sizeModal,
            draggable,
            escClose,
            style,
        };
    },
    methods: {
        closeModal() {
            this.$emit('accion', {
                accion: 'closeModal',
            });
        },
    },
    template: html`
        <div
            class="modal fade"
            :id="idModal"
            @keyup.esc="escClose ? closeModal():''"
            tabindex="-1"
            role="dialog"
            :aria-labelledby="idModal + '-title'">
            <div class="modal-dialog" :class="sizeModal" role="document" :style="style">
                <div class="modal-content max-h-[80vh]">
                    <div class="modal-header" :class="draggable ? 'draggable_touch':''">
                        <h3 class="modal-title" :id="idModal + '-title'">
                            <slot name="title"></slot>
                        </h3>
                        <div class="card-tools">
                            <button type="button" class="btn btn-tool" @click="closeModal()" aria-label="Cerrar modal">
                                <i class="fas fa-times" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                    <div
                        class="modal-body d-flex justify-content-center h-max overflow-y-auto"
                        :id="'modal-body_'+idModal">
                        <slot name="body"></slot>
                    </div>
                    <div class="modal-footer justify-content-between">
                        <slot name="footer"></slot>
                    </div>
                </div>
            </div>
        </div>
    `,
};

Vue.component('modal', modal);

export default {
    name: 'modal',
    components: {
        modal,
    },
};
