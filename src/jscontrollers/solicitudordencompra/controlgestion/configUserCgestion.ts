import { versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
import type { VersaFetchResponse } from 'versaTypes';

import modal from '@/jscontrollers/components/modal';
import newModal from '@/jscontrollers/components/newModal';

/* eslint-disable */
const m = modal;
/* eslint-enable */

Vue.component('configUserCgestion', {
    components: { newModal },
    setup() {
        const showModal = Vue.ref(false);

        const UserCGestion = Vue.ref([]);

        const userSistema = Vue.inject('userSistema');

        const loadUserCGestion = async () => {
            const data = (await versaFetch({
                url: '/api/getUsersCGestion',
                method: 'GET',
            })) as VersaFetchResponse | false;
            UserCGestion.value = data !== false ? data : [];
        };
        loadUserCGestion();

        const adddbUserCGestion = async id_user => {
            const response = await versaFetch({
                url: '/api/addUserCGestion',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id_user,
                }),
            });
            if (response.success === 1) {
                loadUserCGestion();
            }
        };
        const deletedbUserCGestion = async id => {
            const response = await versaFetch({
                url: '/api/deleteUserCGestion',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id,
                }),
            });
            if (response.success === 1) {
                loadUserCGestion();
            }
        };

        return {
            showModal,
            userSistema,
            UserCGestion,
            adddbUserCGestion,
            deletedbUserCGestion,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                showModal: () => {
                    this.showModal = true;
                },
                closeModal: () => {
                    this.showModal = false;
                },
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        addUserCGestion() {
            const user = this.userSistema.find(item => item.email === this.$refs.txtParticipante.value);
            if (user) {
                const index = this.UserCGestion.findIndex(item => item.id_user === user.id_user);
                if (index >= 0) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al agregar usuario',
                        text: 'Usuario ya se encuentra agregado',
                    });
                    return;
                }
                this.adddbUserCGestion(user.id_user);
                this.$refs.txtParticipante.value = '';
            }
        },
        deleteUserCGestion(id) {
            Swal.fire({
                title: '¿Estas seguro?',
                text: '¿Está seguro que desea eliminar?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
            }).then(result => {
                if (result.isConfirmed) {
                    this.deletedbUserCGestion(id);
                }
            });
        },
    },
    template: html`
        <div class="m-0 p-0">
            <a
                class="btn btn-info btn-flat rounded"
                title="Configuración"
                data-toggle="tooltip"
                @click="accion({accion: 'showModal'})">
                <i class="fas fa-cogs"></i>
                Control de Gestión
            </a>
            <newModal idModal="configUSerCgestion" :showModal="showModal" @accion="accion" size="max-w-md">
                <template v-slot:title>Configuración de Usuarios</template>
                <template v-slot:body>
                    <div class="row">
                        <div class="col col-md-12">
                            <div class="row">
                                <div class="input-group">
                                    <input
                                        type="text"
                                        list="baseParticipantes"
                                        ref="txtParticipante"
                                        id="participante"
                                        class="form-control"
                                        @keyup.enter="addUserCGestion" />
                                    <datalist id="baseParticipantes">
                                        <option v-for="item in userSistema" :value="item.email">{{ item.name }}</option>
                                    </datalist>
                                    <div class="input-group-append">
                                        <button
                                            class="btn btn-outline-secondary"
                                            type="button"
                                            @click="addUserCGestion">
                                            <i class="bi bi-search"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <hr />
                            <div class="row">
                                <ul>
                                    <li class="p-1" v-for="item in UserCGestion">
                                        <button class="btn btn-warning" @click="deleteUserCGestion(item.id)">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                        {{ item.name | capitalize }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </template>
                <template v-slot:footer>
                    <button type="button" class="btn btn-default" @click="accion({accion: 'closeModal'})">
                        Cerrar
                    </button>
                </template>
            </newModal>
        </div>
    `,
});

export default {
    name: 'configUserCgestion',
};
