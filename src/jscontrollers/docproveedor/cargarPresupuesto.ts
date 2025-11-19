import { getAnno, versaAlert, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import newModal from '@/jscontrollers/components/newModal.js';

import iRadio from '@/jscontrollers/components/iRadio.js';
import loader from '@/jscontrollers/components/loading.js';
import modal from '@/jscontrollers/components/modal.js';
import uploadFileExcel from '@/jscontrollers/components/uploadFileExcel.js';
/* eslint-disable */
const ux = uploadFileExcel;
const ir = iRadio;
const md = modal;
const l = loader;
/* eslint-enable */

Vue.component('ppal', {
    props: {},
    setup() {
        const itemSelected = Vue.ref(null);
        const optionsRadio = [
            { id: 1, value: 'presupuesto', label: 'Presupuesto' },
            { id: 2, value: 'proyecto', label: 'Proyecto' },
            { id: 3, value: 'proyeccion', label: 'Proyección' },
        ];

        const showModalStructura = Vue.ref(false);
        const setShowModalStructura = val => {
            showModalStructura.value = val;
        };
        Vue.provide('showModalStructura', {
            showModalStructura: Vue.readonly(showModalStructura),
            setShowModalStructura,
        });

        const anno = Vue.ref(getAnno());
        Vue.provide('anno', anno);

        const showLoadExcel = Vue.ref(false);
        const setShowLoadExcel = val => {
            showLoadExcel.value = val;
        };
        Vue.provide('showLoadExcel', {
            showLoadExcel: Vue.readonly(showLoadExcel),
            setShowLoadExcel,
        });
        const structure = Vue.ref([]);
        const loadStructure = async base => {
            structure.value = [];
            const response = await versaFetch({
                url: '/api/getStructureTables',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ tabla: base }),
            });
            if (response.success === 1) {
                structure.value = response.message;
            }
        };
        Vue.provide('structure', structure);

        const data = Vue.ref({});
        const setData = val => {
            data.value = val;
        };
        Vue.provide('data', {
            data: Vue.readonly(data),
            setData,
        });

        Vue.watch(itemSelected, async val => {
            if (val) {
                await loadStructure(val);
                anno.value = getAnno();
                setData({ hoja: '', files: [], primeraLinea: false, data: [] });
            }
        });

        return {
            itemSelected,
            optionsRadio,
            showModalStructura,
            showLoadExcel,
            setShowLoadExcel,
            setShowModalStructura,
            setData,
        };
    },
    methods: {
        accion(accion) {
            const actions = {
                closeModal: () => this.setShowModalStructura(false),
                closeModalUploadFileExcel: () => this.setShowLoadExcel(false),
                loadExcel: () => this.loadExcel(accion),
            };

            const fn = actions[accion.accion] || (() => {});
            if (typeof fn === 'function') {
                fn();
            }
        },
        async loadExcel(accion) {
            const { hoja, files, primeraLinea, data } = accion;
            await this.setShowLoadExcel(false);
            await this.setData({
                hoja,
                files,
                primeraLinea,
                data,
            });
        },
    },
    template: html`
        <div class="col col-md-12">
            <div class="card card-outline card-blue">
                <div class="card-header">
                    <iRadio
                        :horizontalList="true"
                        :options="optionsRadio"
                        iClass="icheck-primary"
                        key="base"
                        label="Base a Cargar"
                        v-model="itemSelected" />
                </div>
                <div class="card-body">
                    <viewStructura :base="itemSelected" :showModal="showModalStructura" @accion="accion" />

                    <uploadFileExcel
                        :showModal="showLoadExcel"
                        @accion="accion"
                        from="uploadFileExcel"
                        key="uploadFileExcel" />
                    <div class="row">
                        <div class="col col-md-3">
                            <cardCargaBase :base="itemSelected" @accion="accion" v-if="itemSelected" />
                        </div>
                        <div class="col col-md-9" v-if="itemSelected">
                            <previewData :base="itemSelected" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});

Vue.component('cardCargaBase', {
    props: {
        base: {
            type: String,
            default: '',
        },
    },
    setup(props) {
        const base = Vue.computed(() => props.base);
        const { setShowModalStructura } = Vue.inject('showModalStructura');
        const { setShowLoadExcel } = Vue.inject('showLoadExcel');

        const anno = Vue.inject('anno');
        return {
            base,
            setShowModalStructura,
            anno,
            setShowLoadExcel,
        };
    },
    methods: {
        showStructure() {
            this.setShowModalStructura(true);
        },
        showLoadExcel() {
            this.setShowLoadExcel(true);
        },
    },
    template: html`
        <div class="card">
            <div class="card-header flex justify-center">
                <h3 class="card-title">
                    <strong>Cargar {{ base }}</strong>
                </h3>
            </div>
            <div class="card-body">
                <div class="flex justify-center">
                    <div class="form-group">
                        <label for="anno">Año</label>
                        <input id="anno" type="number" class="form-control" v-model="anno" />
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <div class="flex justify-center gap-x-1">
                    <button class="btn btn-info" @click="showStructure">
                        <i class="fa fa-eye" aria-hidden="true"></i>
                        Ver Estructura
                    </button>
                    <button type="button" class="btn btn-primary" @click="showLoadExcel">
                        <i class="fa fa-upload" aria-hidden="true"></i>
                        Cargar {{base}}
                    </button>
                </div>
            </div>
        </div>
    `,
});

Vue.component('previewData', {
    props: {
        base: {
            type: String,
            default: '',
        },
    },
    setup(props) {
        const structure = Vue.inject('structure');
        const { data } = Vue.inject('data');
        const anno = Vue.inject('anno');
        const base = Vue.computed(() => props.base);
        const dataPreview = Vue.ref([]);
        const showLoader = Vue.ref(false);

        Vue.watch(
            data,
            val => {
                if (val.data) dataPreview.value = val.data.slice(0, 3);
            },
            { deep: true }
        );

        return {
            structure,
            data,
            anno,
            base,
            dataPreview,
            showLoader,
        };
    },
    methods: {
        async saveBase() {
            this.showLoader = true;
            const { files, hoja, primeraLinea } = this.data;
            const FormD = new FormData();

            FormD.append('file', files.file);
            FormD.append('hoja', hoja);
            FormD.append('anno', this.anno);
            FormD.append('encabezado', primeraLinea ? '1' : '0');
            FormD.append('structure', JSON.stringify(this.structure));

            let url = '';
            switch (this.base) {
                case 'presupuesto':
                    url = '/api/saveBasePresupuesto';
                    break;
                case 'proyecto':
                    url = '/api/saveBaseProyectos';
                    break;
                case 'proyeccion':
                    url = '/api/saveBaseProyeccion';
                    break;
            }

            const response = await versaFetch({
                url,
                method: 'POST',
                data: FormD,
            });

            if (response.success === 1) {
                versaAlert({
                    title: 'Correcto',
                    message: response.message,
                    type: 'success',
                });
            } else {
                versaAlert({
                    title: 'Error',
                    message: response.message,
                    type: 'error',
                });
            }
            this.showLoader = false;
        },
    },
    template: html`
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">
                    Vista Previa primeros 3 registros - {{base}} ({{data.data?.length}} registros)
                </h3>
                <div class="card-tools">
                    <button
                        type="button"
                        class="btn btn-success"
                        :disabled="data.length === 0"
                        @click="saveBase"
                        v-if="!showLoader">
                        <i class="fas fa-save"></i>
                        Guardar base
                    </button>
                    <loader v-if="showLoader" />
                </div>
            </div>
            <div class="card-body table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <th v-for="value in structure">{{value.COLUMN_NAME}}</th>
                    </thead>
                    <tbody>
                        <tr v-for="value in dataPreview">
                            <td v-for="(col, index) in structure">{{value[index]}}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,
});

