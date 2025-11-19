import { show_toast, versaAlert, versaFetch } from '@/jscontrollers/composables/utils';
import { usePPalStore } from '@/jscontrollers/usePPalStore.js';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm.js';

import { inputDataListEditable } from '@/jscontrollers/components/inputDataListEditable';
import inputEditable from '@/jscontrollers/components/inputEditable';
import newModal from '@/jscontrollers/components/newModal';
import { AccionData, actionsType } from 'versaTypes';
/* eslint-disable */
const ie = inputEditable;
const idie = inputDataListEditable;
/* eslint-enable */

export const comparativo = {
    components: { newModal },
    emits: ['accion'],
    props: {
        files: {
            type: Array,
            default: [],
        },
        showModal: {
            type: Boolean,
            default: false,
        },
        origen: {
            type: String,
            default: 'Pendientes',
        },
    },
    setup(props) {
        const fileHESMIGO = Vue.ref([]);
        const socNumber = Vue.ref(0);
        const files = Vue.computed(() => {
            const groupBy = (array, key) =>
                array.reduce((result, currentValue) => {
                    const keyValue = currentValue[key];
                    const descriptiveKey = `${keyValue}`; // Aquí puedes hacer la clave más descriptiva
                    result[descriptiveKey] = result[descriptiveKey] || [];
                    result[descriptiveKey].push(currentValue);
                    return result;
                }, {});
            const file = groupBy(props.files, 'tipoarchivo');

            if (file['HESMIGO'] != undefined) {
                fileHESMIGO.value = file['HESMIGO'];
                delete file['HESMIGO'];
            }

            return file;
        });

        const finalFiles = Vue.ref([]);

        Vue.watch(files, () => {
            if (Object.keys(files.value).length === 0 || files.value.Presupuestos[0] == undefined) return;

            finalFiles.value = JSON.parse(JSON.stringify(files.value));

            socNumber.value = files.value.Presupuestos[0].soc_encabezado_id;
        });

        const owner_user = Vue.computed(() => usePPalStore.state.owner_user);
        const showModalLocal = Vue.computed(() => props.showModal);
        const updateHESMIGO = (id, hesmigo) =>
            versaFetch({
                method: 'POST',
                url: '/api/updateHESMIGO',
                data: JSON.stringify({ id, hesmigo }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }).then((/** @type {Object} */ response) => response);

        const updateMontoPresupuesto = async (/** @type {Object} */ params) => {
            const response = await versaFetch({
                url: '/api/updateMontoPresupuesto',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id: params.id,
                    monto_solicitado: params.monto_solicitado,
                    id_encabezado_soc: params.id_encabezado_soc,
                }),
            });
            return response;
        };

        const proveedor = Vue.inject('proveedor');
        const loadProveedorEditable = async item => {
            if (owner_user.value.rol != 1) return;
            item.proveedor_editable = '1';
        };

        return {
            finalFiles,
            showModalLocal,
            fileHESMIGO,
            owner_user,
            updateHESMIGO,
            socNumber,
            updateMontoPresupuesto,
            loadProveedorEditable,
            proveedor,
        };
    },
    data() {
        return {
            typeFiles: usePPalStore.state.FileTypeValid,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion, item = null) {
            const actions = {
                cancelUpdate: () => {
                    if (accion.from == 'Presupuestos') this.desHabilitaEditMontoPresupuesto(accion.id, accion.from);
                    else this.desHabilitaEditHes(accion.id, accion.from);
                },
                updateData: () => {
                    if (accion.from == 'Presupuestos') this.saveEditMontoPresupuesto(accion);
                    else this.saveEditHes(accion);
                },
                default: () => {
                    this.$emit('accion', accion);
                },
                cancelInputDataListEditable: () => {
                    item.proveedor_editable = 0;
                },
                updateInputDataListEditable: async () => {
                    const response = await versaFetch({
                        url: '/api/updateProveedorSOC',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        data: JSON.stringify({
                            id: item.id,
                            rut: accion.idField,
                        }),
                    });
                    if (response.success === 1) {
                        item.rutproveedor = accion.idField;
                        item.nombreproveedor = accion.descripcionField;
                        item.proveedor_editable = 0;

                        versaAlert({
                            title: 'Exito',
                            message: response.message,
                            type: 'success',
                        });

                        this.$emit('accion', {
                            accion: 'loadSOCByStateComponente',
                        });

                        return;
                    }
                    versaAlert({
                        title: 'Error',
                        message: response.message,
                        type: 'error',
                    });
                },
                deleteHesMigo: () => this.deleteHesMigo(accion.id),
            };
            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        getType(file) {
            const type = this.typeFiles.find(item => item.type === file.type);
            if (type == undefined) return 'fas fa-file fa-2x text-secondary';
            return `${type?.color} ${type?.icon}`;
        },
        getItemsFiles(key) {
            return this.finalFiles[key];
        },
        getFilesHESMIGObyID(id) {
            //filtrar por id donde la ruta contiene el id asi /id/
            return this.fileHESMIGO.filter(item => item.ruta.includes(`/${id}/`));
        },
        habilitaEditHes(item, key) {
            if (this.owner_user.rol != 1) return;
            if (item.hes_migo == null) return;

            this.finalFiles[key].forEach(element => {
                if (element.id != item.id) {
                    element.editable = 0;
                }
            });
            item.editable = 1;
        },
        desHabilitaEditHes(id, key) {
            this.finalFiles[key].forEach(element => {
                if (element.id == id) {
                    element.editable = 0;
                }
            });
        },
        async saveEditHes(item) {
            const response = await this.updateHESMIGO(item.id, item.newData);
            if (response.success === 1) {
                versaAlert({
                    title: 'Exito',
                    message: response.message,
                    type: 'success',
                    callback: () => {
                        this.finalFiles[item.from].forEach(element => {
                            if (element.id == item.id) {
                                element.hes_migo = item.newData;
                            }
                        });
                    },
                });
            } else {
                versaAlert({
                    title: 'Error',
                    message: response.message,
                    type: 'error',
                });
            }
            this.desHabilitaEditHes(item.id, item.from);
        },
        getTotalHesMigo() {
            return this.finalFiles['HES / MIGO'].reduce((acc, item) => acc + Number(item.monto_solicitado), 0);
        },
        desHabilitaEditMontoPresupuesto(id, key) {
            this.finalFiles[key].forEach(element => {
                if (element.id == id) {
                    element.monto_editable = 0;
                }
            });
        },
        async saveEditMontoPresupuesto(item) {
            if (
                isNaN(item.newData) ||
                item.newData == '' ||
                item.newData == null ||
                item.newData == undefined ||
                item.newData <= 0
            ) {
                versaAlert({
                    title: 'Error',
                    message: 'El monto debe ser un número, no puede estar vacío o ser menor o igual a 0',
                    type: 'error',
                });
                return;
            }

            const response = await this.updateMontoPresupuesto({
                id: item.id,
                monto_solicitado: item.newData,
            });
            if (response.success === 1) {
                versaAlert({
                    title: 'Exito',
                    message: response.message,
                    type: 'success',
                    callback: () => {
                        this.finalFiles[item.from].forEach(element => {
                            if (element.id == item.id) {
                                element.monto = item.newData;
                                element.monto_editable = 0;
                            }
                        });
                        this.$emit('accion', {
                            accion: 'loadSOCByStateComponente',
                        });
                    },
                });
            }
        },
        async deleteHesMigo(id) {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: '¡No podrás revertir esto!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, borrarlo!',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    url: '/api/deleteHESMIGO',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({ id, socId: this.socNumber }),
                });
                if (response.success === 1) {
                    versaAlert({
                        title: 'Exito',
                        message: response.message,
                        type: 'success',
                        callback: () => {
                            this.finalFiles['HES / MIGO'] = this.finalFiles['HES / MIGO'].filter(item => item.id != id);

                            this.$emit('accion', {
                                accion: 'loadSOCByStateComponente',
                            });
                        },
                    });
                } else {
                    versaAlert({
                        title: 'Error',
                        message: response.message,
                        type: 'error',
                    });
                }
            }
        },
    },
    template: html`
        <newModal :idModal="origen+'_viewFilesModal'" :showModal="showModalLocal" @accion="accion" size="max-w-7xl">
            <template v-slot:title>Archivos Asociados SOC N°: {{ socNumber }}</template>
            <template v-slot:body>
                <div class="col col-md-12">
                    <image src="img/loading.gif" v-if="showModalLocal" />
                    <fieldset v-for="tipoFile, key in finalFiles">
                        <legend>{{ key }}</legend>
                        <div class="row">
                            <table class="table table-bordered" v-if="key == 'Presupuestos'">
                                <thead>
                                    <tr>
                                        <th>Archivo</th>
                                        <th>Proveedor</th>
                                        <th>Monto Presupuesto</th>
                                        <th>Seleccionado</th>
                                        <th>Observación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in getItemsFiles(key)">
                                        <td :class="item.seleccionado == 1 ? 'bg-selected':''">
                                            <i :class="getType(item)+' fa-2x'"></i>
                                            <a :href="item.ruta" download target="_blank">{{ item.archivo }}</a>
                                        </td>
                                        <td :class="item.seleccionado == 1 ? 'bg-selected':''">
                                            <div v-if="item.proveedor_editable == '1'">
                                                <inputDataListEditable
                                                    id="editProveedor"
                                                    label="Selecciona Proveedor"
                                                    :list="proveedor"
                                                    :msgItem="['nombre']"
                                                    itemValueOption="rut"
                                                    :fieldsReturn="{idField: 'rut', descripcionField: 'nombre'}"
                                                    :value="{ idField:item.rutproveedor, descripcionField: item.nombreproveedor}"
                                                    @accion="accion($event,item)" />
                                            </div>
                                            <div v-else @dblclick="loadProveedorEditable(item)">
                                                <i
                                                    style="font-size:1.2rem"
                                                    :class="item.val_asociado == 1?'bi bi-patch-check-fill text-primary':'bi bi-patch-check text-warning'"></i>
                                                {{ item.nombreproveedor }}
                                            </div>
                                        </td>
                                        <td class="text-right" :class="item.seleccionado == 1 ? 'bg-selected':''">
                                            <div v-if="item.monto_editable == '1'">
                                                <inputEditable
                                                    :data="item.monto"
                                                    :from="key"
                                                    :id="Number(item.id)"
                                                    @accion="accion"
                                                    field="monto" />
                                            </div>
                                            <div v-else @dblclick="item.monto_editable = '1' && owner_user.rol == '1'">
                                                {{ item.monto | format_number_n_decimal(0) }}
                                            </div>
                                        </td>
                                        <td class="text-center" :class="item.seleccionado == 1 ? 'bg-selected':''">
                                            <i class="fas fa-check-circle" v-if="item.seleccionado == 1"></i>
                                            <i class="fas fa-times-circle text-danger" v-else></i>
                                        </td>
                                        <td :class="item.seleccionado == 1 ? 'bg-selected':''">
                                            {{ item.observacion }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="table table-bordered" v-if="key == 'Orden de Compra'">
                                <thead>
                                    <tr>
                                        <th>Archivo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in getItemsFiles(key)">
                                        <td>
                                            <i :class="getType(item)+' fa-2x'"></i>
                                            <a :href="item.ruta" download target="_blank">{{ item.archivo }}</a>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table class="table table-bordered" v-if="key == 'HES / MIGO'">
                                <thead>
                                    <tr>
                                        <th>HES / MIGO</th>
                                        <th>Fecha Solicitud</th>
                                        <th>Monto Solicitado</th>
                                        <th>Solicitante</th>
                                        <th>Observación</th>
                                        <th>Factura Asociada</th>
                                        <th>Documento Asociados</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(item, index) in getItemsFiles(key)">
                                        <td @dblclick="habilitaEditHes(item,key)">
                                            <div
                                                v-if="item.editable == 1 && owner_user.rol == 1 && item.hes_migo != null">
                                                <inputEditable
                                                    :data="item.hes_migo"
                                                    :from="key"
                                                    :id="Number(item.id)"
                                                    @accion="accion"
                                                    field="hes_migo" />
                                            </div>
                                            <div v-else>
                                                <button
                                                    v-if="owner_user.rol == 1 && index === getItemsFiles(key).length - 1"
                                                    class="btn btn-xs btn-danger"
                                                    @click="accion({accion: 'deleteHesMigo', id: item.id})">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                                {{ item.hes_migo }}
                                            </div>
                                        </td>
                                        <td>{{ item.fecha_request }}</td>
                                        <td class="text-right">
                                            {{ item.monto_solicitado | format_number_n_decimal(0) }}
                                        </td>
                                        <td>{{ item.nombre_solicitante }}</td>
                                        <td>{{ item.observacion }}</td>
                                        <td>
                                            <a :href="item.ruta" download target="_blank" v-if="item.ruta != null">
                                                <i :class="getType(item)+' fa-2x'"></i>
                                                {{ item.factura_asociada }}
                                            </a>
                                            <span v-else>{{ item.factura_asociada }}</span>
                                        </td>
                                        <td class="d-flex flex-column p-0 px-1">
                                            <a
                                                :href="file.ruta"
                                                download
                                                target="_blank"
                                                v-for="file in getFilesHESMIGObyID(item.id)">
                                                <i :class="getType(file)+' fa-2x'"></i>
                                                {{ file.archivo }}
                                            </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="font-bold" colspan="2">Total</td>
                                        <td class="text-right">{{getTotalHesMigo()| format_number_n_decimal(0)}}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </fieldset>
                </div>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-default" @click="accion({accion: 'closeModal'})">Cerrar</button>
            </template>
        </newModal>
    `,
};

