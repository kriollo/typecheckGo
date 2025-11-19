import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const selectEditItem = {
    props: {
        options: {
            type: Array,
            required: true,
        },
        value: {
            type: String,
            required: false,
        },
        id: {
            type: Number,
            default: 0,
        },
        fieldReturn: {
            type: String,
            required: false,
            default: 'value',
        },
    },
    emits: ['input', 'accion'],
    model: {
        prop: 'value',
        event: 'input',
    },
    setup(props) {
        const selected = Vue.computed(() => props.value);
        const idProps = Vue.computed(() => `${props.id}_select`);
        const newValue = Vue.ref('');

        Vue.watch(
            selected,
            val => {
                newValue.value = val;
            },
            { immediate: true }
        );

        return {
            selected,
            idProps,
            newValue,
        };
    },
    methods: {
        changeValue() {
            let valueReturn = '';
            if (this.fieldReturn === 'value') {
                valueReturn = this.newValue;
            } else {
                valueReturn = this.options.find(item => item.value === this.newValue);
                if (valueReturn !== undefined) {
                    valueReturn = valueReturn[this.fieldReturn];
                }
            }
            this.$emit('input', valueReturn);
            this.$emit('accion', { accion: 'closeEditItem', id: this.id });
        },
        cancelUpdate() {
            this.$emit('input', this.selected);
            this.$emit('accion', { accion: 'closeEditItem', id: this.id });
        },
    },
    template: html`
        <div class="relative w-full flex items-center">
            <select
                class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-s-lg border-s-gray-50 border-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-s-gray-700  dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                :id="'txtInput_'+idProps"
                v-model="newValue">
                <option :value="option.value" v-for="option in options">{{option.label}}</option>
            </select>
            <div class="flex items-center">
                <button
                    type="button"
                    class="p-2.5 text-sm font-medium text-white bg-green-700  border border-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300"
                    @click="changeValue">
                    <i class="fas fa-save"></i>
                </button>
                <button
                    type="button"
                    class="p-2.5 text-sm font-medium text-white bg-orange-700 rounded-e-lg border border-orange-700 hover:bg-orange-800 focus:ring-4 focus:outline-none focus:ring-orange-300"
                    @click="cancelUpdate">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </div>
    `,
};

Vue.component('selectEditItem', selectEditItem);

export default {
    name: 'selectEditItem',
    components: {
        selectEditItem,
    },
};
