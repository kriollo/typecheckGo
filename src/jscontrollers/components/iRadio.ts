import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const loadICheckCss = async () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '@/vendor/plugins/icheck-bootstrap/icheck-bootstrap.min.css';
    document.head.appendChild(link);
};
loadICheckCss();

/**
 * Represents a custom radio button component.
 *
 * @property {Array} emits - 'change' events emitted by the component.
 * @property {string} props.label - The label for the radio button.
 * @property {string} props.iClass - The CSS class for the radio button.
 * @property {Array} props.options - The options for the radio button.
 * @property {string} props.value - The value of the radio button.
 * @property {string} model.value - The v-model binding for the selected value.
 */
const iRadio = {
    emits: ['change'],
    model: {
        prop: 'value',
        event: 'change',
    },
    props: {
        id: {
            type: String,
            default: 'iRadio',
        },
        label: {
            type: String,
            required: true,
        },
        iClass: {
            type: String,
            required: false,
            default: 'icheck-success',
        },
        options: {
            type: Array,
            required: true,
        },
        value: {
            type: String,
            required: false,
        },
        horizontalList: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    setup(props) {
        const id = Vue.computed(() => props.id);
        const label = Vue.computed(() => props.label);
        const iClass = Vue.computed(() => props.iClass);
        const options = Vue.computed(() => props.options);
        const value = Vue.computed(() => props.value);
        const horizontalList = Vue.computed(() => props.horizontalList);

        return {
            label,
            iClass,
            options,
            value,
            id,
            horizontalList,
        };
    },
    template: html`
        <div class="form-group">
            <label :for="id + '_' + options[0].id">{{ label }}</label>
            <div class="gap-3" :class="horizontalList ? 'flex':''">
                <div :class="iClass" :key="option.id" v-for="option in options">
                    <input
                        type="radio"
                        :checked="value === option.value"
                        :disabled="option?.disabled"
                        :id="id +'_' + option.id"
                        :name="id"
                        :value="option.value"
                        @change="$emit('change', option.value)" />
                    <label :for="id +'_' + option.id">{{ option.label }}</label>
                </div>
            </div>
        </div>
    `,
};

Vue.component('iRadio', iRadio);

export default {
    name: 'iRadio',
    components: {
        iRadio,
    },
};
