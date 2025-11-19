import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

/**
 * Represents an input data list Editable component.
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
const inputDataListEditableComponent = {
    emits: ['accion'],
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
        showCancel: {
            type: Boolean,
            default: true,
        },
    },
    setup(props) {
        const id = Vue.computed(() => props.id);
        const label = Vue.computed(() => props.label);
        const list = Vue.computed(() => props.list);
        const msgItem = Vue.computed(() => props.msgItem);
        const itemValueOption = Vue.computed(() => props.itemValueOption);
        const fieldsReturn = Vue.computed(() => props.fieldsReturn);
        const value = Vue.computed(() => props.value);
        const showCancel = Vue.computed(() => props.showCancel);
        const idField = Vue.ref('');
        const descripcionField = Vue.ref('');
        const newList = Vue.ref([]);
        const itemLabelOption = Vue.ref('');

        /**
         * Calculates the item value based on the message item.
         * @param {Object} item - The item from the list.
         * @returns {string} - The calculated item value.
         */
        const item_calculate = item => {
            if (msgItem.value === undefined || msgItem.value === '') return '';
            return msgItem.value.map(element => item[element]).join(' - ');
        };

        Vue.watchEffect(() => {
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
            showCancel,
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

                    this.$emit('accion', {
                        accion: 'updateInputDataListEditable',
                        idField: item[this.fieldsReturn['idField']],
                        descripcionField: this.descripcionField,
                        item: item,
                    });
                }
            });
        },
        cancel() {
            this.$emit('accion', {
                accion: 'cancelInputDataListEditable',
            });
        },
    },
    template: html`
        <div class="form-group">
            <div class="flex items-center gap-x-2">
                <label :for="id">{{ label }}</label>
                <input
                    type="text"
                    class="w-[50%]"
                    :id="'inputSelect_'+id"
                    disabled
                    v-model="idField" />
            </div>
            <div class="relative w-full flex items-center">
                <input
                    class="form-control"
                    :id="id"
                    :list="'inputSelectData_'+id"
                    autocomplete="off"
                    ref="inputSelect"
                    v-model="descripcionField" />
                <div class="flex items-center">
                    <button
                        type="button"
                        class="p-2.5 text-sm font-medium text-white bg-green-700  border border-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300"
                        @click="change">
                        <i class="fas fa-save"></i>
                    </button>
                    <button
                        type="button"
                        class="p-2.5 text-sm font-medium text-white bg-orange-700 rounded-e-lg border border-orange-700 hover:bg-orange-800 focus:ring-4 focus:outline-none focus:ring-orange-300"
                        v-if="showCancel"
                        @click="cancel">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
            <datalist :id="'inputSelectData_'+id">
                <option :value="item[itemLabelOption]" v-for="item in newList">
                    {{ item[itemValueOption]}}
                </option>
            </datalist>
        </div>
    `,
};

export const inputDataListEditable = Vue.component(
    'inputDataListEditable',
    inputDataListEditableComponent
);
