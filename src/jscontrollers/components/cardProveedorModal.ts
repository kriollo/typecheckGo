import modal from '@/jscontrollers/components/modal';
import tarjetaProveedor from '@/jscontrollers/components/tarjetaProveedor';
/* eslint-disable */
const m = modal;
const t = tarjetaProveedor;
/* eslint-enable */

import { GetUniquedArrayObject, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { defineComponent, computed, ref, watch } = Vue;

export default defineComponent({
    name: 'card-proveedor',
    props: {
        proveedor: {
            type: String,
            required: true,
        },
        showModal: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const showModal = computed(() => props.showModal);
        const proveedor = computed(() => props.proveedor);
        const dataProveedor = ref({});
        const showError = ref(false);

        watch(showModal, async value => {
            const rut = proveedor.value.replace(/\./g, '').split('-')[0];

            if (value) {
                const data = await versaFetch({
                    url: '/api/getProveedorByRutForCard',
                    method: 'POST',
                    data: JSON.stringify({ rut }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (data.success === 1) {
                    const uniqueProveedor = GetUniquedArrayObject('rut', data.data);

                    const other = uniqueProveedor.map(item => {
                        const contactos = data.data.filter(x => x.rut === item.rut && x.nombrecontacto !== null);

                        return { ...item, contactos };
                    });

                    dataProveedor.value = other[0];
                }
                showError.value = data.success !== 1;
            }
        });

        return { showModal, proveedor, dataProveedor, showError };
    },
    methods: {
        accion(accion) {
            this.$emit('accion', accion);
        },
    },
    template: html`
        <modal
            :draggable="true"
            :escClose="true"
            :showModal="showModal"
            @accion="accion"
            idModal="modalTarjetaProveedor"
            sizeModal="modal-lg">
            <template v-slot:title>Proveedor</template>
            <template v-slot:body>
                <div class="col col-md-12" v-if="!showError">
                    <tarjetaProveedor :col="12" :proveedor="dataProveedor" />
                </div>
                <div class="col col-md-12" v-else>
                    <div class="alert alert-danger" role="alert">
                        <strong>Error:</strong>
                        No se encontraron datos para el rut {{ proveedor }}.
                    </div>
                </div>
            </template>
            <template v-slot:footer>
                <button type="button" class="btn btn-default" @click="accion({accion:'closeModal'})">Cerrar</button>
            </template>
        </modal>
    `,
});
