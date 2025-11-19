import { $dom } from '@/jscontrollers/composables/dom-selector';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { ref, computed, watch, onMounted, onBeforeUnmount, defineComponent } = Vue;

export default defineComponent({
    name: 'inputDataListMobile',
    emits: ['changeDataList'],
    props: {
        id: {
            type: String,
            required: true,
        },
        label: {
            type: String,
            required: true,
            default: 'Seleccionar',
        },
        list: {
            type: Array,
            required: true,
            default: () => [],
        },
        msgItem: {
            type: Array,
            required: false,
            default: () => [],
        },
        itemValueOption: {
            type: String,
            required: false,
            default: 'id',
        },
        fieldsReturn: {
            type: Object,
            required: false,
            default: () => ({ idField: 'id', descripcionField: 'label' }),
        },
        value: {
            type: Object,
            required: false,
            default: () => ({ idField: '', descripcionField: '' }),
        },
        required: {
            type: Boolean,
            required: false,
            default: false,
        },
        disabled: {
            type: Boolean,
            required: false,
            default: false,
        },
        placeholder: {
            type: String,
            required: false,
            default: 'Buscar...',
        },
        nextFocus: {
            type: String,
            required: false,
            default: '',
        },
    },
    setup(props, { emit }) {
        const search = ref('');
        const filtered = ref([]);
        const open = ref(false);
        const blurTimeout = ref(null);
        const idField = ref('');
        const descripcionField = ref('');
        const selectedItem = ref(null);
        const showFilter = ref(false);
        const keyboardHeight = ref(0);
        const viewportHeight = ref(window.innerHeight);

        // props
        const id = computed(() => props.id);
        const label = computed(() => props.label);
        const required = computed(() => props.required);
        const disabled = computed(() => props.disabled);
        const placeholder = computed(() => props.placeholder);
        const msgItem = computed(() => props.msgItem);
        const fieldsReturn = computed(() => props.fieldsReturn);
        const value = computed(() => props.value);
        const list = computed(() => props.list);
        const nextFocus = computed(() => props.nextFocus);

        // Computed properties
        const filteredOptions = computed(() => {
            if (!search.value) return processedList.value;

            const term = search.value.toLowerCase();
            return processedList.value.filter(item => {
                const searchField = msgItem.value.map(field => item[field]).join(' - ');
                if (msgItem.value.length === 1) {
                    return String(item[msgItem.value[0]]).toLowerCase().includes(term);
                }
                if (msgItem.value.length > 1) {
                    return msgItem.value.some(field => {
                        return String(item[field]).toLowerCase().includes(term);
                    });
                }
                // Fallback for when msgItem is empty
                return String(searchField).toLowerCase().includes(term);
            });
        });

        const processedList = computed(() => {
            if (!list.value || list.value.length === 0) return [];

            if (msgItem.value.length === 1) {
                return JSON.parse(JSON.stringify(list.value));
            } else {
                return list.value.map(item => {
                    const newItem = { ...item };
                    newItem.label = calculateItemLabel(item);
                    return newItem;
                });
            }
        });

        const dropdownStyle = computed(() => ({
            maxHeight: open.value ? '50vh' : 'auto',
        }));

        // Methods
        const calculateItemLabel = item => {
            if (!msgItem.value || msgItem.value.length === 0) return '';
            return msgItem.value.map(field => item[field]).join(' - ');
        };

        const toggleDropdown = () => {
            open.value = !open.value;
            if (open.value) {
                setTimeout(() => {
                    const input = document.querySelector('input[type="text"]');
                    if (input instanceof HTMLInputElement) input.focus();
                }, 100);
            } else if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        };

        const filterOptions = () => {
            showFilter.value = true;
        };

        const select = item => {
            const labelField = msgItem.value.length === 1 ? msgItem.value[0] : 'label';
            selectedItem.value = item;
            idField.value = item[fieldsReturn.value.idField];
            descripcionField.value = item[labelField];
            search.value = '';
            open.value = false;
            showFilter.value = false;

            emit('changeDataList', {
                idField: item[fieldsReturn.value.idField],
                descripcionField: item[labelField],
                item: item,
            });

            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }

            if (nextFocus.value) {
                const element = $dom(nextFocus.value);
                if (element instanceof HTMLInputElement) {
                    setTimeout(() => {
                        element.focus();
                    }, 50);
                }
            }
        };

        const clearSelection = () => {
            selectedItem.value = null;
            idField.value = '';
            descripcionField.value = '';
            search.value = '';
            emit('changeDataList', {
                idField: '',
                descripcionField: '',
                item: null,
            });
        };

        const closeWithDelay = () => {
            blurTimeout.value = setTimeout(() => {
                open.value = false;
                showFilter.value = false;
            }, 150);
        };

        const cancelBlur = () => {
            if (blurTimeout.value) {
                clearTimeout(blurTimeout.value);
                blurTimeout.value = null;
            }
        };

        // Watchers
        watch(
            () => value.value,
            newVal => {
                if (newVal) {
                    idField.value = newVal.idField || '';
                    descripcionField.value = newVal.descripcionField || '';
                }
            },
            { immediate: true }
        );

        watch(open, isOpen => {
            if (isOpen) {
                document.body.classList.add('overflow-hidden');
                window.scrollTo(0, 0);
            } else {
                document.body.classList.remove('overflow-hidden');
            }
        });

        // Lifecycle hooks
        onMounted(() => {
            if (value.value && value.value.idField) {
                idField.value = value.value.idField;
                descripcionField.value = value.value.descripcionField;
            }
        });

        onBeforeUnmount(() => {
            document.body.classList.remove('overflow-hidden');
        });

        return {
            id,
            label,
            required,
            disabled,
            placeholder,

            search,
            filtered,
            open,
            blurTimeout,
            idField,
            descripcionField,
            selectedItem,
            showFilter,
            keyboardHeight,
            viewportHeight,
            filteredOptions,
            processedList,
            dropdownStyle,
            calculateItemLabel,
            toggleDropdown,
            filterOptions,
            select,
            clearSelection,
            closeWithDelay,
            cancelBlur,
        };
    },
    template: html`
        <div class="w-full mobile-datalist" @keyup.esc="open = false">
            <label class="block mb-1 font-bold text-sm" :for="id + '_selected'">
                {{ label }}
                <span v-if="required" class="text-red-500">*</span>
            </label>

            <!-- Campo seleccionado -->
            <div v-if="descripcionField && !open" class="relative mb-2">
                <div
                    :id="id + '_selected'"
                    class="w-full p-3 rounded border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 flex justify-between items-center"
                    @click="toggleDropdown"
                    :class="{'opacity-60': disabled}"
                    :disabled="disabled">
                    <div class="truncate">{{ descripcionField }}</div>
                    <div class="flex space-x-2">
                        <button
                            v-if="descripcionField"
                            type="button"
                            class="text-gray-500 hover:text-red-500 focus:outline-none"
                            @click.stop="clearSelection">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Botón para abrir cuando no hay selección -->
            <button
                v-if="!descripcionField && !open"
                type="button"
                class="w-full p-3 rounded border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 text-left flex justify-between items-center"
                @click="toggleDropdown"
                :disabled="disabled">
                <span class="text-gray-500">{{ placeholder }}</span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <!-- Dropdown con búsqueda - Ahora siempre desde arriba -->
            <div
                v-if="open"
                class="fixed top-[58px] right-0 w-full h-full bg-black bg-opacity-30 z-50 flex flex-col items-center"
                @mousedown="cancelBlur">
                <div
                    class="bg-white dark:bg-gray-900 p-4 flex flex-col rounded-b-lg w-full md:w-[50%]"
                    :style="dropdownStyle">
                    <!-- Header con título y botón cerrar -->
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold">{{ label }}</h3>
                        <button
                            type="button"
                            class="text-gray-500 hover:text-gray-700 focus:outline-none"
                            @click="open = false">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <!-- Barra de búsqueda con icono al final -->
                    <div class="relative mb-4">
                        <input
                            ref="searchInput"
                            type="text"
                            class="w-full p-3 pr-10 rounded border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                            v-model="search"
                            @input="filterOptions"
                            :placeholder="placeholder" />
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5 text-gray-500 absolute right-3 top-1/2 transform -translate-y-1/2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <!-- Lista de opciones -->
                    <div class="overflow-y-auto flex-1">
                        <ul v-if="filteredOptions.length" class="divide-y divide-gray-200 dark:divide-gray-700">
                            <li
                                v-for="(item, index) in filteredOptions"
                                :key="index"
                                @mousedown.prevent="select(item)"
                                class="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer hover:text-gray-700 dark:hover:text-white">
                                {{ msgItem.length === 1 ? item[msgItem[0]] : item.label }}
                            </li>
                        </ul>
                        <div v-else class="p-4 text-center text-gray-500">No se encontraron resultados</div>
                    </div>
                </div>
                <!-- Espacio en blanco para empujar el contenido hacia arriba -->
                <div class="flex-grow"></div>
            </div>

            <!-- Campo oculto para el valor -->
            <input type="hidden" :id="id" :name="id" v-model="idField" :required="required" />
        </div>
    `,
});
