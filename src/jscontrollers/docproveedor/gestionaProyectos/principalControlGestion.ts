import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { defineComponent, ref, reactive, onMounted } = Vue;

import { versaFetch } from '@/jscontrollers/composables/utils';
import formControlGestionMails from '@/jscontrollers/docproveedor/gestionaProyectos/controlgestion/formControlGestionMails';
import viewFormSolicitud from '@/jscontrollers/docproveedor/gestionaProyectos/controlgestion/viewFormSolicitud';
import type { AccionData, actionsType, VersaFetchResponse } from 'versaTypes';

import consulta from '@/jscontrollers/docproveedor/gestionaProyectos/controlgestion/consulta';
import enEjecucion from '@/jscontrollers/docproveedor/gestionaProyectos/controlgestion/enEjecucion';
import pendientesPorAprobar from '@/jscontrollers/docproveedor/gestionaProyectos/controlgestion/pendientesPorAprobar';
import {
    newProyecto,
    Proyecto,
    ShowModalForm,
    ShowModalFormInjection,
} from '@/jscontrollers/docproveedor/gestionaProyectos/InjectKeys';

const ppal = defineComponent({
    components: { pendientesPorAprobar, enEjecucion, consulta, viewFormSolicitud },
    setup() {
        const injectShowModalForm = ShowModalFormInjection.inject();

        const showTable = ref('pendientes');
        const status = reactive({
            pendientes: 0,
            enProceso: 0,
            rechazadas: 0,
        });

        const getStatus = async () => {
            interface ResponseData extends VersaFetchResponse {
                pendientes?: number;
                enProceso?: number;
                rechazadas?: number;
            }
            const response = (await versaFetch({
                url: '/api/proyectos/resumeEstados?from=controlGestion',
                method: 'GET',
            })) as ResponseData;
            if (response) {
                status.pendientes = response.pendientes || 0;
                status.enProceso = response.enProceso || 0;
                status.rechazadas = response.rechazadas || 0;
            }
        };

        const setShowTable = (table: string) => {
            showTable.value = table;
            getStatus();
        };

        onMounted(() => {
            getStatus();
        });

        const accion = (accion: AccionData) => {
            const actions: actionsType = {
                openModal: () => {},
                closeModal: () => {},
                reloadResume: () => getStatus(),
            };
            const fn = actions[accion.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        return { setShowTable, showTable, status, accion, injectShowModalForm };
    },
    name: 'ppal',
    template: html`
        <div class="col col-md-12">
            <viewFormSolicitud :showModal="injectShowModalForm.showModal" @accion="accion" />
            <div class="card card-info card-outline">
                <div class="card-body">
                    <div class="row">
                        <!-- Nav vertical izquierda -->
                        <div class="col-md-2">
                            <ul
                                class="nav nav-pills flex-column"
                                id="custom-tabs-vertical"
                                role="tablist"
                                aria-orientation="vertical">
                                <li class="nav-item">
                                    <a
                                        :class="['nav-link', { active: showTable === 'pendientes' }]"
                                        id="tab-pendientes"
                                        href="#"
                                        role="tab"
                                        aria-controls="Por_Aprobar"
                                        :aria-selected="showTable === 'pendientes'"
                                        @click.prevent="setShowTable('pendientes')">
                                        <span>Solicitudes</span>
                                        <span class="badge badge-info float-right">{{ status.pendientes }}</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a
                                        :class="['nav-link', { active: showTable === 'enProceso' }]"
                                        id="tab-enproceso"
                                        href="#"
                                        role="tab"
                                        aria-controls="en_proceso"
                                        :aria-selected="showTable === 'enProceso'"
                                        @click.prevent="setShowTable('enProceso')">
                                        En Ejecución
                                        <span class="badge badge-info float-right">{{ status.enProceso }}</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a
                                        :class="['nav-link', { active: showTable === 'consulta' }]"
                                        id="tab-consulta"
                                        href="#"
                                        role="tab"
                                        aria-controls="Consulta"
                                        :aria-selected="showTable === 'consulta'"
                                        @click.prevent="setShowTable('consulta')">
                                        Consulta General
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <!-- Contenido a la derecha -->
                        <div class="col-md-10">
                            <div id="custom-tabs-vertical-content">
                                <pendientes-por-aprobar
                                    :showTable="showTable"
                                    @accion="accion"></pendientes-por-aprobar>
                                <en-ejecucion :showTable="showTable" @accion="accion"></en-ejecucion>
                                <consulta :showTable="showTable" @accion="accion"></consulta>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});

const _appCGesProyecto = new Vue({
    el: '#ppal',
    components: { ppal, formControlGestionMails },
    delimiters: ['${', '}'],
    setup() {
        const ShowModalForm = ref(false);

        const setShowModalForm = (value: boolean) => {
            ShowModalForm.value = value;
        };

        const showModalForm = reactive({
            value: false,
            setShowModal(value: boolean) {
                this.value = value;
            },
            proyecto: { ...newProyecto } as Proyecto,
            setProyecto(proyecto: Proyecto) {
                this.proyecto = { ...proyecto };
            },
            refreshTable: false,
            fileProyecto: null,
            setFileProyecto(fileProyecto) {
                this.fileProyecto = { ...fileProyecto };
            },
        }) as ShowModalForm;
        ShowModalFormInjection.provide(showModalForm);

        const accion = (data: AccionData) => {
            const actions: Record<string, () => void> = {
                closeModal: () => {
                    setShowModalForm(false);
                },
            };
            const fn = actions[data.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        return { ShowModalForm, accion, setShowModalForm };
    },
});
