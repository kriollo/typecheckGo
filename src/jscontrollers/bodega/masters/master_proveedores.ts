import { createXlsxFromJson } from '@/jscontrollers/composables/useXlsx.js';
import {
    obtenerDV,
    pasarella,
    show_toast,
    validateResponeStatus,
    versaAlert,
    versaFetch,
} from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm.js';

import newModal from '@/jscontrollers/components/newModal';

import customTable from '@/jscontrollers/components/customTable.js';
import dropZone from '@/jscontrollers/components/dropZone.js';
import iCheck from '@/jscontrollers/components/iCheck.js';
import { fetchGetContactosProveedor } from '@/jscontrollers/composables/fetching';

import type { VersaFetchResponse } from 'versaTypes';
/* eslint-disable */
const ct = customTable;
const ic = iCheck;
const dp = dropZone;
/* eslint-enable */

Vue.component('modalviewcontactos', {
    name: 'modalviewcontactos',
    props: {
        showmodal: {
            type: Boolean,
            default: false,
            required: true,
        },
        param: [],
    },
    data() {
        return {
            array_contactos: [],
            showEditContacto: false,
            contacto_select: {
                id: 0,
                nombre: '',
                telefono: '',
                email: '',
            },
        };
    },
    watch: {
        showmodal: async function (val) {
            if (val) {
                $('#modalviewcontact').modal('show');
                const response = (await fetchGetContactosProveedor({
                    rut: this.param.rut,
                })) as VersaFetchResponse | false;
                this.array_contactos = [];
                if (response === false) return false;
                if (response.data !== false) this.array_contactos = response.data;
            } else {
                $('#modalviewcontact').modal('hide');
            }
        },
    },
    methods: {
        change_update_modal_contactos: function () {
            this.$emit('accion', { accion: 'closeModal' });
        },
        ChangeStateEditContacto(status = false) {
            this.contacto_select = {
                id: 0,
                nombre: '',
                telefono: '',
                email: '',
                rut_proveedor: this.param.rut,
            };
            this.showEditContacto = status;
        },
        loadEditContacto(item) {
            this.contacto_select = JSON.parse(JSON.stringify(item));
            this.showEditContacto = true;
        },
        editContactoItem(item) {
            const index = this.array_contactos.findIndex(x => x.id === item.id);
            if (index > -1) {
                this.array_contactos[index] = JSON.parse(JSON.stringify(item));
            } else {
                this.array_contactos.push(item);
            }
        },
        async deleteContactoProveedor(id) {
            const result = await Swal.fire({
                title: '¿Estas seguro de eliminar este contacto?',
                text: 'No podras revertir esta acción!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, Eliminar!',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                fetch('/api/deleteContactoProveedor', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id,
                    }),
                })
                    .then(response => {
                        if (validateResponeStatus(response.status)) {
                            return response.json();
                        }
                    })
                    .then(json => {
                        if (json.success == 1) {
                            const index = this.array_contactos.findIndex(x => x.id === id);
                            if (index > -1) {
                                this.array_contactos.splice(index, 1);
                            }
                            Swal.fire('Eliminado!', json.message, 'success');
                        } else {
                            Swal.fire('Error!', json.message, 'error');
                        }
                    })
                    .catch(error => {
                        Swal.fire('Error!', error, 'error');
                    });
            }
        },
    },
    template: html`
        <div id="modalviewcontact" class="modal fade" aria-hidden="true" data-backdrop="static" data-keyboard="false">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <i class="fa fa-friends"></i>
                            Contactos Proveedor: {{ param.nombre }}
                        </h3>

                        <div class="card-tools d-flex">
                            <button
                                type="button"
                                class="btn btn-tool"
                                @click="ChangeStateEditContacto"
                                v-if="!showEditContacto">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button type="button" class="btn btn-tool" @click="change_update_modal_contactos(false)">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <newcontacto
                            :item="contacto_select"
                            @close_new_contacto="ChangeStateEditContacto"
                            @edit_contacto="editContactoItem"
                            v-if="showEditContacto"></newcontacto>
                        <table class="table table-bordered table-hover">
                            <thead>
                                <th>Nombre</th>
                                <th>Telefono</th>
                                <th>Email</th>
                                <th>opciones</th>
                            </thead>
                            <tbody>
                                <tr v-for="item in array_contactos">
                                    <td>{{ item.nombre }}</td>
                                    <td>{{ item.telefono }}</td>
                                    <td>
                                        <a :href="'mailto:'+item.email+'?subject=Contacto a proveedor'">
                                            {{ item.email }}
                                        </a>
                                    </td>
                                    <td>
                                        <button
                                            class="btn btn-success btn-sm"
                                            @click="loadEditContacto(item)"
                                            title="Editar Registro">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button
                                            class="btn btn-danger btn-sm"
                                            @click="deleteContactoProveedor(item.id)"
                                            title="Eliminar Registro">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="modal-footer justify-content-between"></div>
                </div>
            </div>
        </div>
    `,
});
Vue.component('newcontacto', {
    name: 'newcontacto',
    props: {
        item: {
            type: Object,
            default: {},
            required: true,
        },
    },
    methods: {
        close_new_contacto() {
            this.$emit('close_new_contacto', false);
        },
        edit_contacto() {
            const item = this.item;
            fetch('/api/saveContactoProveedor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ item }),
            })
                .then(response => {
                    if (validateResponeStatus(response.status)) {
                        return response.json();
                    }
                })
                .then(json => {
                    if (json.success == 1) {
                        if (item.id == 0) {
                            item.id = json.id;
                        }

                        this.$emit('edit_contacto', this.item);
                        this.close_new_contacto();
                        show_toast(json.title ?? 'Success', json.message, 'success', 'success');
                    } else {
                        show_toast(json.title ?? 'Warning', json.message, 'warning', 'warning');
                    }
                })
                .catch(error => {
                    show_toast('error', error);
                });
        },
    },
    mounted() {
        this.$refs.inputNombre.focus();
    },
    template: html`
        <div class="row justify-content-center">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Nuevo Contacto</h3>
                </div>
                <div class="card-body">
                    <div class="input-group">
                        <div class="input-group-prepend">
                            <span class="input-group-text">Nombre</span>
                        </div>
                        <input type="text" class="form-control" ref="inputNombre" v-model:value="item.nombre" />
                    </div>
                    <div class="input-group">
                        <div class="input-group-prepend">
                            <span class="input-group-text">Telefono</span>
                        </div>
                        <input type="text" class="form-control" v-model:value="item.telefono" />
                    </div>
                    <div class="input-group">
                        <div class="input-group-prepend">
                            <span class="input-group-text">Email</span>
                        </div>
                        <input type="text" class="form-control" v-model:value="item.email" />
                    </div>
                </div>
                <div class="card-footer justify-content-between">
                    <button class="btn btn-success btn-sm" @click="edit_contacto" title="Guardar Registro">
                        <i class="fas fa-save"></i>
                    </button>
                    <button
                        class="btn btn-danger btn-sm float-right"
                        @click="close_new_contacto"
                        title="Cancelar Registro">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `,
});
Vue.component('modalviewcategorias', {
    name: 'modalviewcategorias',
    props: {
        showmodal: {
            type: Boolean,
            default: false,
            required: true,
        },
        param: [],
    },
    watch: {
        showmodal: function (val) {
            if (val) {
                this.getCategoriasProveedor().then(response => {
                    this.array_categorias_proveedor = [];
                    if (response === false) return false;
                    if (response.data !== false) this.array_categorias_proveedor = response.data;
                });
                $('#modalviewcategorias').modal('show');
            } else {
                $('#modalviewcategorias').modal('hide');
            }
        },
    },
    data() {
        return {
            array_categorias_proveedor: [],
            showCategoria: true,
        };
    },
    methods: {
        closeModal() {
            this.$emit('accion', { accion: 'closeModal' });
        },
        async getCategoriasProveedor() {
            const response = await fetch('/api/getCategoriasProveedor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rut: this.param.rut,
                }),
            });
            if (validateResponeStatus(response.status)) {
                return await response.json();
            } else {
                return false;
            }
        },
        showCategorias() {
            this.showCategoria = true;
        },
        addCategoriaProveedor(id, categoria) {
            const search = this.array_categorias_proveedor.findIndex(x => x.id == id);
            if (search > -1) {
                show_toast('Alerta', 'La categoria ya se encuentra asociada', 'warning', 'warning');

                return false;
            }

            fetch('/api/saveCategoriaProveedor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rut: this.param.rut,
                    id,
                    categoria,
                }),
            })
                .then(response => {
                    if (validateResponeStatus(response.status)) {
                        return response.json();
                    }
                })
                .then(json => {
                    if (json.success == 1) {
                        this.array_categorias_proveedor.unshift({
                            id: json.id,
                            descripcion: categoria,
                            rut_proveedor: this.param.rut,
                        });
                        show_toast(json.title ?? 'Success', json.message, 'success', 'success');
                    } else {
                        show_toast(json.title ?? 'Warning', json.message, 'warning', 'warning');
                    }
                })
                .catch(error => {
                    show_toast('error', error);
                });
        },

        async deleteCategoriaProveedor(id) {
            const result = await Swal.fire({
                title: '¿Estas seguro de eliminar esta categoria?',
                text: 'No podras revertir esta acción!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, Eliminar!',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                fetch('/api/deleteCategoriaProveedor', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id,
                    }),
                })
                    .then(response => {
                        if (validateResponeStatus(response.status)) {
                            return response.json();
                        }
                    })
                    .then(json => {
                        if (json.success == 1) {
                            const index = this.array_categorias_proveedor.findIndex(x => x.id === id);
                            if (index > -1) {
                                this.array_categorias_proveedor.splice(index, 1);
                            }
                            Swal.fire('Eliminado!', json.message, 'success');
                        } else {
                            Swal.fire('Error!', json.message, 'error');
                        }
                    })
                    .catch(error => {
                        Swal.fire('Error!', error, 'error');
                    });
            }
        },
    },
    template: html`
        <div
            id="modalviewcategorias"
            class="modal fade"
            aria-hidden="true"
            data-backdrop="static"
            data-keyboard="false">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <i class="fa fa-friends"></i>
                            Categorias Proveedor: {{ param.nombre }}
                        </h3>
                        <div class="card-tools">
                            <!--<button type="button" class="btn btn-tool" @click="showCategorias()">
                                <i class="fas fa-plus"></i>
                            </button>-->
                            <button type="button" class="btn btn-tool" @click="closeModal()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <categorias
                            @add_categoria_proveedor="addCategoriaProveedor"
                            @close_categoria="showCategoria = true"
                            v-if="showCategoria"></categorias>
                        <div class="row">
                            <table class="table table-bordered table-hover">
                                <thead>
                                    <th>Categorias asociadas</th>
                                    <th>opciones</th>
                                </thead>
                                <tbody>
                                    <tr v-for="item in array_categorias_proveedor">
                                        <td>{{ item.descripcion }}</td>
                                        <td>
                                            <button
                                                class="btn btn-danger btn-sm"
                                                @click="deleteCategoriaProveedor(item.id)"
                                                title="Eliminar Registro">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer flex justify-center"></div>
                </div>
            </div>
        </div>
    `,
});
Vue.component('categorias', {
    name: 'categorias',
    data() {
        return {
            array_categorias: [],
            categoria: '',
            id: 0,
            buttonOk: false,
        };
    },
    mounted() {
        this.$refs.inputCategoria.focus();
        this.getCategorias().then(response => {
            if (response === false) return false;
            this.array_categorias = response;
        });
    },
    methods: {
        getCategorias: async function () {
            const response = await fetch('/api/getMasterCategorias', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (validateResponeStatus(response.status)) {
                return await response.json();
            } else {
                return false;
            }
        },
        addCategoriaProveedor() {
            if (this.buttonOk === false) return false;
            this.$emit('add_categoria_proveedor', this.id, this.categoria);
            this.close_categoria();
        },
        close_categoria() {
            this.categoria = '';
            this.$refs.inputCategoria.focus();
        },
        categoriaSeleccionada(event) {
            const index = this.array_categorias.findIndex(
                x => x.descripcion.trim().toUpperCase() === event.target.value.trim().toUpperCase()
            );
            if (index > -1) {
                this.id = this.array_categorias[index].id;
                this.buttonOk = true;
            } else {
                this.id = 0;
                this.buttonOk = false;
            }
        },
    },
    template: html`
        <div class="row">
            <div class="col-11">
                <div class="input-group">
                    <div class="input-group-prepend">
                        <span class="input-group-text">Categorias</span>
                    </div>
                    <div class="input-group-prepend">
                        <input
                            type="text"
                            class="form-control"
                            @input="categoriaSeleccionada"
                            @keyup.enter="addCategoriaProveedor"
                            list="datalist_categorias"
                            ref="inputCategoria"
                            v-model:value="categoria" />
                        <datalist id="datalist_categorias">
                            <option :value="item.descripcion" v-for="item in array_categorias"></option>
                        </datalist>
                    </div>
                    <div class="input-group-prepend">
                        <button
                            class="btn btn-success btn-sm"
                            :disabled="!buttonOk"
                            @click="addCategoriaProveedor"
                            title="Agregar Categoria">
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-1">
                <button class="btn btn-danger btn-md" @click="close_categoria" title="Cancelar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `,
});

Vue.component('uploadFile', {
    components: { newModal },
    props: {
        showModal: {
            type: Boolean,
            default: false,
            required: true,
        },
        item: {
            type: Object,
            required: true,
        },
    },
    setup(props) {
        const showModal = Vue.computed(() => props.showModal);
        const item = Vue.computed(() => props.item);
        const files = Vue.ref([]);

        Vue.watch(showModal, value => {
            if (!value) {
                files.value = [];
            }
        });

        return {
            showModal,
            files,
            item,
        };
    },
    methods: {
        accion(accion) {
            if (accion.accion === 'addFiles') {
                const params = {
                    ...accion,
                    item: this.item,
                };
                this.$emit('accion', params);
                return;
            }
            this.$emit('accion', accion);
        },
    },
    template: html`
        <newModal :showModal="showModal" @accion="accion" idModal="uploadFile" sizeModal="modal-lg">
            <template v-slot:title>Subir Archivo</template>
            <template v-slot:body>
                <dropZone :files="files" :multiple="false" :nfilesMultiple="1" @accion="accion"></dropZone>
            </template>
        </newModal>
    `,
});

Vue.component('item', {
    components: { newModal },
    props: {
        item: {
            type: Object,
        },
        showModal: {
            type: Boolean,
            default: false,
            required: true,
        },
    },
    setup(props) {
        const item = Vue.computed(() => props.item);
        const showModal = Vue.computed(() => props.showModal);

        const itemEditable = Vue.ref({});

        Vue.watch(showModal, value => {
            if (value) {
                itemEditable.value = JSON.parse(JSON.stringify(item.value));
                itemEditable.value.estado = item.value.estado == 1;
            }
        });

        return {
            showModal,
            itemEditable,
        };
    },
    methods: {
        accion(accion) {
            if (accion.accion === 'saveItem') {
                if (!this.validaAntesDeEnviar(accion.item)) {
                    return;
                }
            }

            this.$emit('accion', accion);
        },
        /**
         * @param {String} rut
         */
        obtenerDV(rut) {
            let newRut = rut.toString().replace(/[-.,]/g, '').trim(); // Elimina guiones, puntos y comas en un paso
            if (!/^\d+$/.test(newRut) || Number(newRut) <= 0) {
                // Verifica si es un número válido y positivo
                show_toast(
                    'Alerta',
                    'El valor debe ser un número positivo sin guiones, puntos ni comas',
                    'warning',
                    'warning'
                );
                this.itemEditable.dv = '';
                return false;
            }

            if (Number(newRut) > 99999999) {
                show_toast('Alerta', 'El valor no debe contener digito verificador', 'warning', 'warning');
                //remover el ultimo digito
                newRut = newRut.slice(0, -1);
            }

            this.itemEditable.dv = obtenerDV(newRut); // Asume que esta función calcula correctamente el dígito verificador
            if (this.itemEditable.dv.length > 1) {
                // Esta condición parece ser específica; asegúrate de que es necesaria
                this.itemEditable.dv = '';
                return;
            }
            this.itemEditable.rut = newRut;
        },
        validaAntesDeEnviar(item) {
            if (item.dv === '') {
                show_toast('Alerta', 'Debe ingresar el rut', 'warning', 'warning');
                return false;
            }
            if (item.nombre === '') {
                show_toast('Alerta', 'Debe ingresar el nombre', 'warning', 'warning');
                return false;
            }
            return true;
        },
    },
    template: html`
        <newModal :showModal="showModal" @accion="accion" idModal="item" sizeModal="modal-lg">
            <template v-slot:title>Proveedor</template>
            <template v-slot:body>
                <div class="col col-md-12">
                    <div class="row">
                        <div class="form-group col-4">
                            <label for="rut">Rut</label>
                            <input
                                id="rut"
                                type="text"
                                class="form-control"
                                :disabled="itemEditable.id === ''"
                                @keyup="obtenerDV(itemEditable.rut)"
                                placeholder="Rut"
                                v-model="itemEditable.rut" />
                        </div>
                        <div class="form-group col-2">
                            <label for="dv">DV</label>
                            <input
                                id="dv"
                                type="text"
                                class="form-control"
                                disabled
                                placeholder="dv"
                                v-model="itemEditable.dv" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="nombre">Nombre</label>
                        <input
                            id="nombre"
                            type="text"
                            class="form-control"
                            placeholder="Descripción"
                            required
                            v-model="itemEditable.nombre" />
                    </div>
                    <div class="row">
                        <div class="form-group col-6">
                            <label for="web">Web</label>
                            <input
                                id="web"
                                type="text"
                                class="form-control"
                                placeholder="Web"
                                v-model="itemEditable.web" />
                        </div>
                        <div class="form-group col-6">
                            <label for="telefono">Telefono</label>
                            <input
                                id="telefono"
                                type="text"
                                class="form-control"
                                placeholder="Telefono"
                                v-model="itemEditable.telefono" />
                        </div>
                    </div>
                    <div class="row">
                        <div class="form-group col-6">
                            <label for="asociado">Asociado</label>
                            <input id="asociado" type="date" class="form-control" v-model="itemEditable.asociado" />
                        </div>
                        <div class="form-group col-6">
                            <label for="observacion">Observación</label>
                            <textarea
                                id="observacion"
                                class="form-control"
                                placeholder="Observación"
                                v-model="itemEditable.observacion"></textarea>
                        </div>
                    </div>
                    <div class="form-group">
                        <iCheck
                            id="estado"
                            :checked="itemEditable.estado"
                            :disabled="false"
                            label="Estado"
                            v-model="itemEditable.estado" />
                    </div>
                </div>
            </template>
            <template v-slot:footer>
                <div class="flex justify-between">
                    <button class="btn btn-success" @click="accion({ accion: 'saveItem', item: itemEditable })">
                        Guardar
                    </button>
                    <button class="btn btn-danger" @click="accion({ accion: 'closeModal' })">Cerrar</button>
                </div>
            </template>
        </newModal>
    `,
});
const _appMasterProveedor = new Vue({
    el: '#content',
    delimiters: ['${', '}'],
    data: function () {
        return {
            array_param_data: [],
            array_data: [],

            array_item_proveedor: [],

            array_master: [],
        };
    },
    setup() {
        const otherFilters = Vue.ref('');
        const refreshData = Vue.ref(false);
        const showModalItem = Vue.ref(false);
        const showModalContactos = Vue.ref(false);
        const showModalCategorias = Vue.ref(false);
        const showModalUploadFile = Vue.ref(false);

        const newItem = {
            rut: '',
            dv: '',
            nombre: '',
            web: '',
            telefono: '',
            asociado: '',
            observacion: '',
        };
        const itemSelected = Vue.ref({ ...newItem });

        return {
            newItem,
            itemSelected,
            otherFilters,
            refreshData,
            showModalItem,
            showModalContactos,
            showModalCategorias,
            showModalUploadFile,
        };
    },
    methods: {
        loadNewItem() {
            this.itemSelected = { ...this.newItem };
            this.showModalItem = true;
        },
        load_edit_modal(/** @type {any} */ item) {
            this.itemSelected = { ...item };
            this.showModalItem = true;
        },
        async changeStateReg(id) {
            const json = await versaFetch({
                url: '/api/changeEstadoMaster',
                method: 'POST',
                data: JSON.stringify({
                    tabla: 'tblmaster_proveedor',
                    campo_id: 'rut',
                    id,
                    format: 'string',
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (json.success == 1) {
                show_toast(json.title ?? 'Success', json.message, 'success', 'success');
                this.refreshData = !this.refreshData;
            } else {
                show_toast(json.title ?? 'Warning', json.message, 'warning', 'warning');
            }
        },
        async edit_reg_master(item) {
            this.showModalItem = false;

            let api = '';
            if (item.id === undefined) {
                api = 'newProveedor';
            } else api = 'editProveedor';

            const json = await versaFetch({
                url: `/api/${api}`,
                method: 'POST',
                data: JSON.stringify({
                    data: item,
                    origen: 'master',
                    id: item?.id,
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (json.success == 1) {
                show_toast(json.title ?? 'Success', json.message, 'success', 'success');
                this.refreshData = !this.refreshData;
            } else {
                show_toast(json.title ?? 'Warning', json.message, 'warning', 'warning');
            }
        },
        change_update_modal_contactos(item) {
            this.itemSelected = { ...item };
            this.showModalContactos = true;
        },
        change_update_modal_categorias(item) {
            this.itemSelected = { ...item };
            this.showModalCategorias = true;
        },
        async downloadBaseFull() {
            const response = await versaFetch({
                url: '/api/getMasterProveedorFULL',
                method: 'POST',
            });
            if (response.success === 1) {
                createXlsxFromJson(response.data, 'Proveedores');
            } else {
                versaAlert({
                    title: 'Error',
                    message: 'Error al descargar archivo',
                    type: 'error',
                });
            }
        },
        async deleteDeclaracionFileProveedor(item) {
            const { id_file, archivo, rut } = item;

            const result = await Swal.fire({
                title: '¿Estas seguro de eliminar este archivo?',
                text: 'No podras revertir esta acción!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, Eliminar!',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    url: '/api/deleteDeclaracionFileProveedor',
                    method: 'POST',
                    data: JSON.stringify({ id_file, archivo, rut }),
                    headers: { 'Content-Type': 'application/json' },
                });

                if (response.success === 1) {
                    show_toast('Success', response.message, 'success', 'success');
                    this.refreshData = !this.refreshData;
                } else {
                    show_toast('Error', response.message, 'error', 'error');
                }
            }
        },
        async uploadFile(item) {
            this.showModalUploadFile = false;

            const data = new FormData();
            data.append('file', item.files.file);
            data.append('file_data', JSON.stringify(item.files));
            data.append('rut', item.item.rut);

            const response = await versaFetch({
                url: '/api/saveDeclaracionFileProveedor',
                method: 'POST',
                data,
            });
            if (response.success === 1) {
                show_toast('Success', response.message, 'success', 'success');
                this.refreshData = !this.refreshData;
            } else {
                show_toast('Warning', response.message, 'warning', 'warning');
            }
        },
        pasarella(params) {
            const actions = {
                change_update_modal_contactos: () => {
                    this.change_update_modal_contactos(params.item);
                },
                change_update_modal_categorias: () => {
                    this.change_update_modal_categorias(params.item);
                },
                closeModal: () => {
                    this.showModalContactos = false;
                    this.showModalCategorias = false;
                    this.showModalItem = false;
                    this.showModalUploadFile = false;
                },
                change_update_modal: () => {
                    this.load_edit_modal(params.item);
                },
                saveItem: () => this.edit_reg_master(params.item),
                changeStateReg: () => {
                    const { id } = params.item;
                    this.changeStateReg(id);
                },
                delete_file: () => this.deleteDeclaracionFileProveedor(params.item),
                upload_file: () => {
                    this.showModalUploadFile = true;
                    this.itemSelected = { ...params.item };
                },
                addFiles: () => this.uploadFile(params),
                default: () => {
                    show_toast('Error', 'Acción no definida', 'error', 'error');
                },
            };

            const selectedAction = actions[params.accion] || actions.default;
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
    },
    template: html`
        <div>
            <div class="content-header">
                <div class="container-fluid">
                    <div class="row mb-2">
                        <div class="col-sm-6">
                            <h1 class="m-0 text-dark">Mantenedor de Proveedores</h1>
                        </div>
                        <div class="col-sm-6">
                            <ol class="breadcrumb float-sm-right">
                                <li class="breadcrumb-item">
                                    <a href="/portal">Home</a>
                                </li>
                                <li class="breadcrumb-item">
                                    <a href="/bodega_maestros">Maestros</a>
                                </li>
                                <li class="breadcrumb-item active">Maestro Proveedores</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
            <!-- /.content-header -->

            <!-- Main content -->
            <div class="content">
                <div class="container-fluid">
                    <customTable
                        id="masterProveedores"
                        :externalFilters="otherFilters"
                        :refresh="refreshData"
                        @accion="pasarella"
                        key="masterProveedores"
                        titleTable=""
                        url="/api/getMasterProveedorPaginate">
                        <template v-slot:headerButtons>
                            <button class="btn btn-info" @click="loadNewItem">
                                <i class="fas fa-plus"></i>
                                Agregar Nuevo
                            </button>
                            <button class="btn btn-success" @click="downloadBaseFull">
                                <i class="fas fa-download"></i>
                                Descarga base Full
                            </button>
                        </template>
                    </customTable>

                    <item :item="itemSelected" :showModal="showModalItem" @accion="pasarella"></item>

                    <uploadFile :item="itemSelected" :showModal="showModalUploadFile" @accion="pasarella"></uploadFile>

                    <modalviewcontactos
                        :param="itemSelected"
                        :showmodal="showModalContactos"
                        @accion="pasarella"></modalviewcontactos>

                    <modalviewcategorias
                        :param="itemSelected"
                        :showmodal="showModalCategorias"
                        @accion="pasarella"></modalviewcategorias>
                </div>
            </div>
        </div>
    `,
});

document.addEventListener('click', function (event) {
    pasarella(_appMasterProveedor, event);
});
