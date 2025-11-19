import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
import type { AccionData, actionsType } from 'versaTypes';

const { defineComponent, ref } = Vue;

export default defineComponent({
    name: 'crumb',
    setup() {
        const showModal = ref(false);

        return {
            showModal,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion: AccionData) {
            const actions: actionsType = {
                closeModal: () => (this.showModal = false),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
    },
    template: html`
        <div class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1 class="m-0 text-dark">
                            <i class="fas fa-comments-dollar"></i>
                            Gestión de Activos
                        </h1>
                    </div>
                    <div class="col-sm-6">
                        <ol class="breadcrumb float-sm-right">
                            <li class="breadcrumb-item">
                                <a href="/portal">Home</a>
                            </li>
                            <li class="breadcrumb-item active">Dashboard</li>
                            <li class="breadcrumb-item active">
                                <a
                                    class="btn btn-info btn-flat rounded"
                                    data-toggle="tooltip"
                                    href="/geda/mantenedor_edificios"
                                    title="Mostrar Ubicaciones">
                                    <i class="far fa-building mr-1"></i>
                                    Mantenedor
                                </a>
                            </li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    `,
});
