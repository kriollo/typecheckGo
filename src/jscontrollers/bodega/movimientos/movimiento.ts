import { $dom } from '@/jscontrollers/composables/dom-selector';
import { fetchGetProductos, fetchGetTipoCodigo } from '@/jscontrollers/composables/fetching';
import { FALSE, show_toast, versaFetch } from '@/jscontrollers/composables/utils';

function limpiar_modal(self) {
    $('#codigo').val('');
    $('#list_codigo').val('');
    $('#cantidad').val('');
    $('#valor').val('');
    $('#valortotal').val('');
    self.index_bod_o = 0;
    self.stock_minimo = 0;
    self.stock_maximo = 0;
    self.stock_actual = 0;
}
async function cagar_codigos(self, tipocodigo, codigo, desc_codigo) {
    self.array_codigo = [];
    $('#list_codigo').prop('disabled', true);
    $('#list_codigo').val('');
    $('#codigo').val(0);

    const data = await fetchGetProductos(tipocodigo);
    if (!(typeof data === 'boolean')) {
        self.array_codigo = data;
        $('#list_codigo').prop('disabled', false);
        const list_codigo = $dom('#list_codigo');
        if (list_codigo instanceof HTMLElement) {
            list_codigo.focus();
        }
        if (codigo != '') {
            $('#list_codigo').val(desc_codigo);
            $('#codigo').val(codigo);
        }
    }
}
async function cargar_bodegas(self, tipocodigo, codigo) {
    self.array_bodega_d = [];
    self.array_bodega_o = [];
    $('#list_bodega_o').prop('disabled', true);
    $('#list_bodega_o').val('');
    $('#bodega_o').val(0);
    $('#list_bodega_d').prop('disabled', true);
    $('#list_bodega_d').val('');
    $('#bodega_d').val(0);
    self.index_bod_o = 0;
    self.stock_minimo = 0;
    self.stock_maximo = 0;
    self.stock_actual = 0;

    const FormD = new FormData();
    FormD.append('id_tipocodigo', tipocodigo);
    FormD.append('codigo', codigo);
    const data = await versaFetch({
        url: '/api/getBodegasMovimientoByCodigo',
        method: 'POST',
        data: FormD,
    });
    if (!(typeof data === 'boolean')) {
        self.array_bodega_o = data.bodega_o;
        self.array_bodega_dTotal = data.bodega_d;
        $('#list_bodega_o').prop('disabled', false);
        $('#list_bodega_d').prop('disabled', false);
        const list_bodega_o = $dom('#list_bodega_o');
        if (list_bodega_o instanceof HTMLElement) {
            list_bodega_o.focus();
        }
    }
}
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
        let element = null;
        switch (tabla) {
            case 'tipocodigo':
                cagar_codigos(self, match, null, null);
                element = $dom('#list_codigo');
                break;
            case 'codigo':
                cargar_bodegas(self, $('#tipocodigo').val(), match);
                break;
            case 'bodega_o':
                self.index_bod_o = $(`#${list}`).find(`option[value="${val}"]`).data('value1');
                self.stock_minimo = self.array_bodega_o[self.index_bod_o].stock_minimo;
                self.stock_maximo = self.array_bodega_o[self.index_bod_o].stock_maximo;
                self.stock_actual = self.array_bodega_o[self.index_bod_o].stock_actual;
                self.valor = self.array_bodega_o[self.index_bod_o].preciocompra;

                element = $dom('#cantidad');
                self.array_bodega_d = [];
                $('#list_bodega_d').prop('disabled', true);
                $('#list_bodega_d').val('');
                $('#bodega_d').val(0);

                self.array_bodega_dTotal.forEach(item => {
                    if (match != item.codigo) {
                        self.array_bodega_d.push({
                            codigo: item.codigo,
                            descripcion: item.descripcion,
                        });
                    }
                });
                $('#list_bodega_d').prop('disabled', false);
                break;
        }
        if (element instanceof HTMLElement) {
            element.focus();
        }
    }
    $(`#${selec}`).prop('disabled', false);
}
const _appMovimientoBodega = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    data: function () {
        return {
            array_tipocodigo: [],
            array_codigo: [],
            array_bodega_o: [],
            array_bodega_dTotal: [],
            array_bodega_d: [],
            array_mov_bodega: {
                observacion: '',
            },
            array_items: [],
            modal_accion: 'new',
            edit_index: '',
            index_doc: 0,
            index_bod_o: 0,
            stock_minimo: 0,
            stock_maximo: 0,
            stock_actual: 0,
            valor: 0,
        };
    },
    created: async function () {
        const data = await fetchGetTipoCodigo();
        if (!(typeof data === 'boolean')) {
            this.array_tipocodigo = data;
        }
    },
    mounted: function () {
        const index_doc = $dom('#index_doc');
        this.index_doc = index_doc ? (index_doc as HTMLInputElement).value : 0;
        if (this.index_doc != 0) {
            this.load_doc_movimiento(this.index_doc);
        }
    },
    methods: {
        modal_agregar_item: function () {
            limpiar_modal(this);
            this.modal_accion = 'new';
            $('#modal_agregar_item').modal('show');
        },
        limpiar_tabla: async function () {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de limpiar el detalle ingresado?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                this.array_items = [];
            }
        },
        save_new_item: function () {
            const cod_tipocodigo = $('#tipocodigo').val();
            const codigo = $('#codigo').val();
            const codigo_bodega_o = $('#bodega_o').val();
            const codigo_bodega_d = $('#bodega_d').val();

            const cantidad = ($dom('#cantidad') as HTMLInputElement).value;

            let error = false;

            if (cod_tipocodigo == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un tipo de codigo');
                error = true;
            }
            if (codigo == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un producto');
                error = true;
            }
            if (codigo_bodega_o == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una bodega de Origen');
                error = true;
            }
            if (codigo_bodega_d == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una bodega de destino');
                error = true;
            }
            if (cantidad == '' || cantidad == '0') {
                show_toast('Registro Nuevo Item', 'Debe ingresar cantidad de nuevo item');
                error = true;
            }
            if (parseFloat(cantidad) > parseFloat(this.stock_actual)) {
                show_toast('Registro Nuevo Item', 'Debe ingresar cantidad menor igual al stock actual');
                error = true;
            }
            this.array_items.forEach(function callback(el) {
                if (
                    el.cod_tipocodigo === cod_tipocodigo &&
                    el.codigo === codigo &&
                    el.cod_bodega_o === codigo_bodega_o &&
                    el.cod_bodega_d === codigo_bodega_d
                ) {
                    show_toast(
                        'Registro Nuevo Item',
                        'El producto, bodega de origen y bodega de destino seleccionado ya se encuentra ingresado en el detalle'
                    );
                    error = true;
                }
            });

            if (FALSE == error) {
                this.array_items.push({
                    cod_tipocodigo: cod_tipocodigo,
                    desc_tipocodigo: $('#list_tipocodigo').val(),
                    codigo: codigo,
                    desc_codigo: $('#list_codigo').val(),
                    cod_bodega_o: codigo_bodega_o,
                    desc_bodega_o: $('#list_bodega_o').val(),
                    cod_bodega_d: codigo_bodega_d,
                    desc_bodega_d: $('#list_bodega_d').val(),
                    cantidad: cantidad,
                    stock_actual: this.stock_actual,
                    stock_maximo: this.stock_maximo,
                    stock_minimo: this.stock_maximo,
                    valor: this.valor,
                });
                $('#modal_agregar_item').modal('hide');
                limpiar_modal(this);
            }
        },
        load_edit_item: async function (index) {
            $('#tipocodigo').val(this.array_items[index].cod_tipocodigo);
            $('#list_tipocodigo').val(this.array_items[index].desc_tipocodigo);
            await cagar_codigos(
                this,
                this.array_items[index].cod_tipocodigo,
                this.array_items[index].codigo,
                this.array_items[index].desc_codigo
            );

            $('#bodega_o').val(this.array_items[index].cod_bodega_o);
            $('#list_bodega_o').val(this.array_items[index].desc_bodega_o);

            $('#bodega_d').val(this.array_items[index].cod_bodega_d);
            $('#list_bodega_d').val(this.array_items[index].desc_bodega_d);

            $('#cantidad').val(this.array_items[index].cantidad.replace(/\./g, '').replace(/,/g, '.'));

            this.stock_minimo = this.array_items[index].stock_minimo;
            this.stock_maximo = this.array_items[index].stock_maximo;
            this.stock_actual = this.array_items[index].stock_actual;
            this.valor = this.array_items[index].valor;

            this.modal_accion = 'edit';
            this.edit_index = index;

            $('#edit_index').val(index);
            setTimeout(function () {
                $('#modal_agregar_item').modal('show');
            }, 500);
        },
        remove_item: async function (index) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de eliminar este item?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });

            if (result.isConfirmed) {
                this.array_items.splice(index, 1);
            }
        },
        save_edit_item: function () {
            const cod_tipocodigo = $('#tipocodigo').val();
            const codigo = $('#codigo').val();
            const codigo_bodega_o = $('#bodega_o').val();
            const codigo_bodega_d = $('#bodega_d').val();

            const cantidad = ($dom('#cantidad') as HTMLInputElement).value;

            let error = false;

            if (cod_tipocodigo == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un tipo de codigo');
                error = true;
            }
            if (codigo == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un producto');
                error = true;
            }
            if (codigo_bodega_o == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una bodega de Origen');
                error = true;
            }
            if (codigo_bodega_d == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una bodega de destino');
                error = true;
            }
            if (cantidad == '' || cantidad == '0') {
                show_toast('Registro Nuevo Item', 'Debe ingresar cantidad de nuevo item');
                error = true;
            }
            if (parseFloat(cantidad) > parseFloat(this.stock_actual)) {
                show_toast('Registro Nuevo Item', 'Debe ingresar cantidad menor igual al stock actual');
                error = true;
            }
            this.array_items.forEach(function callback(el, index) {
                if (
                    this.edit_index != index &&
                    el.cod_tipocodigo == cod_tipocodigo &&
                    el.codigo == codigo &&
                    el.cod_bodega_o == codigo_bodega_o &&
                    el.cod_bodega_d == codigo_bodega_d
                ) {
                    show_toast(
                        'Registro Nuevo Item',
                        'El producto, bodega de origen y bodega de destino seleccionado ya se encuentra ingresado en el detalle'
                    );
                    error = true;
                }
            });

            if (FALSE == error) {
                const index = this.edit_index;

                this.array_items[index].cod_tipocodigo = cod_tipocodigo;
                this.array_items[index].desc_tipocodigo = $('#list_tipocodigo').val();
                this.array_items[index].codigo = codigo;
                this.array_items[index].desc_codigo = $('#list_codigo').val();
                this.array_items[index].cod_bodega_o = codigo_bodega_o;
                this.array_items[index].desc_bodega_o = $('#list_bodega_o').val();
                this.array_items[index].cod_bodega_d = codigo_bodega_d;
                this.array_items[index].desc_bodega_d = $('#list_bodega_d').val();
                this.array_items[index].cantidad = cantidad;
                this.array_items[index].stock_actual = this.stock_actual;
                this.array_items[index].stock_maximo = this.stock_maximo;
                this.array_items[index].stock_minimo = this.stock_maximo;
                this.array_items[index].valor = this.valor;

                $('#modal_agregar_item').modal('hide');
                limpiar_modal(this);
            }
        },
        save_doc_movimiento: async function (id) {
            const observacion = ($dom('#observacion') as HTMLTextAreaElement).value;

            let error = false;
            if (this.array_items.length <= 0) {
                show_toast('Movimiento entre bodegas', 'Debe ingresar a lo menos un item en el Documento Proveedor');
                error = true;
            }
            if (observacion == '') {
                show_toast('Movimiento entre bodegas', 'Debe ingresar una observacion');
                error = true;
            }

            if (error == FALSE) {
                const FormD = new FormData();
                FormD.append('id', id);
                FormD.append('observacion', observacion);

                FormD.append('items', JSON.stringify(this.array_items));

                const json = await versaFetch({
                    url: '/api/save_movimiento_bodegas',
                    method: 'POST',
                    data: FormD,
                });

                if (json.success == 1) {
                    show_toast(json.title, json.message, 'success', 'success');
                    setTimeout(function () {
                        location.href = '/bodega/movimiento';
                    }, 1000);
                } else {
                    show_toast(json.title, json.message, 'warning', 'warning');
                }
            }
        },
        load_doc_movimiento: async function (id) {
            const json = await versaFetch({
                url: '/api/get_bodega_MovimientoById',
                method: 'POST',
                data: JSON.stringify({ id }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            this.array_items = [];
            this.array_mov_bodega = {
                observacion: '',
            };
            if (!(typeof json == 'boolean')) {
                this.array_mov_bodega = json.encabezado;

                if (json.detalle != FALSE) {
                    this.array_items = json.detalle;
                }
            }
        },
        obtener_select_item: function (tabla, selec, inp) {
            obtener_select_item(this, tabla, selec, inp);
        },
    },
});
