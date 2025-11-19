import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { defineComponent } = Vue;

const loadICheckCss = async () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '@/vendor/plugins/icheck-bootstrap/icheck-bootstrap.min.css';
    document.head.appendChild(link);
};
loadICheckCss();

/**
 * Represents a custom checkbox component.
 * @property {Array} emits - 'change' event emitted by the component.
 * @property {String} props.id - The unique identifier for the checkbox.
 * @property {String} props.label - The label text for the checkbox.
 * @property {Boolean} model.checked - The v-model binding for the checked state of the checkbox.
 */
const icheck = {
    name: 'newICheck',
    emits: ['change'],
    props: {
        id: {
            type: String,
            required: true,
        },
        label: {
            type: String,
            required: true,
        },
        checked: {
            type: Boolean,
            required: false,
            default: false,
        },
        iClass: {
            type: String,
            required: false,
            default: 'icheck-success',
        },
    },
    model: {
        prop: 'checked',
        event: 'change',
    },
    setup(props) {
        const id = Vue.computed(() => props.id);
        const label = Vue.computed(() => props.label);
        const checked = Vue.computed(() => props.checked);
        const iClass = Vue.computed(() => props.iClass);

        return {
            id,
            label,
            checked,
            iClass,
        };
    },
    template: html`
        <div :class="iClass">
            <input type="checkbox" :checked="checked" :id="id" @change="$emit('change', $event.target.checked)" />
            <label :for="id">{{ label }}</label>
        </div>
    `,
};
export default defineComponent(icheck);
