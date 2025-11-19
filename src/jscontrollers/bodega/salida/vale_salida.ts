import { $domAll } from '@/jscontrollers/composables/dom-selector';
import { FALSE, TRUE, show_toast, versaFetch } from '@/jscontrollers/composables/utils';

Vue.component('modalbodegasprod', {
    name: 'modalbodegasprod',
    props: {
        bodegasprod: [],
        param: [],
    },
    template: `
        <div class="card card-outline card-info col-md-6 text-capitalize">
            <header class="card-header">
                <i class="fa fa-cubes"></i> Seleccione Bodega donde desea retirar producto
                <div class="card-tools">
                    <button type="button" class="btn btn-tool" @click="changestatusshowmodal" data-card-widget="remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </header>
            <div class="card-body">
                <table class="table table-responsive-lg table-borderless">
                    <thead>
                        <th></th>
                        <th>Bodega</th>
                        <th class="text-center">Cantidad Disponible</th>
                        <th class="text-center">Valor</th>
                        <th></th>
                    </thead>
                    <tbody>
                        <tr v-for="item in bodegasprod">
                            <td>
                                <i class="fa fa-check-circle text-info" v-if="param.codigo_bodega == item.codigo"></i>
                            </td>
                            <td>{{ item.descripcion }}</td>
                            <td class="text-center">{{ item.stock_actual | format_number }}</td>
                            <td class="text-center">{{ item.preciocompra | format_number }}</td>
                            <td>
                                <button type="button" class="btn btn-success" @click="select_bodega(item)">
                                    <i class="fa fa-check"></i>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,
    methods: {
        changestatusshowmodal() {
            setTimeout(() => {
                this.$emit('cambiarmodal', false);
            }, 500);
        },
        select_bodega(item) {
            const result = {
                item: item,
                param: this.param,
            };
            setTimeout(() => {
                this.$emit('bodegaseleccionada', result);
            }, 500);
        },
    },
});
const appValeSalida = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    data: function () {
        return {
            id_sol: '',
            observacion: '',
            ot: '',
            array_ProductosDisponibles: [],
            array_ProductosNoDisponibles: [],
            DatosSolcitud: [],
            array_bodegas_prod: [],
            showModal: false,
            param_component: [],
        };
    },
    created: function () {},
    mounted: function () {
        this.id_sol = $('#id_solicitud').val();

        this.LoadSolValeSalida();
    },
    methods: {
        LoadSolValeSalida: async function () {
            const fData = new FormData();
            fData.append('id_solicitud', this.id_sol);
            const response = await versaFetch({
                url: '/api/GetLoadSolValeSalida',
                method: 'POST',
                data: fData,
            });

            this.DatosSolcitud = response.solicitud;
            this.array_ProductosDisponibles = response.OK;
            this.array_ProductosNoDisponibles = response.NOK;

            this.array_ProductosDisponibles.map(item => {
                item.cantidad = parseFloat(item.cantidad);
                item.disponible = parseFloat(item.disponible);
                item.entregado = parseFloat(item.entregado);
                item.newcantidad = parseFloat(item.newcantidad);
                item.total = parseFloat(item.total);
                item.valor = parseFloat(item.valor);
                item[0].stock_actual = parseFloat(item[0].stock_actual);
            });
        },
        view_bodegas: async function (id_tipocodigo, codigo, cantidad, codigo_bodega) {
            this.param_component = {
                id_tipocodigo: id_tipocodigo,
                codigo: codigo,
                codigo_bodega: codigo_bodega,
            };

            const fData = new FormData();
            fData.append('id_tipocodigo', id_tipocodigo);
            fData.append('codigo', codigo);
            fData.append('CantidadMinima', cantidad);

            const response = await versaFetch({
                url: '/api/GetProductosBodegas',
                method: 'POST',
                data: fData,
            });

            this.array_bodegas_prod = response.map(item => {
                item.stock_actual = item.stock_actual.replace(',', '');
                item.preciocompra = item.preciocompra.replace(',', '');
                return item;
            });

            this.showModal = true;
        },
        change_update_modal: function (estatus) {
            this.showModal = estatus;
        },
        change_bodega_producto: function (bodega) {
            this.showModal = false;
            this.array_ProductosDisponibles.map(item => {
                if (item.id_tipocodigo == bodega.param.id_tipocodigo && item.codigo == bodega.param.codigo) {
                    item[0].bodega = bodega.item.descripcion;
                    item[0].codigo_bodega = bodega.item.codigo;
                    item[0].stock_actual = bodega.item.stock_actual.replace(',', '');
                    item.valor = bodega.item.preciocompra.replace(',', '');
                }
            });
        },
        move_right_product: function () {
            this.array_ProductosDisponibles.filter(item => {
                if (item[0].value == TRUE) {
                    this.array_ProductosNoDisponibles.push(item);
                }
            });

            for (let i = this.array_ProductosDisponibles.length - 1; i >= 0; i--) {
                if (this.array_ProductosDisponibles[i][0].value === true) {
                    this.array_ProductosDisponibles.splice(i, 1);
                }
            }
        },
        move_left_product: function () {
            this.array_ProductosNoDisponibles.filter(item => {
                if (item[0].value == TRUE) {
                    this.array_ProductosDisponibles.push(item);
                }
            });

            for (let i = this.array_ProductosNoDisponibles.length - 1; i >= 0; i--) {
                if (this.array_ProductosNoDisponibles[i][0].value === true) {
                    this.array_ProductosNoDisponibles.splice(i, 1);
                }
            }
        },
        saveValeVista: async function () {
            let error = false;

            if (this.array_ProductosDisponibles.length == 0) {
                show_toast('Vale de Salida', 'Debe tener a lo menos un producto dispoble para despachar');
                error = true;
            }

            const newCantidad = $domAll('input[name="newcantidad"]');
            newCantidad.forEach(item => {
                if (!(item instanceof HTMLInputElement)) return false;
                if (item.value == '') {
                    item.classList.add('is-invalid');
                    show_toast('Vale de Salida', 'Favor revisar que todas las cantidades sean mayor que 0');
                    error = true;
                    return;
                }

                if (Number(item.value) === 0) {
                    item.classList.add('is-invalid');
                    show_toast('Vale de Salida', 'Favor revisar que todas las cantidades sean mayor que 0');
                    error = true;
                    return;
                }

                const index = item.getAttribute('data-value');
                const cantidad = parseFloat(item.value);
                const stock_actual = parseFloat(this.array_ProductosDisponibles[index][0].stock_actual);
                const disponible = parseFloat(this.array_ProductosDisponibles[index].disponible);

                if (cantidad > stock_actual) {
                    item.classList.add('is-invalid');
                    show_toast(
                        'Vale de Salida',
                        'Favor revisar que todas las cantidades tengan el stock dispoble para generar vale de salida'
                    );
                    error = true;
                    return;
                }

                if (cantidad > disponible) {
                    item.classList.add('is-invalid');
                    show_toast(
                        'Vale de Salida',
                        'Favor revisar que todas las cantidades no superen lo pendiente por despachar'
                    );
                    error = true;
                    return;
                }
                item.classList.remove('is-invalid');
            });

            if (this.observacion == '') {
                show_toast('Vale de Salida', 'Debe ingresar una observacion');
                error = true;
            }
            if (error == FALSE) {
                const vale_salida = {
                    observacion: this.observacion,
                    id_solicitud: this.id_sol,
                    ot: this.ot,
                    data: this.array_ProductosDisponibles,
                };
                const FormD = new FormData();
                FormD.append('data', JSON.stringify(vale_salida));

                const json = await versaFetch({
                    url: '/api/SaveValeSalida',
                    method: 'POST',
                    data: FormD,
                });

                if (json.success == 1) {
                    show_toast(json.title, json.message, 'success', 'success');

                    const result = await Swal.fire({
                        icon: 'question',
                        title: 'Atención',
                        text: 'desea generar pdf de Vale de Salida?',
                        showCancelButton: true,
                        confirmButtonText: 'Aceptar',
                        cancelButtonText: 'Cancelar',
                    });
                    if (result.isConfirmed) {
                        this.generar_pdf(json.id);
                    }
                    setTimeout(function () {
                        location.href = '/bodega/salidas_ppal';
                    }, 2000);
                } else {
                    show_toast(json.title, json.message, 'warning', 'warning');
                }
            }
        },
        generar_pdf: function (id) {
            location.href = `/bodega/salida_pdf/${id}`;
        },
    },
    computed: {},
});
window.addEventListener('mouseup', function (e) {
    let flat = false;
    const id_modal = 'modal_bodegas_prodc';

    Array.prototype.forEach.call(e.composedPath(), function (entry) {
        if (entry.nodeName == 'DIV') {
            if (entry.getAttribute('id') == id_modal && flat == FALSE) {
                flat = true;
            }
        }
    });
    const testData = document.getElementById('modal_bodegas_prodc');
    if (testData.style[0] == undefined) {
        appValeSalida.showModal = false;
    }
});
