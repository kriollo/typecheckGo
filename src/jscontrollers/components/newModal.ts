import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { defineComponent, ref, computed } = Vue;

export default defineComponent({
    name: 'newModal',
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
        size: {
            type: String,
            required: false,
            default: 'max-w-4xl',
        },
        showFooter: {
            type: Boolean,
            required: false,
            default: true,
        },
    },
    setup(props, { emit }) {
        const componentKey = ref(0);
        const showModal = computed(() => props.showModal);
        const idModal = computed(() => props.idModal);
        const size = computed(() => props.size);
        const showFooter = computed(() => props.showFooter);
        const modal = ref(undefined);

        const close = () => emit('accion', { accion: 'closeModal' });

        return { showModal, idModal, size, showFooter, modal, close, componentKey };
    },
    template: html`
        <div class="modal-wrapper-modern" :class="{ 'hidden': !showModal }" :key="componentKey">
            <!-- Backdrop -->
            <Transition name="modal-backdrop-transition">
                <div
                    v-if="showModal"
                    class="modal-backdrop-modern"
                    :id="'backdrop-' + idModal"
                    @click.self="close"
                    key="backdrop"></div>
            </Transition>

            <!-- Modal -->
            <Transition name="modal-scale-transition">
                <div class="modal-container-modern" :id="idModal" ref="modal" tabindex="-1" key="modal">
                    <div class="modal-dialog-modern" :class="size">
                        <!-- Modal Content -->
                        <div class="modal-content-modern">
                            <!-- Decorative Top Gradient Line -->
                            <div class="modal-gradient-line"></div>

                            <!-- Modal Header -->
                            <div class="modal-header-modern">
                                <div class="modal-header-inner">
                                    <div class="modal-title-wrapper">
                                        <slot name="title"></slot>
                                    </div>
                                    <button
                                        type="button"
                                        class="modal-close-btn"
                                        aria-label="Cerrar"
                                        @click="close"
                                        @mouseenter="(e) => e.currentTarget.classList.add('modal-close-hover')"
                                        @mouseleave="(e) => e.currentTarget.classList.remove('modal-close-hover')">
                                        <i class="bi bi-x-lg"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Modal Body -->
                            <div class="modal-body-modern">
                                <slot name="body"></slot>
                                <div class="modal-body-spacing"></div>
                            </div>

                            <!-- Modal Footer -->
                            <div v-if="showFooter" class="modal-footer-modern">
                                <slot name="footer"></slot>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </div>
    `,
});
