import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

export type Breadcrumb = { name: string; link: string; active?: boolean };

const { computed, defineComponent } = Vue;
export default defineComponent({
    name: 'breadcrumb',
    props: {
        module: {
            type: String,
            default: 'bodega',
        },
        list: {
            type: Array as () => Breadcrumb[],
            default: () => [],
        },
    },
    setup(props) {
        const module = computed(() => props.module);
        const list = computed(() => props.list);
        return {
            module,
            list,
        };
    },
    methods: {},
    template: html`
        <div class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1 class="m-0 text-dark">{{module}}</h1>
                    </div>
                    <div class="col-sm-6">
                        <ol class="breadcrumb float-sm-right">
                            <li
                                class="breadcrumb-item"
                                v-for="(item, index) in list"
                                :key="index"
                                :class="{ active: item.active }"
                                :aria-current="item.active ? 'page' : undefined">
                                <a v-if="!item.active" :href="item.link">{{item.name}}</a>
                                <span v-else>{{item.name}}</span>
                            </li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    `,
});
