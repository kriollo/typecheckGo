import { versaAlert, versaFetch } from '@/jscontrollers/composables/utils';
import { useGEDAStore } from '@/jscontrollers/stores/dependencias';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { defineComponent } = Vue;

import bajaActivo from '@/jscontrollers/geda/movimientos/bajaActivo';
import trasladoActivo from '@/jscontrollers/geda/movimientos/trasladoActivo';
import viewDetalleMovimiento from '@/jscontrollers/geda/movimientos/viewDetalleMovimiento';

import customTable from '@/jscontrollers/components/customTable';

/* eslint-disable */
const ct = customTable;
/* eslint-enable */

const crumb = defineComponent({
    name: 'crumb',
    emits: ['accion'],
    setup() {
        const showModal = Vue.ref(false);

        return {
            showModal,
        };
    },
    methods: {
        accion(/** @type {Object} */ accion) {
            const actions = {
                closeModal: () => (this.showModal = false),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
    },
    template: html`
        <div class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1 class="m-0 text-dark">
                            <i class="fas fa-comments-dollar"></i>
                            Movimientos de Activos
                        </h1>
                    </div>
                    <div class="col-sm-6">
                        <ol class="breadcrumb float-sm-right">
                            <li class="breadcrumb-item">
                                <a href="/portal">Home</a>
                            </li>
                            <li class="breadcrumb-item">
                                <a href="/geda/gestiona">Gestión de Activos</a>
                            </li>
                            <li class="breadcrumb-item active">Movimientos</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    `,
});

const ppal = defineComponent({
    name: 'ppal',
    components: { bajaActivo, trasladoActivo, viewDetalleMovimiento },
    emits: ['accion'],
    setup() {
        const showModalBaja = Vue.ref(false);
        const refresTable = Vue.ref(false);
        const showModalDetalleMovimiento = Vue.ref(false);
        const tokenView = Vue.ref('');

        useGEDAStore.dispatch('getDependencias');

        const showModalTraslado = Vue.ref(false);

        const countPendientesMovimientos = Vue.ref(0);

        const countRechazdosMovimientos = Vue.ref(0);

        return {
            showModalBaja,
            refresTable,
            countPendientesMovimientos,
            showModalDetalleMovimiento,
            tokenView,
            showModalTraslado,
            countRechazdosMovimientos,
        };
    },
    methods: {
        accion(accion) {
            const actions = {
                closeModal: () => {
                    this.showModalBaja = false;
                    this.showModalDetalleMovimiento = false;
                    this.showModalTraslado = false;
                },
                'refresh-table': () => (this.refresTable = !this.refresTable),
                ReenviarCorreo: () => this.reenviarCorreo(accion.item),
                VerDetalleMovimiento: () => this.verDetalleMovimiento(accion.item),
                EliminarMovimiento: () => this.deleteMovimiento(accion.item),
            };

            const selectedAction = actions[accion.accion] || actions['default'];
            if (typeof selectedAction === 'function') {
                selectedAction();
            }
        },
        async reenviarCorreo(/** @type {Object} */ item) {
            item.loader = 1;
            const response = await versaFetch({
                method: 'POST',
                url: '/api/GEDA/fordwardMailAprobacion',
                headers: { 'content-type': 'application/json' },
                data: JSON.stringify({ item }),
            });
            if (response.success === 1) {
                versaAlert({
                    type: 'success',
                    title: 'Correcto',
                    message: response.message,
                    callback: () => {
                        item.loader = 0;
                    },
                });
                return;
            }
            await versaAlert({
                type: 'error',
                title: 'Error',
                message: response.message,
                callback: () => {
                    item.loader = 0;
                },
            });
        },
        verDetalleMovimiento(/** @type {Object} */ item) {
            this.tokenView = item.token;
            this.showModalDetalleMovimiento = true;
        },
        async deleteMovimiento(/** @type {Object} */ item) {
            const result = await Swal.fire({
                title: '¿Está seguro de eliminar el movimiento?',
                showCancelButton: true,
                confirmButtonText: 'Si',
                cancelButtonText: 'No',
                icon: 'question',
            });
            if (result.isConfirmed) {
                const response = await versaFetch({
                    method: 'POST',
                    url: '/api/GEDA/deleteMovimiento',
                    headers: { 'content-type': 'application/json' },
                    data: JSON.stringify({ item }),
                });
                if (response.success === 1) {
                    versaAlert({
                        type: 'success',
                        title: 'Correcto',
                        message: response.message,
                        callback: () => {
                            this.refresTable = !this.refresTable;
                        },
                    });
                    return;
                }
                await versaAlert({
                    type: 'error',
                    title: 'Error',
                    message: response.message,
                });
            }
        },
    },
    template: html`
        <div class="col col-md-12">
            <bajaActivo :showModal="showModalBaja" @accion="accion" />
            <trasladoActivo :showModal="showModalTraslado" @accion="accion" />
            <viewDetalleMovimiento :showModal="showModalDetalleMovimiento" :token="tokenView" @accion="accion" />

            <div class="card card-info card-outline card-outline-tabs">
                <div class="card-header p-0 border-bottom-0">
                    <ul id="MovimientosActivos-tab" class="nav nav-tabs" role="tablist">
                        <li class="nav-item">
                            <a
                                id="MovPendientesAprobacion-tab"
                                class="nav-link active"
                                @click="refresTable=!refresTable"
                                aria-controls="Pendiente-tab"
                                aria-selected="true"
                                data-toggle="pill"
                                href="#PendientesAprobacion"
                                role="tab">
                                Pendientes de Aprobación ({{countPendientesMovimientos}})
                            </a>
                        </li>
                        <li class="nav-item">
                            <a
                                id="MovRechazados-tab"
                                class="nav-link"
                                @click="refresTable=!refresTable"
                                aria-controls="Rechazados-tab"
                                aria-selected="false"
                                data-toggle="pill"
                                href="#Rechazados"
                                role="tab">
                                Movimientos Rechazados ({{countRechazdosMovimientos}})
                            </a>
                        </li>
                    </ul>
                </div>
                <div class="card-body">
                    <div id="MovimientosActivos-tabContent" class="tab-content">
                        <div
                            id="PendientesAprobacion"
                            class="tab-pane fade active show"
                            aria-labelledby="MovPendientesAprobacion-tab"
                            role="tabpanel">
                            <customTable
                                id="RegistroMovimientos"
                                :refresh="refresTable"
                                @accion="accion"
                                externalFilters="gbae.estado_aprobacion = 1"
                                key="RegistroMovimientos"
                                titleTable="Pendientes de Aprobación"
                                url="/api/GEDA/getRegistroMovimientos"
                                v-model="countPendientesMovimientos">
                                <template v-slot:headerButtons>
                                    <button class="btn btn-warning" @click="showModalBaja = true">
                                        <i class="fas fa-arrow-alt-circle-down"></i>
                                        Registrar Baja
                                    </button>
                                    <button class="btn btn-secondary" @click="showModalTraslado=true">
                                        <i class="fas fa-arrow-alt-circle-left"></i>
                                        Registrar Traspaso
                                    </button>
                                </template>
                            </customTable>
                        </div>
                        <div id="Rechazados" class="tab-pane fade" aria-labelledby="MovRechazados-tab" role="tabpanel">
                            <customTable
                                id="RegistroMovimientosRechazados"
                                :refresh="refresTable"
                                @accion="accion"
                                externalFilters="gbae.estado_aprobacion = 3"
                                key="RegistroMovimientosRechazados"
                                titleTable="Movimientos Rechazados"
                                url="/api/GEDA/getRegistroMovimientos"
                                v-model="countRechazdosMovimientos" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
});

const _ppalGEDAMovi = new Vue({
    el: '#ppal',
    delimiters: ['${', '}'],
    components: { crumb, ppal },
});
