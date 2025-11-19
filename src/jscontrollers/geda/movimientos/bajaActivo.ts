import { versaAlert, versaFetch } from '@/jscontrollers/composables/utils';
import { fetchGetDataByCodigoActivo, fetchGetMotivoBaja } from '@/jscontrollers/geda/fechGeda';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import newModal from '@/jscontrollers/components/newModal';

import uploadFileExcel from '@/jscontrollers/components/uploadFileExcel';
/* eslint-disable */
const uf = uploadFileExcel;
/* eslint-enable */

const { defineComponent, ref, computed, watch } = Vue;

export default defineComponent({
    name: 'bajaActivo',
    components: { newModal },
    emits: ['accion'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const showModalBaja = computed(() => props.showModal);
        const codigo_activo = ref('');
        const observacion = ref('');
        const motivoBaja = ref('');
        const data = ref([]);

        const optionsBaja = ref([]);

        const showModalUploadFile = ref(false);
        watch(showModalBaja, val => {
            if (val) {
                fetchGetMotivoBaja('/api/GEDA/getMasterMotivoBaja').then(response => {
                    optionsBaja.value = response;
                });
            } else {
                data.value = [];
                codigo_activo.value = '';
                observacion.value = '';
                motivoBaja.value = '';
            }
        });

        return {
            codigo_activo,
            data,
            optionsBaja,
            observacion,
            motivoBaja,
            showModalUploadFile,
            showModalBaja,
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
        async saveBajaActivo() {
            if (this.data.length === 0) {
                versaAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'Debe agregar activos',
                });
                return;
            }

            if (this.motivoBaja === '') {
                versaAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'Debe ingresar el motivo de baja',
                });
                return;
            }

            const result = await Swal.fire({
                title: '¿Está seguro de dar de baja los activos?',
                showCancelButton: true,
                confirmButtonText: 'Si',
                cancelButtonText: 'No',
                icon: 'question',
            });
            if (result.isConfirmed) {
                versaFetch({
                    method: 'POST',
                    url: '/api/GEDA/saveMovimientoActivo',
                    headers: { 'content-type': 'application/json' },
                    data: JSON.stringify({
                        observacion: this.observacion,
                        motivoBaja: this.motivoBaja,
                        data: this.data,
                        tipo_movimiento: 'Baja',
                    }),
                }).then(
                    /** @type {{ success: Number; messge: string; }} */ response => {
                        versaAlert({
                            type: response.success === 1 ? 'success' : 'error',
                            title: response.success === 1 ? 'Correcto' : 'Error',
                            message: response.message,
                            callback: () => {
                                if (response.success === 1) {
                                    this.data = [];
                                    this.observacion = '';
                                    this.motivoBaja = '';

                                    this.$emit('accion', {
                                        accion: 'refresh-table',
                                    });
                                    this.$emit('accion', {
                                        accion: 'closeModal',
                                    });
                                }
                            },
                        });
                    }
                );
            }
        },
    },
    template: html`
        <newModal :showModal="showModalBaja" @accion="accion" idModal="Baja" key="Baja" size="max-w-7xl">
            <template v-slot:title>Registrar Baja de Activos</template>
            <template v-slot:body>
                <uploadFileExcel
                    :showModal="showModalUploadFile"
                    @accion="accion"
                    from="uploadFileExcelBaja"
                    key="uploadFileExcelBaja" />

                <div class="col col-md-12">
                    <div class="row">
                        <div class="col col-md-3">
                            <div class="form-group">
                                <label for="motivoBaja_baja">Motivo Baja</label>
                                <select id="motivoBaja_baja" class="form-control" v-model="motivoBaja">
                                    <option :value="item.id" v-for="item in optionsBaja">{{ item.descripcion }}</option>
                                </select>
                            </div>
                        </div>
                        <div class="col col-md-4">
                            <div class="form-group">
                                <label for="observacion_baja">Observación</label>
                                <textarea id="observacion_baja" class="form-control" v-model="observacion"></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col col-md-4">
                            <label for="codigo_activo_baja">Código Activo</label>
                            <div class="input-group-append">
                                <input
                                    id="codigo_activo_baja"
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
                <button type="button" class="btn btn-success" @click="saveBajaActivo" v-if="data.length > 0">
                    <i class="fas fa-save"></i>
                    Guardar
                </button>
            </template>
        </newModal>
    `,
});
