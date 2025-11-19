import { versaAlert, versaFetch } from '@/jscontrollers/composables/utils';
import { fetchGetDataByCodigoActivo } from '@/jscontrollers/geda/fechGeda';
import { useGEDAStore } from '@/jscontrollers/stores/dependencias';
import { usePPalStore } from '@/jscontrollers/usePPalStore';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import newModal from '@/jscontrollers/components/newModal';

import inputDataList from '@/jscontrollers/components/inputDataList';
import uploadFileExcel from '@/jscontrollers/components/uploadFileExcel';
/* eslint-disable */
const uf = uploadFileExcel;
const idl = inputDataList;
/* eslint-enable */

const { defineComponent, computed, ref, watch, reactive } = Vue;

export default defineComponent({
    name: 'trasladoActivo',
    components: { newModal },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const showModal = computed(() => props.showModal);
        const codigo_activo = ref('');
        const observacion = ref('');
        const informaTo = reactive({
            name: '',
            email: '',
        });
        const dependencia_to = reactive({
            codigo: '',
            desc_dependencia: '',
        });

        const data = ref([]);
        const showModalUploadFile = ref(false);
        const dependencias = ref([]);

        const usersToInformar = ref([]);

        usePPalStore.dispatch('loadBaseParticipantes').then((/** @type {Array} */ response) => {
            usersToInformar.value = response;
        });

        watch(showModal, val => {
            if (val) {
                dependencias.value = computed(() => useGEDAStore.state.dependencias);
            } else {
                data.value = [];
                codigo_activo.value = '';
                observacion.value = '';
                informaTo.value = { name: '', email: '' };
                dependencia_to.value = { codigo: '', desc_dependencia: '' };
            }
        });

        return {
            showModal: computed(() => props.showModal),
            codigo_activo,
            data,
            observacion,
            showModalUploadFile,
            informaTo,
            usersToInformar,
            dependencias,
            dependencia_to,
        };
    },
    methods: {
        accion(accion) {
            const actions = {
                closeModalUploadFileExcel: () => {
                    this.showModalUploadFile = false;
                },
                loadExcel: () => {
                    this.showModalUploadFile = false;
                    this.loadDataExcel(accion.data);
                },
                default: () => {
                    this.$emit('accion', accion);
                },
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        async loadDataExcel(/** @type {Array} */ data) {
            this.data = [];
            const promises = data.map(async item => {
                const result = await fetchGetDataByCodigoActivo('/api/geda/getDataByCodigoActivo', item[0]);
                if (result.success === 1) {
                    this.data.push(result.data);
                }
            });

            await Promise.all(promises);

            this.$nextTick(() => {
                this.$refs.codigo_activo_input.focus();
                this.$refs.codigo_activo_input.select();
            });

            await versaAlert({
                type: 'success',
                title: 'Carga Finalizada',
                message: `Se cargaron ${this.data.length} activos`,
            });
        },
        searchActivo() {
            const result = this.data.find(item => item.codigo_activo === this.codigo_activo);
            if (result !== undefined) {
                versaAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'Activo ya ingresado',
                });
                return;
            }

            fetchGetDataByCodigoActivo('/api/geda/getDataByCodigoActivo', this.codigo_activo).then(
                /** @type {{ success: Number; data: Array; }} */ response => {
                    if (response.success === 1) {
                        this.data.push(response.data);
                        this.codigo_activo = '';
                    } else {
                        versaAlert({
                            type: 'error',
                            title: 'Error',
                            message: response.message,
                            callback: () => {
                                this.$nextTick(() => {
                                    this.$refs.codigo_activo_input.focus();
                                    this.$refs.codigo_activo_input.select();
                                });
                            },
                        });
                    }
                    //esperar a que se renderize la tabla
                    this.$nextTick(() => {
                        this.$refs.codigo_activo_input.focus();
                        this.$refs.codigo_activo_input.select();
                    });
                }
            );
        },
        removeItem(/** @type {Object} */ item) {
            this.data = this.data.filter(value => value !== item);
        },
        async saveTrasladoActivo() {
            if (this.data.length === 0) {
                versaAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'Debe agregar activos',
                });
                return;
            }

            if (this.informaTo === '') {
                versaAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'Debe informar a',
                });
                return;
            }
            if (this.dependencia_to === '') {
                versaAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'Debe seleccionar la dependencia a la que se traslada',
                });
                return;
            }

            const result = await Swal.fire({
                title: '¿Está seguro de trasladar los activos?',
                showCancelButton: true,
                confirmButtonText: 'Si',
                cancelButtonText: 'No',
                icon: 'question',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    method: 'POST',
                    url: '/api/GEDA/saveMovimientoActivo',
                    headers: { 'content-type': 'application/json' },
                    data: JSON.stringify({
                        observacion: this.observacion,
                        informaTo: this.informaTo,
                        data: this.data,
                        tipo_movimiento: 'Traslado',
                        dependencia_to: this.dependencia_to,
                    }),
                });

                versaAlert({
                    type: response.success === 1 ? 'success' : 'error',
                    title: response.success === 1 ? 'Correcto' : 'Error',
                    message: response.message,
                    callback: () => {
                        if (response.success === 1) {
                            this.data = [];
                            this.observacion = '';
                            this.informaTo = '';
                            this.dependencia_to = '';

                            this.$emit('accion', { accion: 'refresh-table' });
                            this.$emit('accion', { accion: 'closeModal' });
                        }
                    },
                });
            }
        },
    },
    template: html`
        <newModal :showModal="showModal" @accion="accion" idModal="Traslado" key="Traslado" size="max-w-7xl">
            <template v-slot:title>Registrar Traslado de Activos</template>
            <template v-slot:body>
                <uploadFileExcel
                    :showModal="showModalUploadFile"
                    @accion="accion"
                    from="uploadFileExcelTraslado"
                    key="uploadFileExcelTraslado" />

                <div class="col col-md-12">
                    <div class="row">
                        <div class="col col-md-3">
                            <div class="form-group">
                                <inputDataList
                                    id="InformaTo_traslado"
                                    :fieldsReturn="{ idField:'email', descripcionField:'name'}"
                                    :list="usersToInformar"
                                    :msgItem="['name']"
                                    :value="{ idField:informaTo.email, descripcionField: informaTo.name}"
                                    @changeDataList="informaTo.email = $event.idField;informaTo.name=$event.descripcionField"
                                    itemValueOption="email"
                                    key="InformaTo"
                                    label="Informar a" />
                            </div>
                        </div>
                        <div class="col col-md-4">
                            <div class="form-group">
                                <label for="observacion_traslado">Observación</label>
                                <textarea
                                    id="observacion_traslado"
                                    class="form-control"
                                    v-model="observacion"></textarea>
                            </div>
                        </div>
                        <div class="col col-md-5">
                            <div class="form-group">
                                <inputDataList
                                    id="dependencias_traslado"
                                    :fieldsReturn="{ idField:'codigo', descripcionField:'desc_dependencia'}"
                                    :list="dependencias"
                                    :msgItem="['desc_campus','desc_edificio','desc_piso','desc_dependencia']"
                                    :value="{ idField:dependencia_to.codigo, descripcionField: dependencia_to.desc_dependencia}"
                                    @changeDataList="dependencia_to.codigo = $event.idField;dependencia_to.desc_dependencia=$event.descripcionField"
                                    itemValueOption="codigo"
                                    key="dependencias_traslado"
                                    label="Dependencia a la que se traslada" />
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col col-md-4">
                            <label for="codigo_activo_traslado">Código Activo</label>
                            <div class="input-group-append">
                                <input
                                    id="codigo_activo_traslado"
                                    type="text"
                                    class="form-control"
                                    @click="$refs.codigo_activo_input.select();"
                                    @keyup.enter="searchActivo"
                                    autofocus
                                    ref="codigo_activo_input"
                                    v-model="codigo_activo" />
                                <div class="input-group-addon flex">
                                    <button type="button" class="btn btn-primary" @click="searchActivo">
                                        <i class="fas fa-search"></i>
                                    </button>
                                    <button
                                        type="button"
                                        class="btn btn-primary"
                                        @click="showModalUploadFile = true"
                                        title="Cargar Archivo">
                                        <i class="fas fa-upload"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col col-md-12">
                            <table class="table table-bordered table-striped">
                                <thead>
                                    <tr>
                                        <th>Acción</th>
                                        <th>Código Activo</th>
                                        <th>Serie</th>
                                        <th>Código SAP</th>
                                        <th>Descripción</th>
                                        <th>Campus</th>
                                        <th>Edificio</th>
                                        <th>Piso</th>
                                        <th>Dependencia</th>
                                        <th>Propiedad</th>
                                        <th>Categoría</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(item, index) in data">
                                        <td>
                                            <button type="button" class="btn btn-danger" @click="removeItem(item)">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                        <td>{{ item.codigo_activo }}</td>
                                        <td>{{ item.serie }}</td>
                                        <td>{{ item.cod_sap }}</td>
                                        <td>{{ item.desc_codigo }}</td>
                                        <td>{{ item.desc_campus }}</td>
                                        <td>{{ item.desc_edificio }}</td>
                                        <td>{{ item.desc_piso }}</td>
                                        <td>{{ item.desc_dependencia }}</td>
                                        <td>{{ item.propiedad }}</td>
                                        <td>{{ item.categoria }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-secondary" @click="accion({ accion: 'closeModal' })">
                    Cerrar
                </button>
                <button type="button" class="btn btn-success" @click="saveTrasladoActivo" v-if="data.length > 0">
                    <i class="fas fa-save"></i>
                    Guardar
                </button>
            </template>
        </newModal>
    `,
});
