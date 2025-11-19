import { $dom } from '@/jscontrollers/composables/dom-selector';
import { fetchgetProveedores } from '@/jscontrollers/composables/fetching';
import { TRUE, show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
function obtener_select_item(self, tabla, selec, inp) {
    $(`#${selec}`).prop('disabled', true);
    const val = $(`#${selec}`).val();
    const list = $(`#${selec}`).attr('list');

    const elem = document.getElementById(list);
    const op = elem.querySelector(`option[value='${val}']`);
    let match = '0';
    if (op != null) match = op.getAttribute('data-value2');
    else $(`#${selec}`).prop('disabled', false);

    $(`#${inp}`).val(match);

    if (match != '') {
        if (tabla === 'proveedor') {
            self.rut_proveedor = match;
            self.load_doc_envio(match, $('#ndocumento').val());
        }
    }
    $(`#${selec}`).prop('disabled', false);
}
const _appPagoProveedor = new Vue({
    el: '#content',
    delimiters: ['${', '}'],
    data: function () {
        return {
            frame_show: 0,
            rut_proveedor: '',
            id_envio_search: '',
            doc_search: '',
            update_envio: false,
            array_envio: {
                created_at: '',
                name: '',
            },
            array_envia_pago: [],
            array_doc_envio: [],
            array_proveedor: [],
            array_doc_proveedor: [],
            params_filtro_envio_pago: [
                {
                    dias: 30,
                    field: 'fecha_ingreso',
                },
            ],
        };
    },
    created: async function () {
        const data = await fetchgetProveedores({ estado: '1' });
        this.array_proveedor = data.map(value => ({
            text: value.rut,
            value: value.nombre,
            selected: false,
        }));

        if (localStorage.params_filtro_envio_pago)
            this.params_filtro_envio_pago =
                localStorage.params_filtro_envio_pago == 'undefined'
                    ? []
                    : JSON.parse(localStorage.params_filtro_envio_pago);
        else localStorage.params_filtro_envio_pago = JSON.stringify(this.params_filtro_envio_pago);
    },
    mounted: function () {
        this.update_frame_show(1);
        this.load_doc_envio(null, null, 'load');
    },
    methods: {
        update_frame_show: function (/** @type {Number} */ id) {
            this.update_envio = false;
            this.frame_show = id;
            this.array_envio = {
                created_at: '',
                name: '',
            };
            this.array_envia_pago = [];
            this.array_doc_envio = [];
        },
        load_doc_envio: async function (
            /** @type {String} */ rut_proveedor,
            /** @type {Number} */ ndocumento,
            /** @type {String} */ origen
        ) {
            this.array_doc_envio = [];
            const response = await versaFetch({
                url: '/api/get_doc_to_envio',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    rut_proveedor,
                    ndocumento,
                    origen,
                    params_filtro: this.params_filtro_envio_pago,
                }),
            });
            if (typeof response !== 'boolean') {
                response.forEach(value => {
                    const result = this.array_envia_pago.find(value2 => value2.id === value.id);
                    if (result === undefined) {
                        this.array_doc_envio.push({
                            id: value.id,
                            rut: value.rut,
                            nombre: value.nombre,
                            tipo_doc: value.descripcion,
                            ndoc: `${value.folion}-${value.indice}`,
                            fecha: value.fecha,
                            valor: value.totalvalor,
                            oc: `${value.orden_compra}-${value.orden_indice}`,
                            pronto_pago: value.pronto_pago == 1,
                            fecha_ingreso: value.fecha_ingreso,
                            hesmigo: value.hesmigo,
                        });
                    }
                });
            }
        },
        traspasa_doc: function (/** @type {number} */ indice) {
            this.array_envia_pago.push({
                id: this.array_doc_envio[indice].id,
                rut: this.array_doc_envio[indice].rut,
                nombre: this.array_doc_envio[indice].nombre,
                tipo_doc: this.array_doc_envio[indice].tipo_doc,
                ndoc: this.array_doc_envio[indice].ndoc,
                fecha: this.array_doc_envio[indice].fecha,
                valor: this.array_doc_envio[indice].valor,
                oc: this.array_doc_envio[indice].oc,
                pronto_pago: this.array_doc_envio[indice].pronto_pago == TRUE ? 'Si' : 'No',
                fecha_ingreso: this.array_doc_envio[indice].fecha_ingreso,
                hesmigo: this.array_doc_envio[indice].hesmigo,
            });

            this.array_doc_envio.splice(indice, 1);
        },
        devuelve_doc: function (/** @type {number} */ indice) {
            this.array_doc_envio.push({
                id: this.array_envia_pago[indice].id,
                rut: this.array_envia_pago[indice].rut,
                nombre: this.array_envia_pago[indice].nombre,
                tipo_doc: this.array_envia_pago[indice].tipo_doc,
                ndoc: this.array_envia_pago[indice].ndoc,
                fecha: this.array_envia_pago[indice].fecha,
                valor: this.array_envia_pago[indice].valor,
                oc: this.array_envia_pago[indice].oc,
                pronto_pago: this.array_envia_pago[indice].pronto_pago == 'Si',
                fecha_ingreso: this.array_envia_pago[indice].fecha_ingreso,
                hesmigo: this.array_envia_pago[indice].hesmigo,
            });

            this.array_envia_pago.splice(indice, 1);
        },
        send_to_pay: async function () {
            if (this.array_envia_pago.length > 0) {
                const FormD = new FormData();
                FormD.append('items', JSON.stringify(this.array_envia_pago));
                if (this.update_envio == TRUE) {
                    FormD.append('id', this.id_envio_search);
                }

                const result = await Swal.fire({
                    title: 'Atención',
                    text: 'Está seguro de enviar estos documentos a pago?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Aceptar',
                    cancelButtonText: 'Cancelar',
                });
                if (result.isConfirmed) {
                    const json = await versaFetch({
                        url: '/api/save_send_to_pay',
                        method: 'POST',
                        data: FormD,
                    });
                    if (json.success == 1) {
                        show_toast(json.title, json.message, 'success', 'success');

                        const result = await Swal.fire({
                            title: 'Atención',
                            text: 'desea generar Excel de para envio?',
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Aceptar',
                            cancelButtonText: 'Cancelar',
                        });
                        if (result.isConfirmed) {
                            this.generateExcelDoc(json.id);
                        }
                        setTimeout(function () {
                            location.href = '/registragasto/pago_provee';
                        }, 1000);
                    } else {
                        show_toast(json.title, json.message, 'warning', 'warning');
                    }
                }
            }
        },
        generateExcelDoc: function (/** @type {Number} */ id) {
            location.href = `/registragasto/excel_envio_documento/${id}`;
        },
        delete_pay: async function (id) {
            if (this.array_envia_pago.length > 0) {
                const FormD = new FormData();
                FormD.append('id', id);
                FormD.append('items', JSON.stringify(this.array_envia_pago));

                const result = await Swal.fire({
                    title: 'Atención',
                    text: 'Está seguro de eliminar este documento?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Aceptar',
                    cancelButtonText: 'Cancelar',
                });
                if (result.isConfirmed) {
                    const json = await versaFetch({
                        url: '/api/delete_send_to_pay',
                        method: 'POST',
                        data: FormD,
                    });
                    if (json.success == 1) {
                        show_toast(json.title, json.message, 'success', 'success');
                        setTimeout(function () {
                            location.href = '/registragasto/pago_provee';
                        }, 1000);
                    } else {
                        show_toast(json.title, json.message, 'warning', 'warning');
                    }
                }
            }
        },
        search_id_envio: async function (id) {
            this.array_envio = {
                created_at: '',
                name: '',
            };
            this.array_envia_pago = [];
            this.update_envio = false;

            const fData = new FormData();
            fData.append('id', id);

            const response = await versaFetch({
                url: '/api/get_send_to_pay',
                method: 'POST',
                data: fData,
            });

            this.update_envio = Array.isArray(response.encabezado);
            if (Array.isArray(response.encabezado) == TRUE) {
                this.array_envio = response.encabezado[0];
                this.array_envia_pago = response.detalle.map(value => ({
                    id: value.id,
                    rut: value.rut,
                    nombre: value.nombre,
                    tipo_doc: value.descripcion,
                    ndoc: `${value.folion}-${value.indice}`,
                    fecha: value.fecha,
                    valor: value.totalvalor,
                    oc: `${value.orden_compra}-${value.orden_indice}`,
                    pronto_pago: value.pronto_pago == 1 ? 'Si' : 'No',
                    hesmigo: value.hesmigo,
                }));
            }
        },
        search_doc_envio: async function (doc) {
            this.array_envio = {
                created_at: '',
                name: '',
            };
            this.array_envia_pago = [];
            this.update_envio = false;

            const fData = new FormData();
            fData.append('doc', doc);

            const response = await versaFetch({
                url: '/api/get_send_to_pay',
                method: 'POST',
                data: fData,
            });
            this.array_doc_proveedor = response.map(value => ({
                id: value.id,
                rut: value.rut,
                nombre: value.nombre,
                tipo_doc: value.descripcion,
                ndoc: `${value.folion}-${value.indice}`,
                id_enviodoc: value.id_enviodoc,
                created_at: value.created_at,
            }));
        },
        view_envio_doc: function (id) {
            if (id != '') {
                this.id_envio_search = id;
                this.search_id_envio(id);
            }
        },
        load_filter_enviapago: async function () {
            if (this.params_filtro_envio_pago[0].field == undefined)
                this.params_filtro_envio_pago[0].field = 'Fecha Ingreso';

            const selectedValue = this.params_filtro_envio_pago[0].field;
            const options = {
                FechaIngreso: 'Fecha Ingreso',
                FechaDocumento: 'Fecha Documento',
                FechaVencimientoDocumento: 'Fecha Vencimiento Documento',
            };

            // Crear un nuevo objeto de opciones con la clave seleccionada en primer lugar
            let optionsOrdered = {};
            Object.entries(options).forEach(([key, value]) => {
                if (value === selectedValue) {
                    optionsOrdered = { [key]: value };
                }
            });

            // Añadir el resto de las claves, excepto la seleccionada
            Object.entries(options).forEach(([key, value]) => {
                if (value !== selectedValue) {
                    optionsOrdered[key] = value;
                }
            });

            const result = await Swal.fire({
                title: 'Atención',
                text: 'Desea cambiar el filtro de envio a pago?',
                icon: 'question',
                html: html`
                    <div class="flex flex-wrap content-start ">
                        <div class="form-group">
                            <label for="dias">Dias a Filtrar:</label>
                            <input
                                id="dias"
                                type="number"
                                class="form-control"
                                onfocus="this.select()"
                                value="${this.params_filtro_envio_pago[0].dias}" />
                        </div>
                    </div>
                `,
                input: 'select',
                inputOptions: {
                    ...optionsOrdered,
                },
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
                inputValidator: value => {
                    if (!value) {
                        return 'Debe seleccionar una opción';
                    }
                },
            });
            if (result.isConfirmed) {
                const $dias = ($dom('#dias') as HTMLInputElement).value;

                this.params_filtro_envio_pago[0].dias = $dias;
                this.params_filtro_envio_pago[0].field = options[result.value];
                localStorage.params_filtro_envio_pago = JSON.stringify(this.params_filtro_envio_pago);

                this.update_frame_show(1);
                await this.load_doc_envio(null, null, 'load');
            }
        },
        obtener_select_item: function (tabla, selec, inp) {
            obtener_select_item(this, tabla, selec, inp);
        },
    },
});
