import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import consulta from '@/jscontrollers/docproveedor/gestionaProyectos/solicitante/consulta';
import enProceso from '@/jscontrollers/docproveedor/gestionaProyectos/solicitante/enProceso';
import formSolicitud from '@/jscontrollers/docproveedor/gestionaProyectos/solicitante/formSolicitud';
import pendientes from '@/jscontrollers/docproveedor/gestionaProyectos/solicitante/pendientes';
import rechazadas from '@/jscontrollers/docproveedor/gestionaProyectos/solicitante/rechazadas';
import type { AccionData, actionsType, VersaFetchResponse } from 'versaTypes';

import { versaFetch } from '@/jscontrollers/composables/utils';
import {
    newProyecto,
    type Proyecto,
    type ShowModalForm,
    ShowModalFormInjection,
} from '@/jscontrollers/docproveedor/gestionaProyectos/InjectKeys';

const { defineComponent, reactive, ref, onMounted } = Vue;

const ppal = defineComponent({
    components: { pendientes, enProceso, rechazadas, consulta, formSolicitud },
    setup() {
        const showTable = ref('pendientes');
        const injectShowModalForm = ShowModalFormInjection.inject();

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
                url: '/api/proyectos/resumeEstados?from=solicitante',
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

        const deleteProyecto = async (proyecto: string, anno: string) => {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: 'Esta acción eliminará el proyecto de forma permanente.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    url: '/api/proyectos/delete',
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ proyecto, anno }),
                });
                if (response.success === 0) {
                    Swal.fire('Error', response.message || 'Error al eliminar el proyecto.', 'error');
                    return;
                }
                injectShowModalForm.refreshTable = !injectShowModalForm.refreshTable;
                getStatus();

                Swal.fire('Eliminado', 'El proyecto ha sido eliminado.', 'success');
            }
        };

        const accion = (accion: AccionData) => {
            const actions: actionsType = {
                openModal: () => {
                    injectShowModalForm.setProyecto(newProyecto);
                    injectShowModalForm.setShowModal(true);
                },
                closeModal: () => {
                    injectShowModalForm.setShowModal(false);
                },
                reloadResume: () => {
                    getStatus();
                },
                deleteProyecto: () => {
                    deleteProyecto(accion.item.codigoproyecto, accion.item.anno);
                },
            };
            const fn = actions[accion.accion];
            if (typeof fn === 'function') {
                fn();
            }
        };

        onMounted(() => {
            getStatus();
        });

        return { showTable, setShowTable, injectShowModalForm, accion, status };
    },
    name: 'ppal',
    template: html`
        <div class="col col-md-12">
            <formSolicitud :showModal="injectShowModalForm.value" @accion="accion" />
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
                                        :class="['nav-link', { active: showTable === 'rechazadas' }]"
                                        id="tab-rechazadas"
                                        href="#"
                                        role="tab"
                                        aria-controls="Rechazadas"
                                        :aria-selected="showTable === 'rechazadas'"
                                        @click.prevent="setShowTable('rechazadas')">
                                        Rechazadas
                                        <span class="badge badge-info float-right">{{ status.rechazadas }}</span>
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
                                <pendientes :showTable="showTable" @accion="accion" />
                                <enProceso :showTable="showTable" @accion="accion" />
                                <rechazadas :showTable="showTable" @accion="accion" />
                                <consulta :showTable="showTable" @accion="accion" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});

const _appSolProyecto = new Vue({
    el: '#ppal',
    components: { ppal },
    delimiters: ['${', '}'],
    setup() {
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

        const openNewProyecto = () => {
            showModalForm.setProyecto({ ...newProyecto });
            showModalForm.setShowModal(true);
        };

        return { openNewProyecto };
    },
});
