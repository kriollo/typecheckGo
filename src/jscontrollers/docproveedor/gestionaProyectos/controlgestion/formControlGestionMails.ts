import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { defineComponent, toRefs, ref, onMounted } = Vue;

import newModal from '@/jscontrollers/components/newModal';

import modal from '@/jscontrollers/components/modal';
import { versaFetch } from '@/jscontrollers/composables/utils';
import { AccionData, actionsType, VersaFetchResponse } from 'versaTypes';
/* eslint-disable */
const m = modal;
/* eslint-enable */

interface Props {
    showModalForm: boolean;
}

export default defineComponent({
    name: 'formControlGestionMails',
    components: { newModal },
    emits: ['accion'],
    props: {
        showModalForm: {
            type: Boolean,
            required: true,
        },
    },
    setup(props: Props, { emit }) {
        const { showModalForm } = toRefs(props);
        const userCGestion = ref([]);
        const userSistema = ref([]);
        const participante = ref(null);

        const loadUserCGestion = async () => {
            const data = (await versaFetch({
                url: '/api/proyectos/getUsersCGestion',
                method: 'GET',
            })) as VersaFetchResponse | false;
            userCGestion.value = data !== false ? data : [];
        };
        const loadUserSistema = async () => {
            const response = (await versaFetch({
                url: '/api/getUsersParticipantes',
                method: 'POST',
            })) as VersaFetchResponse | false;
            userSistema.value = response !== false ? response : [];
        };

        const accion = (data: AccionData) => {
            const actions: actionsType = {
                closeModal: () => {
                    emit('accion', { accion: 'closeModal' });
                },
            };
            const fn = actions[data.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };
        const addUserCGestion = async () => {
            const user = userSistema.value.find(u => u.email === participante.value.value);
            if (!user) {
                return;
            }
            const response = await versaFetch({
                url: '/api/proyectos/addUserCGestion',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id_user: user.id_user,
                }),
            });
            if (response.success === 1) {
                loadUserCGestion();
            }
        };
        const deleteUserCGestion = async (id_user: number) => {
            const response = await versaFetch({
                url: '/api/proyectos/deleteUserCGestion',
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

        onMounted(async () => {
            await Promise.all([loadUserCGestion(), loadUserSistema()]);
        });

        return { showModalForm, accion, userCGestion, addUserCGestion, deleteUserCGestion, userSistema, participante };
    },
    template: html`
        <newModal
            :escClose.bool="true"
            :showModal="showModalForm"
            @accion="accion"
            idModal="modalControlGestionMails"
            key="modalControlGestionMails"
            size="max-w-md">
            <template v-slot:title>Configuración de Correos Control de Gestión</template>
            <template v-slot:body>
                <div class="row">
                    <div class="col col-md-12">
                        <div class="row">
                            <div class="input-group">
                                <input
                                    type="text"
                                    list="baseParticipantes"
                                    ref="participante"
                                    id="participante"
                                    class="form-control"
                                    @keyup.enter="addUserCGestion" />
                                <datalist id="baseParticipantes">
                                    <option v-for="item in userSistema" :value="item.email">{{ item.name }}</option>
                                </datalist>
                                <div class="input-group-append">
                                    <button class="btn btn-outline-secondary" type="button" @click="addUserCGestion">
                                        <i class="bi bi-search"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <hr />
                        <div class="row">
                            <ul>
                                <li class="p-1" v-for="item in userCGestion">
                                    <button class="btn btn-warning" @click="deleteUserCGestion(item.id_user)">
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
                <div class="d-flex justify-content-end">
                    <button type="button" class="btn btn-secondary" @click="accion({ accion: 'closeModal' })">
                        Cerrar
                    </button>
                </div>
            </template>
        </newModal>
    `,
});
