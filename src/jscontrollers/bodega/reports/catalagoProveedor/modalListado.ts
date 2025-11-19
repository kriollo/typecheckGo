import modal from '@/jscontrollers/components/modal.js';
import tarjetaProveedor from '@/jscontrollers/components/tarjetaProveedor.js';
/* eslint-disable */
const m = modal;
const TP = tarjetaProveedor;
/* eslint-enable */

import { useStoreProveedor } from '@/jscontrollers/bodega/reports/catalagoProveedor/useStoreProveedor';
import newModal from '@/jscontrollers/components/newModal';
import { GetUniquedArrayObject } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { defineComponent } = Vue;
export default defineComponent({
    name: 'modalListado',
    components: { newModal },
    store: useStoreProveedor,
    emit: ['closeModal'],
    props: {
        showModal: {
            type: Boolean,
            default: false,
            required: true,
        },
    },
    data() {
        return {
            array_proveedores: [],
        };
    },
    computed: {
        ...Vuex.mapState(['categoria_selected']),
    },
    watch: {
        showModal: function (val) {
            if (val) {
                $('#modalviewcategorias').modal('show');
                this.load_proveedoresLocal(this.categoria_selected.id);
            } else {
                $('#modalviewcategorias').modal('hide');
            }
        },
    },
    methods: {
        ...Vuex.mapActions(['load_proveedores']),
        closeModal() {
            this.$emit('closeModal', false);
        },
        load_proveedoresLocal() {
            this.array_proveedores = [];
            this.load_proveedores(this.categoria_selected.id).then(data => {
                if (false !== data) {
                    const uniqueProveedor = GetUniquedArrayObject('rut', data.data);

                    uniqueProveedor.map(item => {
                        item['contactos'] = data.data.filter(x => x.rut === item.rut && x.nombrecontacto !== null);
                        return item;
                    });

                    this.array_proveedores = uniqueProveedor;
                }
            });
        },
    },
    template: html`
        <newModal :showModal="showModal" @accion="closeModal" idModal="proveedor" size="max-w-7xl">
            <template v-slot:title>
                <h3 class="modal-title">
                    <i class="fa fa-friends"></i>
                    Categoria: {{ categoria_selected.descripcion }}
                </h3>
            </template>
            <template v-slot:body>
                <div class="col-md-12 col-xl-12">
                    <div class="row">
                        <tarjetaProveedor
                            :key="item.rut"
                            :proveedor="item"
                            v-for="item in array_proveedores"></tarjetaProveedor>
                    </div>
                </div>
            </template>
        </newModal>
    `,
});