export const participantes = {
    components: { newModal },
    emits: ['accion'],
    props: {
        participantes: {
            type: Array,
            default: [],
        },
        showModal: {
            type: Boolean,
            default: false,
        },
        origen: {
            type: String,
            default: 'Pendientes',
        },
    },
    setup(props, { emit: $emit }) {
        const participantes = Vue.computed(() => props.participantes);

        const socNumber = Vue.ref(0);

        Vue.watch(participantes, () => {
            if (participantes.value.length > 0) {
                socNumber.value = participantes.value[0].soc_encabezado_id;
            }
        });

        const showLoading = Vue.computed(() => usePPalStore.state.showLoader);

        const showModalLocal = Vue.computed(() => props.showModal);

        const owner_user = Vue.computed(() => usePPalStore.state.owner_user);

        const eliminarParticipante = async (id: number, idSoc: number) => {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: '¡No podrás revertir esto!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, borrarlo!',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    url: '/api/eliminarParticipanteSOC',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({ id }),
                });
                if (response.success === 1) {
                    show_toast('Éxito', response.message, 'success', 'success');
                    $emit('accion', {
                        accion: 'reloadParticipantes',
                        idSoc,
                    });
                }
            }
        };

        const accion = (accion: AccionData) => {
            const actions: actionsType = {
                eliminaParticipante: () => eliminarParticipante(accion.item.id, accion.item.soc_encabezado_id),
                default: () => {
                    $emit('accion', accion);
                },
            };
            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        };

        return {
            participantes,
            showModalLocal,
            showLoading,
            owner_user,
            socNumber,
            accion,
        };
    },
    methods: {
        ...Vuex.mapMutations(['setShowLoader']),
    },
    template: html`
        <newModal
            :idModal="origen+'_viewAprobatorsModal'"
            :showModal="showModalLocal"
            @accion="accion"
            size="max-w-6xl">
            <template v-slot:title>Paricipantes SOC N°: {{ socNumber }}</template>
            <template v-slot:body>
                <table class="table table-bordered table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Aprueba</th>
                            <th>Finaliza</th>
                            <th class="text-center">Estado Aprobación</th>
                            <th>fecha Aprobación</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr :key="item.id" v-for="item in participantes">
                            <td>{{ item.nombre }} &lt;{{ item.email }}&gt;</td>
                            <td>{{ item.aprueba == 1 ? "Si":"No" }}</td>
                            <td>{{ item.finaliza == 1 ? "Si":"No" }}</td>
                            <td class="text-center">
                                <span class="badge badge-warning" v-if="item.aprueba == 1 && item.estado_aprueba == 1">
                                    Pendiente
                                </span>
                                <span class="badge badge-success" v-if="item.aprueba == 1 && item.estado_aprueba == 2">
                                    Aprobado
                                </span>
                                <span class="badge badge-danger" v-if="item.aprueba == 1 && item.estado_aprueba == 3">
                                    Rechazado
                                </span>
                            </td>
                            <td class="flex justify-between items-center">
                                <span>{{ item.fecha_aprueba }}</span>
                                <button
                                    class="btn btn-xs btn-danger ml-2"
                                    v-if="owner_user.rol == 1"
                                    @click="accion({accion: 'eliminaParticipante', item: item})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </template>
            <template v-slot:footer>
                <div class="flex justify-between">
                    <button type="button" class="btn btn-default" @click="accion({accion: 'closeModal'})">
                        Cerrar
                    </button>
                    <button
                        type="button"
                        class="btn btn-primary"
                        @click="accion({accion: 'newParticipante'})"
                        v-if="owner_user.rol == 1">
                        <i class="fas fa-user-plus"></i>
                        Agregar Participante
                    </button>
                </div>
            </template>
        </newModal>
    `,
};

