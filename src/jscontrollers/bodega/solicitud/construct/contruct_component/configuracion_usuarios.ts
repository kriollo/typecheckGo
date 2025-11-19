import { storeCPB } from '@/jscontrollers/bodega/solicitud/construct/construct_pedido_STORE';
import { show_toast, TRUE } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { defineComponent } = Vue;

export default defineComponent({
    store: storeCPB,
    name: 'configuracion_usuarios',
    data() {
        return {
            usersFind: [],
            userFindLocal: [],
            findUsuarios: '',
            findUsuarios_local: '',
        };
    },
    computed: {
        ...Vuex.mapState(['usuarios', 'usuarios_local']),
    },
    methods: {
        ...Vuex.mapActions(['getUsers']),
        ...Vuex.mapMutations(['SET_USUARIOS', 'DEL_USUARIOS_VALUE', 'SET_USUARIOS_LOCAL']),
        moveToUsuariosLocal() {
            for (let i = this.usuarios.length; i > 0; i--) {
                if (this.usuarios[i - 1].value === TRUE) {
                    this.usuarios[i - 1].value = false;
                    this.usuarios_local.push(this.usuarios[i - 1]);
                    this.DEL_USUARIOS_VALUE(i - 1);
                }
            }
            this.findUsers();
            this.userFindLocal = this.usuarios_local;
        },
        findUsers() {
            this.usersFind = this.usuarios.filter(usuario => {
                return usuario.name.toLowerCase().includes(this.findUsuarios.toLowerCase());
            });
        },
        moveToUsuarios() {
            for (let i = this.usuarios_local.length; i > 0; i--) {
                if (this.usuarios_local[i - 1].value === TRUE) {
                    this.usuarios_local[i - 1].value = false;
                    this.usuarios.push(this.usuarios_local[i - 1]);
                    this.usuarios_local.splice(i - 1, 1);
                }
            }
            this.findUsersLocal();
            this.findUsers();
        },
        findUsersLocal() {
            this.userFindLocal = this.usuarios_local.filter(usuario => {
                return usuario.name.toLowerCase().includes(this.findUsuarios_local.toLowerCase());
            });
        },
    },
    mounted() {
        this.getUsers()
            .then(response => {
                if (response.data !== false) {
                    response.data.map(usuario => {
                        const userLocal = this.usuarios_local.find(user => {
                            return user.id_user === usuario.id_user;
                        });
                        if (userLocal !== undefined) {
                            usuario.value = true;
                        } else {
                            usuario.value = false;
                        }
                    });
                    this.SET_USUARIOS(response.data);
                    this.usersFind = this.usuarios;
                    this.SET_USUARIOS_LOCAL([]);
                    this.moveToUsuariosLocal();
                }
            })
            .catch(function (error) {
                show_toast('Error', error, 'error', 'error');
            });
    },
    template: html`
        <div class="row">
            <div class="col col-md-12" style="max-height: 550px;overflow-y: auto;">
                <h3>Seleccione los usuario que tendran acceso al pedido</h3>
                <div class="row">
                    <div class="col col-md-5">
                        <input
                            type="text"
                            class="form-control"
                            @input="findUsers"
                            placeholder="Buscar"
                            v-model="findUsuarios" />
                        <ul class="list-group">
                            <li class="list-group-item" v-for="(usuario,index) in usersFind">
                                <div class="icheck-success">
                                    <input type="checkbox" :id="'userAvailable_'+index" v-model="usuario.value" />
                                    <label :for="'userAvailable_'+index">{{ usuario.name | capitalize }}</label>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div class="col col-md-1" style="display: flex;justify-content: center;align-items: center;">
                        <div style="position: fixed; top: 50%;">
                            <button
                                type="button"
                                class="btn btn-md btn-flat btn-warning"
                                @click="moveToUsuarios"
                                title="Denegar">
                                <i class="fas fa-arrow-alt-circle-left"></i>
                            </button>
                            <button
                                type="button"
                                class="btn btn-md btn-flat btn-info mr-2"
                                @click="moveToUsuariosLocal"
                                title="Permitir">
                                <i class="fas fa-arrow-alt-circle-right"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col col-md-5">
                        <ul class="list-group">
                            <input
                                type="text"
                                class="form-control"
                                @input="findUsersLocal"
                                placeholder="Buscar"
                                v-model="findUsuarios_local" />
                            <li class="list-group-item" v-for="(usuario,index) in userFindLocal">
                                <div class="icheck-success">
                                    <input type="checkbox" :id="'usersCheck_'+index" v-model="usuario.value" />
                                    <label :for="'usersCheck_'+index">{{ usuario.name | capitalize }}</label>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `,
});
