import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { ref, computed } = Vue;
/**
 * Represents an input component that can be edited.
 * @property {Array} emits - 'accion' event emitted by the component.
 * @property {Number} props.id - The ID of the component.
 * @property {String} props.data - The data of the component.
 * @property {String} props.from - The source of the component.
 * @property {String} props.field - The field of the component.
 * @property {String} props.type - The type of the component.
 */
const inputEditable = {
    emits: ['accion'],
    props: {
        id: {
            type: Number,
            default: 0,
        },
        data: {
            type: String,
            default: '',
        },
        from: {
            type: String,
        },
        field: {
            type: String,
        },
        type: {
            type: String,
            default: 'text',
        },
        showCancelButton: {
            type: Boolean,
            default: true,
        },
        required: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const dataProps = computed(() => props.data);
        const idProps = computed(() => props.id);
        const estado_panel = computed(() => props.estado_panel);
        const newData = ref(JSON.parse(JSON.stringify(dataProps.value)));
        const field = computed(() => props.field);
        const type = computed(() => props.type);
        const showCancel = computed(() => props.showCancelButton);
        const required = computed(() => props.required);

        return {
            dataProps,
            idProps,
            estado_panel,
            newData,
            field,
            type,
            showCancel,
            required,
        };
    },
    methods: {
        /**
         * Handles the action of the component.
         * @param {Object} accion - The action object.
         */
        accion(accion) {
            this.$emit('accion', accion);
        },
    },
    template: html`
        <div class="relative w-full flex items-center">
            <input
                class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-s-lg border-s-gray-50 border-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-s-gray-700  dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500 min-w-max"
                style="min-width: 100px;"
                :id="'txtInput_'+idProps+'_'+field"
                :type="type"
                v-model="newData"
                :required="required" />
            <div class="flex items-center">
                <button
                    type="button"
                    class="p-2.5 text-sm font-medium text-white bg-green-700  border border-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300"
                    @click="accion({accion: 'updateData',id: idProps,newData: newData,from: from,field: field})">
                    <i class="fas fa-save"></i>
                </button>
                <button
                    type="button"
                    class="p-2.5 text-sm font-medium text-white bg-orange-700 rounded-e-lg border border-orange-700 hover:bg-orange-800 focus:ring-4 focus:outline-none focus:ring-orange-300"
                    @click="accion({accion: 'cancelUpdate',id: idProps,from: from,field: field})"
                    v-if="showCancel">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </div>
    `,
};

Vue.component('inputEditable', inputEditable);

export default {
    name: 'inputEditable',
    components: {
        inputEditable,
    },
};
