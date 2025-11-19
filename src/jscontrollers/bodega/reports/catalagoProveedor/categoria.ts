import { useStoreProveedor } from '@/jscontrollers/bodega/reports/catalagoProveedor/useStoreProveedor';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { defineComponent } = Vue;
export default defineComponent({
    store: useStoreProveedor,
    name: 'categoria',
    props: {
        categoria: Object,
    },
    methods: {
        ...Vuex.mapMutations(['setCategoriaSelected']),
        showModal: function (item) {
            this.setCategoriaSelected(item);
            this.$emit('showModal', true);
        },
    },
    template: html`
        <div class="col-md-2 col-xs-2 col-xl-2">
            <button
                type="button"
                class="btn btn-app btn-secondary shadow btn-outline-info border-info w-100 my-2"
                style="margin:0px; padding:0px;"
                @click="showModal(categoria)"
                v-bind:id="'btn_'+categoria.id">
                {{ categoria.descripcion }}
            </button>
        </div>
    `,
});