export const cgestion = {
    components: { newModal },
    props: {
        cgestion: {
            type: Array,
            default: [],
        },
        showModal: {
            type: Boolean,
            default: false,
        },
        id: {
            type: String,
            default: 'cgestion',
        },
    },
    setup(props) {
        const cgestion = Vue.computed(() => props.cgestion);
        const showModal = Vue.computed(() => props.showModal);
        const socNumber = Vue.ref(0);

        Vue.watch(cgestion, () => {
            if (cgestion.value.length > 0) {
                socNumber.value = cgestion.value[0].soc_encabezado_id;
            }
        });

        return {
            cgestion,
            showModal,
            socNumber,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                default: () => {
                    this.$emit('accion', accion);
                },
            };
            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
    },
    template: html`
        <newModal
            :idModal="id+'_cgestion_viewModal'"
            :key="id+'_cgestion_viewModal'"
            :showModal="showModal"
            @accion="accion">
            <template v-slot:title>Distribución por Centro de Gestión SOC N°: {{ socNumber }}</template>
            <template v-slot:body>
                <table class="table table-bordered table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Centro de Gestión</th>
                            <th>Descripción</th>
                            <th>Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr :key="item.id" v-for="item in cgestion">
                            <td>{{ item.codigo }}</td>
                            <td>{{ item.descripcion }}</td>
                            <td
                                class="text-right
                                ">
                                {{ item.monto | format_number_n_decimal(0) }}
                            </td>
                        </tr>
                        <tr>
                            <td class="font-bold" colspan="2">Total</td>
                            <td
                                class="text-right
                                ">
                                {{ cgestion.reduce((acc, item) => acc + Number(item.monto), 0) |
                                format_number_n_decimal(0) }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-default" @click="accion({accion: 'closeModal'})">Cerrar</button>
            </template>
        </newModal>
    `,
};
