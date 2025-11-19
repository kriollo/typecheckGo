import { $dom } from '@/jscontrollers/composables/dom-selector';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { ref, computed, watchEffect } = Vue;
/**
 * Represents an input data list component.
 * @property {Array} emits - 'change' events emitted by the component.
 * @property {string} props.id - The ID of the component.
 * @property {string} props.label - The label for the component.
 * @property {Array} props.list - The list of options for the component.
 * @property {Array} props.msgItem - The message item for the component.
 * @property {string} props.itemValueOption - The option value for each item in the list.
 * @property {string} props.fieldReturn - The field used to return the selected value.
 * @property {string} props.value - The default value for the component.
 * @property {string} model.value - The v-model binding for the selected value.
 */
const inputDataList = {
    emits: ['changeDataList'],
    props: {
        id: {
            type: String,
            required: true,
        },
        label: {
            type: String,
            required: true,
        },
        list: {
            type: Array,
            required: true,
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
        nextFocus: {
            type: String,
            required: false,
            default: '',
        },
    },
    setup(props) {
        const id = computed(() => props.id);
        const label = computed(() => props.label);
        const list = computed(() => props.list);
        const msgItem = computed(() => props.msgItem);
        const itemValueOption = computed(() => props.itemValueOption);
        const fieldsReturn = computed(() => props.fieldsReturn);
        const value = computed(() => props.value);
        const required = computed(() => props.required);
        const disabled = computed(() => props.disabled);
        const nextFocus = computed(() => props.nextFocus);
        const idField = ref('');
        const descripcionField = ref('');
        const newList = ref([]);
        const itemLabelOption = ref('');

        /**
         * Calculates the item value based on the message item.
         * @param {Object} item - The item from the list.
         * @returns {string} - The calculated item value.
         */
        const item_calculate = item => {
            if (msgItem.value === undefined || msgItem.value === '') return '';
            return msgItem.value.map(element => item[element]).join(' - ');
        };

        watchEffect(() => {
            idField.value = value.value.idField;
            descripcionField.value = value.value.descripcionField;

            if (list.value.length === 0) {
                newList.value = [];
                return;
            }

            if (msgItem.value.length === 1) {
                itemLabelOption.value = msgItem.value[0];
                if (list.value.length > 0 && msgItem.value.length > 0) {
                    newList.value = JSON.parse(JSON.stringify(list.value));
                }
            } else {
                itemLabelOption.value = 'label';
                if (msgItem === undefined || msgItem.value === '') return;
                if (list.value.length > 0 && msgItem.value.length > 0) {
                    newList.value = list.value.map(item => {
                        item['label'] = item_calculate(item);
                        return item;
                    });
                }
            }
        });

        return {
            id,
            label,
            newList,
            msgItem,
            itemValueOption,
            itemLabelOption,
            fieldsReturn,
            idField,
            descripcionField,
            required,
            disabled,
            nextFocus,
        };
    },
    methods: {
        /**
         * Handles the change event of the input select.
         */
        change() {
            this.idField = '';
            this.newList.forEach(item => {
                if (item[this.itemLabelOption] === this.descripcionField) {
                    this.idField = item[this.fieldsReturn['idField']];
                    this.$emit('changeDataList', {
                        idField: item[this.fieldsReturn['idField']],
                        descripcionField: this.descripcionField,
                        item: item,
                    });
                }
            });
            this.$refs.inputSelect.blur();

            if (this.nextFocus) {
                const element = $dom(this.nextFocus);
                if (element instanceof HTMLInputElement) {
                    setTimeout(() => {
                        element.focus();
                    }, 50);
                }
            }
        },
    },
    template: html`
        <div class="form-group">
            <div class="flex justify-between">
                <label :for="id">{{ label }}</label>
                <input
                    type="text"
                    :id="'inputSelect_'+id"
                    disabled
                    v-model="idField"
                    class="w-[50%] text-gray-600 dark:text-gray-400 text-right pr-2 dark:bg-gray-800" />
            </div>
            <input
                class="form-control"
                :id="id"
                :list="'inputSelectData_'+id"
                @change="change"
                autocomplete="off"
                ref="inputSelect"
                v-model="descripcionField"
                :required="required"
                :disabled="disabled" />
            <datalist :id="'inputSelectData_'+id">
                <option :value="item[itemLabelOption]" v-for="item in newList">{{ item[itemValueOption]}}</option>
            </datalist>
        </div>
    `,
};

Vue.component('inputDataList', inputDataList);

export default {
    name: 'inputDataList',
    components: {
        inputDataList,
    },
};
