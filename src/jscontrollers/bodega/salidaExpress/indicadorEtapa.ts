import { useSalidaExpressStore } from '@/jscontrollers/bodega/salidaExpress/salidaExpresStore';
import { scrollToTop } from '@/jscontrollers/composables/dom-selector';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { defineComponent, computed } = Vue;

interface EtapaInfo {
    id: number;
    nombre: string;
}

export default defineComponent({
    name: 'indicadorEtapa',
    setup() {
        const etapa = computed(() => useSalidaExpressStore.state.etapa);

        const etapasInfo: EtapaInfo[] = [
            { id: 0, nombre: 'Selección' },
            { id: 1, nombre: 'Productos' },
            { id: 2, nombre: 'Edición' },
            { id: 3, nombre: 'Confirmación' },
        ];

        const irAEtapa = (nuevaEtapa: number) => {
            if (nuevaEtapa !== 2) useSalidaExpressStore.commit('setEtapa', nuevaEtapa);
            scrollToTop('.content-wrapper');
        };

        return {
            etapasInfo,
            irAEtapa,
            etapa,
        };
    },
    template: html`
        <div class="d-flex justify-content-center align-items-start position-relative px-4">
            <!-- Connecting Lines Container -->
            <div
                class="position-absolute top-0 start-0 w-100 d-flex justify-content-center"
                style="margin-top: 15px; z-index: 0;">
                <div
                    class="flex-grow-1"
                    style="height: 2px;"
                    :class="etapa > 0 ? 'bg-primary' : 'bg-secondary bg-opacity-25'"></div>
                <div
                    class="flex-grow-1"
                    style="height: 2px;"
                    :class="etapa > 1 ? 'bg-primary' : 'bg-secondary bg-opacity-25'"></div>
            </div>

            <!-- Steps -->
            <div class="d-flex justify-content-around w-100" style="z-index: 1;">
                <div
                    class="d-flex flex-column align-items-center text-center"
                    v-for="(info, index) in etapasInfo"
                    :key="info.id"
                    @click="irAEtapa(info.id)"
                    :style="{ cursor: info.id <= etapa ? 'pointer' : 'default' }">
                    <div
                        class="rounded-circle d-flex justify-content-center align-items-center mb-1"
                        style="width: 30px; height: 30px; transition: all 0.3s ease;"
                        :class="{
                            'bg-primary text-white': etapa === info.id,
                            'bg-white border border-primary text-primary': etapa > info.id,
                            'bg-secondary bg-opacity-25 text-muted border': etapa < info.id
                        }">
                        <span :class="{ 'fw-bold': etapa === info.id }">{{ info.id + 1 }}</span>
                    </div>
                    <div
                        class="small"
                        :class="{
                            'text-primary fw-medium': etapa === info.id,
                            'text-primary': etapa > info.id,
                            'text-muted': etapa < info.id
                        }">
                        {{ info.nombre }}
                    </div>
                </div>
            </div>
        </div>
    `,
});
