import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const cardmenu = {
    props: {
        option: {
            type: Object,
            required: true,
        },
        fieldshow: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const option = Vue.computed(() => props.option);
        const fieldshow = Vue.computed(() => props.fieldshow);
        return {
            option,
            fieldshow,
        };
    },
    template: html`
        <div
            class="card shadow-lg rounded-xl overflow-hidden h-[250px] bg-info shadow-slate-400 translate-x-0 hover:translate-x-1 hover:shadow-slate-500 transition-all duration-150">
            <div class="card-header bg-info text-white d-flex justify-content-center py-3 rounded-t-xl overflow-hidden">
                <i :class="'fa-3x '+ option.glyphicon"></i>
            </div>
            <div class="card-body flex justify-center items-center py-3 bg-white">
                <h3 class="text-center font-bold text-lg">{{ option[fieldshow] }}</h3>
            </div>
            <div class="card-footer bg-info p-0 rounded-b-xl">
                <a class="btn btn-block p-2" :href="option.url">
                    <i class="fa fa-eye"></i>
                </a>
            </div>
        </div>
    `,
};

Vue.component('cardmenu', cardmenu);

export default {
    name: 'cardmenu',
    components: {
        cardmenu,
    },
};
