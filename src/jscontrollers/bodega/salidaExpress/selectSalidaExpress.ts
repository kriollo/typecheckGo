import { useSalidaExpressStore } from '@/jscontrollers/bodega/salidaExpress/salidaExpresStore';

import { versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import type { SalidaExpressItem } from '@/jscontrollers/bodega/salidaExpress/types';
import type { Ref } from 'vue';

const { onMounted, ref, defineComponent } = Vue;
export default defineComponent({
    name: 'select-salida-express',
    setup() {
        const SalidaExpress = ref([]) as Ref<SalidaExpressItem[]>;

        onMounted(async () => {
            const externalFilters = `se.estado=1`;
            const response = await versaFetch({
                url: `/api/masters/getMasterSalidaExpress?externalFilters=${externalFilters}`,
                method: 'POST',
            });
            SalidaExpress.value = response.data as SalidaExpressItem[];
        });

        const selectSalida = (salida: SalidaExpressItem) => {
            useSalidaExpressStore.commit('setFormularioEntrada', {
                cod_campus: String(salida.cod_campus),
                desc_campus: String(salida.desc_campus),
                cod_area: String(salida.cod_area),
                desc_area: String(salida.desc_area),
                cod_centrogestion: String(salida.cod_centrogestion),
                desc_centrogestion: String(salida.desc_centrogestion),
                solicitante: String(salida.solicitante),
            });
            useSalidaExpressStore.commit('setEtapa', 1);
        };

        return {
            SalidaExpress,
            selectSalida,
        };
    },
    template: html`
        <div class="flex flex-col justify-center items-center">
            <h1 class="text-2xl font-bold mb-4">Seleccione un Salida Express</h1>
            <p class="text-lg mb-4 text-center">Por favor, elija un salida para continuar.</p>
            <button
                v-for="salida in SalidaExpress"
                :key="salida.id"
                class="btn btn-primary m-1 p-4 w-[300px]"
                @click="selectSalida(salida)">
                {{ salida.descripcion }}
            </button>
        </div>
    `,
});
