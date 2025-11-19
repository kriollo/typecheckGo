import iCheck from '@/jscontrollers/components/iCheck.js';
import { versaFetch } from '@/jscontrollers/composables/utils';
import fileTypes from '@/jscontrollers/stores/fileTypes.js';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm.js';
import { utils, writeFile } from 'P@/vendor/plugins/xlsx/xlsx.full.min.esm.js';

import loader from '@/jscontrollers/components/loading.js';
/* eslint-disable */
const l = loader;
const ic = iCheck;
/* eslint-enable */

const { computed, ref, watch, watchEffect, reactive } = Vue;

const customTable = {
    emits: ['accion'],
    props: {
        id: {
            type: String,
            default: 'table',
        },
        titleTable: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            required: true,
        },
        refresh: {
            type: Boolean,
            required: false,
        },
        externalFilters: {
            type: String,
            required: false,
            default: '',
        },
        totalRegisters: {
            type: Number,
            required: false,
            default: 0,
        },
        fieldOrder: {
            type: String,
            required: false,
            default: 'id',
        },
        showExcel: {
            type: Boolean,
            required: false,
            default: true,
        },
        perPage: {
            type: Number,
            required: false,
            default: 25,
        },
    },
    model: {
        prop: 'totalRegisters',
        event: 'update:totalRegisters',
    },
    setup(props, { emit: $emit }) {
        const msg = ref('Cargando...');
        const peerPageItems = reactive({
            options: [5, 10, 25, 50, 100],
        });

        const refresh = computed(() => props.refresh);
        const externalFilters = computed(() => props.externalFilters);
        const url = computed(() => props.url);
        const fieldOrder = computed(() => props.fieldOrder);
        const showExcel = computed(() => props.showExcel);
        const perPage = computed(() => props.perPage);

        const data = reactive({
            data: [],
            columns: [],
            colspan: [],
            meta: {
                total: 0,
                per_page: perPage.value,
                page: 1,
                total_pages: 0,
                filter: '',
                from: 0,
                to: 0,
                order: [`${fieldOrder.value}`, 'asc'],
            },
        });

        const loading = ref(false);
        const loaderOverTable = ref(false);
        const checkAllValue = ref(false);

        const loadData = async () => {
            if (url.value === '') {
                msg.value = 'No hay registros para mostrar';
                return;
            }
            loaderOverTable.value = true;
            const page = new URLSearchParams(url.value).get('page') ?? data.meta.page;
            const per_page = new URLSearchParams(url.value).get('per_page') ?? data.meta.per_page;
            const filter = new URLSearchParams(url.value).get('filter') ?? data.meta.filter;
            const order = new URLSearchParams(url.value).get('order') ?? data.meta.order;

            checkAllValue.value = false;
            await versaFetch({
                url: `${url.value}?page=${page}&per_page=${per_page}&filter=${filter}&order=${order}&externalFilters=${externalFilters.value}`,
                method: 'POST',
            })
                .then(response => {
                    if (response.success === 1) {
                        data.data = response.data;
                        data.columns = response.columns;
                        data.colspan = response.colspan ?? [];

                        data.meta.total = response.meta.total;
                        data.meta.total_pages = response.meta.total_pages;
                        data.meta.from = response.meta.from;
                        data.meta.to = response.meta.to;
                        data.meta.filter = response.meta.filter;

                        if (data.data.length === 0) {
                            msg.value = 'No hay registros para mostrar';
                        }
                    } else {
                        msg.value = response.message;
                    }
                    loaderOverTable.value = false;
                })
                .catch(error => {
                    msg.value = error;
                    loaderOverTable.value = false;
                });
        };

        const loadAllData = async () => {
            if (url.value === '') {
                msg.value = 'No hay registros para mostrar';
                return;
            }
            loading.value = true;
            const filter = new URLSearchParams(url.value).get('filter') ?? data.meta.filter;
            const order = new URLSearchParams(url.value).get('order') ?? data.meta.order;

            await versaFetch({
                url: `${url.value}?page=1&per_page=${data.meta.total}&filter=${filter}&order=${order}&externalFilters=${externalFilters.value}`,
                method: 'POST',
            }).then(response => {
                if (response.success === 1) {
                    const worksheet = utils.json_to_sheet(response.data);
                    const workbook = utils.book_new();
                    utils.book_append_sheet(workbook, worksheet, 'Sheet1');

                    writeFile(workbook, `${props.titleTable.replace(/ /g, '_')}.xlsx`);
                }
                loading.value = false;
            });
        };

        watch(
            refresh,
            () => {
                loadData();
            },
            { immediate: true }
        );

        watchEffect(() => {
            $emit('update:totalRegisters', data.meta.total ?? 0);
        });

        const flagCheckAll = ref(true);

        watch(checkAllValue, () => {
            if (flagCheckAll.value === false) {
                flagCheckAll.value = true;
                return;
            }
            const field = data.columns.find(item => item.type === 'checkbox');
            if (!field) return;
            data.data.forEach(element => {
                element[field.field] = checkAllValue.value;
                $emit('accion', { item: element, accion: 'returnCheck' });
            });
        });

        const emitirCheck = item => {
            flagCheckAll.value = false;
            $emit('accion', { item, accion: 'returnCheck' });
            const field = data.columns.find(item => item.type === 'checkbox');
            if (!field) return;
            const allChecked = data.data.every(element => element[field.field]);
            checkAllValue.value = allChecked;
        };

        return {
            idTable: computed(() => props.id),
            titleTable: computed(() => props.titleTable),
            peerPageItems,
            data,
            loadData,
            loadAllData,
            loading,
            loaderOverTable,
            msg,
            checkAllValue,
            emitirCheck,
            showExcel,
        };
    },
    methods: {
        accion({ item, accion }) {
            this.$emit('accion', { item, accion });
        },
        getParams() {
            const url = new URL(this.url);
            const params = new URLSearchParams(url.search);

            params.set('page', this.data.meta.page);
            params.set('per_page', this.data.meta.per_page);
            params.set('filter', this.data.meta.filter);

            url.search = params.toString();

            // cambiar la url sin recargar la pagina
            window.history.pushState({}, '', url);
            this.loadData();
        },
        setPerPage() {
            this.loadData();
        },
        setFilter() {
            this.data.meta.page = 1;

            this.loadData();
        },
        setOrder(field, order) {
            this.data.meta.page = 1;

            if (this.data.meta.order[0] !== field) {
                order = 'asc';
            }

            this.data.meta.order = [field, order];
            this.loadData();
        },
        changePage(page) {
            if (page === 'siguiente') {
                if (this.data.meta.page < this.data.meta.total_pages) {
                    page = parseInt(this.data.meta.page) + 1;
                } else {
                    return;
                }
            }
            if (page === 'anterior') {
                if (this.data.meta.page > 1) {
                    page = parseInt(this.data.meta.page) - 1;
                } else {
                    return;
                }
            }

            this.data.meta.page = page;

            this.loadData();
        },
        exportExcelSheet() {
            this.loading = true;
            const worksheet = utils.json_to_sheet(this.data.data);
            const workbook = utils.book_new();
            utils.book_append_sheet(workbook, worksheet, 'Sheet1');

            writeFile(workbook, `${this.titleTable.replace(/ /g, '_')}_pagina_${this.data.meta.page}.xlsx`);
            this.loading = false;
        },
        exportExcelAll() {
            this.loadAllData();
        },
        getFileTypeIcon(type) {
            const fileExt = fileTypes.data().fileTypes.find(item => item.type === type);
            return fileExt ? `${fileExt.icon} ${fileExt.color}` : 'fa fa-file';
        },
    },
    computed: {
        getLimitPages() {
            const limit = 3;
            const total_pages = this.data.meta.total_pages;
            const page = this.data.meta.page;
            const from = page - limit;
            const to = page + limit;

            if (from < 1) {
                if (total_pages < limit * 2) {
                    const arr = Array.from({ length: total_pages }, (_, i) => i + 1);
                    return arr;
                }
                const arr = Array.from({ length: limit * 2 }, (_, i) => i + 1);
                return arr;
            }

            if (to > total_pages) {
                if (total_pages < limit * 2) {
                    const arr = Array.from({ length: total_pages }, (_, i) => i + 1);
                    return arr;
                }
                const arr = Array.from({ length: limit * 2 }, (_, i) => total_pages - i);
                return arr.reverse();
            }

            const arr = Array.from({ length: limit * 2 }, (_, i) => from + i);
            return arr;
        },
    },
    template: html`
        <div class="card table-responsive-md">
            <div class="card-header">
                <div>
                    <h2 class="text-dark" v-html="titleTable"></h2>
                </div>
                <div class="card-tools">
                    <slot name="headerButtons"></slot>
                </div>
            </div>
            <div class="card-header">
                <div class="d-flex justify-content-between w-full">
                    <div class="d-flex align-center align-items-center">
                        <span class="text-gray-500 pr-1">Mostrar</span>
                        <select
                            class="form-control col-5 px-1"
                            :id="'selectPerPage_'+idTable"
                            @change="setPerPage"
                            title="Seleccionar cantidad de registros por pagina"
                            v-model="data.meta.per_page">
                            <option :key="item" :value="item" v-for="item in peerPageItems.options">{{ item }}</option>
                        </select>
                        <span class="text-gray-500 pl-1">Filas</span>
                    </div>
                    <div v-if="showExcel" class="d-flex align-items-center justify-content-center dropdown">
                        <button
                            id="dropdownMenuButton"
                            type="button"
                            class="btn btn-file btn-secondary dropdown-toggle"
                            :disabled=" loading ? true : false"
                            aria-expanded="false"
                            aria-haspopup="true"
                            data-toggle="dropdown"
                            title="Exportar a Excel">
                            <i class="fa fa-file-excel"></i>
                            Excel
                        </button>
                        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                            <li class="dropdown-item cursor-pointer dropdown-item-hover" @click="exportExcelSheet">
                                Exportar Pagina
                            </li>
                            <li class="dropdown-item cursor-pointer dropdown-item-hover" @click="exportExcelAll">
                                Exportar Todo
                            </li>
                        </ul>
                        <span class="loader" v-if="loading"></span>
                    </div>
                    <div>
                        <div class="input-group">
                            <input
                                type="text"
                                class="form-control"
                                :id="'txtFilter_'+idTable"
                                @keyup.enter="setFilter"
                                placeholder="Ingrese y presione 'Enter' para buscar"
                                v-model="data.meta.filter" />
                            <div class="input-group-append">
                                <span class="input-group-text cursor-pointer" @click="setFilter">
                                    <i class="fas fa-search"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card-body p-0 table-responsive">
                <div class="absolute top-[50%] left-[50%] transform-translate[-50%, -50%]">
                    <span class="loader-arrow" v-if="loaderOverTable"></span>
                    <!---->
                </div>
                <table
                    class="table table-bordered table-striped  dark:bg-[#343a40]"
                    :class="loaderOverTable ? 'table-secondary':''">
                    <thead>
                        <!-- validar si existe la propiedad colspan -->
                        <tr>
                            <th :colspan="cols.col" v-for="cols in data.colspan">
                                <div class="flex justify-center items-center gap-2">
                                    <span>{{ cols.title }}</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <thead>
                        <tr>
                            <th scope="col" v-for="col in data.columns">
                                <div class="flex gap-2 justify-between">
                                    <button
                                        class="btn btn-flat"
                                        @click="setOrder(col.field, data.meta.order[1] === 'asc' ? 'desc':'asc')"
                                        title="Ordenar"
                                        v-if="col.type !== 'actions' && col.type !== 'file' && col.type !== 'checkbox'">
                                        <i
                                            :class="data.meta.order[0] === col.field && data.meta.order[1] === 'asc' ? 'fa fa-sort-up':'fa fa-sort-down'"></i>
                                    </button>
                                    <div v-if="col.type === 'checkbox'">
                                        <iCheck :label="col.title" :id="col.field" v-model="checkAllValue" />
                                    </div>
                                    <span v-else>{{ col.title }}</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="text-center" v-if="data.data.length === 0">
                            <td :colspan="data.columns.length">
                                <span class="text-xl">{{msg}}</span>
                            </td>
                        </tr>
                        <tr :key="row.id" v-for="row,index in data.data">
                            <td :key="col.field" v-for="col in data.columns">
                                <!--status-->
                                <div class="text-center" v-if="col.type === 'status'">
                                    <span
                                        :class="row[col.field] == '1' || row[col.field] == 'activo' ? 'badge badge-success':'badge badge-danger'">
                                        {{ row[col.field] == '1' || row[col.field] == 'activo' ?
                                        'Activado':'desactivado' }}
                                    </span>
                                </div>
                                <!--actions-->
                                <div class="flex justify-content-center gap-2" v-else-if="col.type === 'actions'">
                                    <div v-for="action in col.buttons">
                                        <loader
                                            v-if="action.loader && row[action.loader['field']] === action.loader['value']" />
                                        <div v-else>
                                            <button
                                                class="btn btn-default hover:bg-gray-300"
                                                :class="action.class"
                                                :disabled="loaderOverTable"
                                                :key="action.id"
                                                :title="action.title"
                                                @click="accion({item: row, accion: action.action})"
                                                v-if="action.condition_value == row[action.condition]"
                                                :id="action.valueId ? action.valueId+'_'+row[action.valueId]+'_'+action.action : ''">
                                                <i :class="action.icon"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <!--currency-->
                                <div class="text-right" v-else-if="col.type === 'currency' || col.type === 'money'">
                                    {{ row[col.field] | currency }}
                                </div>
                                <!--files-->
                                <div class="text-center" v-else-if="col.type === 'file'">
                                    <div class="pb-2 text-center">
                                        <a
                                            class="btn btn-default"
                                            :href="row[col.file['path']]"
                                            :title="row[col.file['archivo']]"
                                            target="_blank"
                                            v-if="row[col.file['id']] !== null">
                                            <i :class="getFileTypeIcon(row[col.file['type']])"></i>
                                            {{ row[col.file['archivo']] }}
                                        </a>
                                    </div>
                                    <div class="d-flex justify-content-between gap-2" v-if="col.file['editable']">
                                        <button
                                            class="btn btn-default hover:bg-gray-300 "
                                            :class="action.class"
                                            :disabled="loaderOverTable"
                                            :key="action.id"
                                            :title="action.title"
                                            @click="accion({item: row, accion: action.action})"
                                            v-for="action in col.buttons"
                                            v-if="action.condition_value == row[action.condition]">
                                            <i :class="action.icon"></i>
                                        </button>
                                    </div>
                                </div>
                                <!--checkbox-->
                                <div class="text-center" v-else-if="col.type === 'checkbox'">
                                    <iCheck
                                        label=""
                                        :id="col.field +'_'+ index"
                                        v-model="row[col.field]"
                                        @change="emitirCheck(row)" />
                                </div>
                                <!--progress el % ya viene calculado-->
                                <div class="w-full px-2 py-1" v-else-if="col.type === 'progress'">
                                    <div class="flex-col flex justify-center items-center mb-1">
                                        <p
                                            v-if="row[col.valueAditional] !== undefined && row[col.valueAditional] !== null"
                                            class="text-sm text-gray-500 dark:text-gray-400">
                                            {{ row[col.valueAditional] | currency }}
                                        </p>
                                    </div>
                                    <div
                                        class="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors duration-300">
                                        <div
                                            class="h-full rounded-full transition-all duration-500 ease-out"
                                            :class="row[col.field] > 95 ? 'bg-gradient-to-r from-red-600 to-red-700 dark:from-red-500 dark:to-red-600 animate-pulse' :
                                                    row[col.field] >= 75 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-400 dark:to-yellow-500' :
                                                    row[col.field] >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500' :
                                                    row[col.field] >= 25 ? 'bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500' :
                                                    'bg-gradient-to-r from-green-500 to-red-600 dark:from-green-400 dark:to-green-500'"
                                            :style="{ width: (row[col.field] > 100 ? 100 : row[col.field]) + '%' }"
                                            role="progressbar"
                                            :aria-valuenow="row[col.field]"
                                            style="box-shadow: 0 0 8px currentColor;"></div>
                                    </div>
                                    <div class="flex-col flex justify-center items-center mb-1">
                                        <span
                                            class="text-xs font-semibold transition-colors duration-300"
                                            :class="row[col.field] > 98 ? 'text-red-600 dark:text-red-400 font-bold' :
                                                    row[col.field] >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
                                                    row[col.field] >= 50 ? 'text-blue-600 dark:text-blue-400' :
                                                    row[col.field] >= 25 ? 'text-green-600 dark:text-green-400' :
                                                    'text-green-600 dark:text-green-400'">
                                            {{ row[col.field] | format_number_n_decimal(2) }}%
                                        </span>
                                    </div>
                                </div>
                                <!--progressring el % ya viene calculado-->
                                <div
                                    class="text-center flex-col flex justify-center items-center py-1"
                                    v-else-if="col.type === 'progressring'">
                                    <p
                                        v-if="row[col.valueAditional] !== undefined && row[col.valueAditional] !== null"
                                        class="text-sm text-gray-500 dark:text-gray-400">
                                        {{ row[col.valueAditional] | currency }}
                                    </p>
                                    <div
                                        class="relative w-12 h-12 hover:scale-110 transition-transform duration-200"
                                        :class="row[col.field] > 100 ? 'animate-pulse' : ''">
                                        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                            <!-- Background circle -->
                                            <circle
                                                class="text-gray-200 dark:text-gray-700 stroke-current transition-colors duration-300"
                                                stroke-width="10"
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="transparent"></circle>
                                            <!-- Progress circle with gradient effect -->
                                            <circle
                                                class="stroke-current transition-all duration-500 ease-in-out"
                                                :class="row[col.field] > 98 ? 'text-red-600 dark:text-red-500' :
                                                        row[col.field] >= 75 ? 'text-yellow-500 dark:text-yellow-400' :
                                                        row[col.field] >= 50 ? 'text-blue-500 dark:text-blue-400' :
                                                        row[col.field] >= 25 ? 'text-green-500 dark:text-green-400' :
                                                        'text-green-500 dark:text-green-400'"
                                                stroke-width="10"
                                                stroke-linecap="round"
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="transparent"
                                                stroke-dasharray="251.2"
                                                :stroke-dashoffset="'calc(251.2 - (251.2 * '+(row[col.field] > 100 ? 100 : row[col.field])+') / 100)'"
                                                style="filter: drop-shadow(0 0 2px currentColor);"></circle>
                                        </svg>
                                        <!-- Center text with better styling -->
                                        <div class="absolute inset-0 flex items-center justify-center">
                                            <span
                                                class="text-[10px] font-semibold transition-colors duration-300"
                                                :class="row[col.field] > 100 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-800 dark:text-gray-100'">
                                                {{ row[col.field] | format_number_n_decimal }}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <!--links-->
                                <div class="text-center" v-else-if="col.type === 'link'">
                                    <a
                                        @click="accion({item: row, accion: col.config.action})"
                                        class="text-blue-600 hover:underline cursor-pointer"
                                        target="_blank"
                                        rel="noopener noreferrer">
                                        <span v-if="col.config.type === 'currency' || col.config.type === 'money'">
                                            {{ row[col.field] | currency }}
                                        </span>
                                        <span v-else>{{ row[col.field] }}</span>
                                    </a>
                                </div>

                                <!--others-->
                                <div v-else>{{ row[col.field] }}</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="card-footer">
                <div class=" d-flex justify-content-between align-content-center">
                    <div>
                        Mostrando
                        <span class="text-bold">{{ data.meta.from }}</span>
                        a
                        <span class="text-bold">{{ data.meta.to }}</span>
                        de
                        <span class="text-bold">{{ data.meta.total }}</span>
                        registros
                    </div>
                    <div class="float-right">
                        <ul class="pagination pagination-sm m-0 ">
                            <li class="page-item">
                                <a
                                    class="page-link"
                                    :class="1 == data.meta.page ? 'cursor-not-allowed':'cursor-pointer'"
                                    @click="changePage('anterior')">
                                    Anterior
                                </a>
                            </li>

                            <li class="page-item" v-if="getLimitPages[0] > 1">
                                <a class="page-link cursor-pointer" @click="changePage(1)">1</a>
                            </li>

                            <li class="page-item" v-if="getLimitPages[0] > 1">
                                <a class="page-link cursor-not-allowed">...</a>
                            </li>

                            <li
                                class="page-item cursor-pointer"
                                :class="data.meta.page === page ? 'active':''"
                                :key="page"
                                v-for="page in getLimitPages">
                                <a class="page-link" @click="changePage(page)">{{ page }}</a>
                            </li>

                            <li class="page-item" v-if="data.meta.page < data.meta.total_pages ">
                                <a class="page-link cursor-not-allowed">...</a>
                            </li>
                            <li
                                class="page-item"
                                v-if="data.meta.page < data.meta.total_pages && getLimitPages[getLimitPages.length-1] != data.meta.total_pages">
                                <a class="page-link cursor-pointer" @click="changePage(data.meta.total_pages)">
                                    {{ data.meta.total_pages }}
                                </a>
                            </li>

                            <li class="page-item">
                                <a
                                    class="page-link"
                                    :class="data.meta.total_pages <= data.meta.page || data.meta.total_pages == undefined ? 'cursor-not-allowed':'cursor-pointer'"
                                    @click="changePage('siguiente')">
                                    Siguiente
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `,
};

Vue.component('customTable', customTable);

export default {
    name: 'customTable',
    components: {
        customTable,
    },
};
