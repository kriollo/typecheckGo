import { $dom } from '@/jscontrollers/composables/dom-selector';
import { FALSE, TRUE, show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import loader from '@/jscontrollers/components/loading';
import uploadFileExcel from '@/jscontrollers/components/uploadFileExcel';

import type { AccionData, actionsType } from 'versaTypes';

/* eslint-disable */
const ue = uploadFileExcel;
const ld = loader;
/* eslint-enable */

Vue.component('selectbaseimport', {
    props: {
        array_bases: {
            type: Array,
            required: true,
        },
    },
    setup(props, { emit }) {
        const arrayBases = Vue.computed(() => props.array_bases);
        const showModal = Vue.ref(false);
        const baseSelected = Vue.ref('');

        Vue.watch(baseSelected, value => {
            if (value !== '') {
                emit('accion', {
                    accion: 'load_structure_base',
                    baseSelected: value,
                });
            }
        });

        return { arrayBases, showModal, baseSelected };
    },
    methods: {
        accion: function (e) {
            const actions = {
                closeModalUploadFileExcel: () => {
                    this.showModal = false;
                },
                loadExcel: () => {
                    e.baseSelected = this.baseSelected;
                    this.$emit('accion', e);
                    this.showModal = false;
                },
            };
            const fn = actions[e.accion];
            if (typeof fn === 'function') {
                fn();
            }
        },
    },
    template: html`
        <div class="input-group">
            <select id="select_base" class="form-control" v-model="baseSelected">
                <option selected value="">Seleccione una tabla</option>
                <option :value="base.tabla" v-for="base in arrayBases">{{ base.descripcion }}</option>
            </select>
            <div class="input-group-append">
                <button
                    type="button"
                    class="btn btn-primary"
                    :disabled="baseSelected === ''"
                    @click="showModal = true"
                    title="Cargar archivo">
                    <i class="fas fa-upload"></i>
                </button>
            </div>
            <uploadFileExcel :showModal="showModal" @accion="accion" from="cargaMasiva" />
        </div>
    `,
});

const _appCargaMasiva = new Vue({
    el: '.content-wrapper',
    delimiters: ['${', '}'],
    data: function () {
        return {
            array_bases: [],
            array_structure: [],
            array_data: [],
            save: false,
            dataExcelLoaded: [],
        };
    },
    setup() {
        const loading = Vue.ref(false);

        return { loading };
    },
    mounted: function () {
        versaFetch({
            url: '/api/getTablasCargaMasiva',
            method: 'POST',
        }).then(response => {
            this.array_bases = response.map(({ tabla, descripcion }) => ({
                tabla,
                descripcion,
            }));
        });
    },
    methods: {
        async load_structure_base(e) {
            if (!e.baseSelected || e.baseSelected === '') return;

            this.array_data = [];
            this.array_structure = [];
            this.save = FALSE;

            const response = await versaFetch({
                url: '/api/getStructureTables',
                method: 'POST',
                data: JSON.stringify({ tabla: e.baseSelected }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.success == 1) {
                this.array_structure = response.message;
            }
        },
        async load_data_base(e) {
            this.save = FALSE;
            this.array_data = e.data;
            this.dataExcelLoaded = [];
            if (e.data.length > 0) {
                this.dataExcelLoaded = e;
                this.save = TRUE;
            }
        },
        async save_base() {
            this.loading = true;
            const hasDuplicates = this.checkBaseDuplicados();
            if (hasDuplicates) {
                show_toast('Atención', 'No se permiten duplicados en la base de datos', 'warning', 'warning');
                this.loading = false;
                return;
            }
            const result = await Swal.fire({
                icon: 'question',
                title: 'Atención',
                text: 'Está seguro desea efectuar la siguientes carga?',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (!result.isConfirmed) return;

            const $eraseAll = $dom('#erase_all') as HTMLInputElement;

            const FormD = new FormData();
            FormD.append('file', this.dataExcelLoaded.files.file);
            FormD.append('hoja', this.dataExcelLoaded.hoja);
            FormD.append('tabla', this.dataExcelLoaded.baseSelected);
            FormD.append('borrar', $eraseAll.checked ? '1' : '0');
            FormD.append('encabezado', this.dataExcelLoaded.primeraLinea ? '1' : '0');
            FormD.append('structure', JSON.stringify(this.array_structure));
            FormD.append('data', JSON.stringify(this.array_data));

            const json = await versaFetch({
                url: '/api/saveBase',
                method: 'POST',
                data: FormD,
            });
            if (json.success == 1) {
                show_toast(json.title, json.message, 'success', 'success');
            } else {
                show_toast(json.title, json.message, 'warning', 'warning');
            }
            this.loading = false;
        },
        checkBaseDuplicados(): boolean {
            // Encontrar todos los índices de las llaves primarias
            const fieldsPRI = this.array_structure
                .map((field, index) => (field.COLUMN_KEY === 'PRI' ? index : -1))
                .filter(index => index !== -1);

            // Si no hay llaves primarias, no podemos verificar duplicados
            if (fieldsPRI.length === 0) {
                return false;
            }

            // Recorrer la data para determinar si hay duplicados
            const data = this.array_data;
            const uniqueValues = new Set();

            for (const row of data) {
                // Crear una clave compuesta concatenando los valores de todas las llaves primarias
                // Usamos un separador improbable '|^|' para evitar colisiones
                const compositeKey = fieldsPRI.map(index => row[index]).join('|^|');

                if (uniqueValues.has(compositeKey)) {
                    return true;
                }

                uniqueValues.add(compositeKey);
            }

            return false;
        },
        accion(accion: AccionData) {
            const actions: actionsType = {
                load_structure_base: () => this.load_structure_base(accion),
                loadExcel: () => this.load_data_base(accion),
            };

            const fn = actions[accion.accion];
            if (typeof fn === 'function') {
                fn();
            }
        },
    },
});