Vue.component('viewStructura', {
    components: { newModal },
    props: {
        showModal: {
            type: Boolean,
            default: false,
        },
        base: {
            type: String,
            default: '',
        },
    },
    emits: ['accion'],
    setup(props) {
        const showModal = Vue.computed(() => props.showModal);
        const base = Vue.computed(() => props.base);
        const data = Vue.inject('structure');

        return {
            showModal,
            base,
            data,
        };
    },
    methods: {
        accion(accion) {
            this.$emit('accion', accion);
        },
    },
    template: html`
        <newModal
            :draggable.bool="true"
            :escClose.bool="true"
            :showModal="showModal"
            @accion="accion"
            idModal="modalviewStructura"
            key="viewStructura"
            sizeModal="modal-lg">
            <template v-slot:title>Estructura {{base}}</template>
            <template v-slot:body>
                <table class="table table-bordered">
                    <thead>
                        <th>Campo</th>
                        <th>Clave</th>
                    </thead>
                    <tbody>
                        <tr v-for="value in data">
                            <td>{{value.COLUMN_NAME}} - {{value.COLUMN_TYPE}}</td>
                            <td>{{value.COLUMN_KEY}}</td>
                        </tr>
                    </tbody>
                </table>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-secondary" @click="$emit('accion', { accion: 'closeModal' })">
                    Cerrar
                </button>
            </template>
        </newModal>
    `,
});

const _appCarga = new Vue({
    el: '#ppal',
    delimiters: ['${', '}'],
});
