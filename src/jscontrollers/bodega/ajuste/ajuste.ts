import { $dom } from '@/jscontrollers/composables/dom-selector';
import { FALSE, show_toast, versaFetch } from '@/jscontrollers/composables/utils';
import type { VersaFetchResponse } from 'versaTypes';

const cagar_codigos = async (self, tipocodigo, codigo, desc_codigo) => {
    self.array_codigo = [];
    $('#list_codigo').prop('disabled', true);
    $('#list_codigo').val('');
    $('#codigo').val(0);

    const FormD = new FormData();
    FormD.append('id_tipocodigo', tipocodigo);
    FormD.append('estado', '1');

    const data = (await versaFetch({
        url: '/api/getCodigoByTipo',
        method: 'POST',
        data: FormD,
    })) as VersaFetchResponse | false;

    if (data != FALSE) {
        $.each(data, (index, value) => {
            self.array_codigo.push({
                codigo: value.codigo,
                descripcion: value.descripcion,
            });
        });
        const list_codigo = $dom('#list_codigo');
        if (list_codigo instanceof HTMLInputElement) {
            list_codigo.removeAttribute('disabled');
            list_codigo.focus();
            if (codigo != '' && codigo !== undefined) {
                list_codigo.value = desc_codigo;
                const codigoInput = $dom('#codigo');
                if (codigoInput instanceof HTMLInputElement) {
                    codigoInput.value = codigo;
                }
            }
        }
    }
};
const cargar_bodegas = async (self, tipocodigo, codigo) => {
    self.array_bodega_o = [];
    $('#list_bodega_o').prop('disabled', true);
    $('#list_bodega_o').val('');
    $('#bodega_o').val(0);
    self.index_bod_o = 0;
    self.stock_minimo = 0;
    self.stock_maximo = 0;
    self.stock_actual = 0;

    const FormD = new FormData();
    FormD.append('id_tipocodigo', tipocodigo);
    FormD.append('codigo', codigo);

    const data = (await versaFetch({
        url: '/api/getBodegasMovimientoByCodigo',
        method: 'POST',
        data: FormD,
    })) as VersaFetchResponse | false;

    if (data != FALSE) {
        self.array_bodega_o = data.bodega_o;
        $('#list_bodega_o').prop('disabled', false);
        const list_bodega_o = $dom('#list_bodega_o');
        if (list_bodega_o instanceof HTMLInputElement) {
            list_bodega_o.focus();
        }
    }
};
const limpiar_modal = self => {
    const codigo = $dom('#codigo');
    if (codigo instanceof HTMLInputElement) {
        codigo.value = '';
    }
    const list_codigo = $dom('#list_codigo');
    if (list_codigo instanceof HTMLInputElement) {
        list_codigo.value = '';
    }
    const cantidad = $dom('#cantidad');
    if (cantidad instanceof HTMLInputElement) {
        cantidad.value = '';
    }
    const valor = $dom('#valor');
    if (valor instanceof HTMLInputElement) {
        valor.value = '';
    }
    const valorTotal = $dom('#valortotal');
    if (valorTotal instanceof HTMLInputElement) {
        valorTotal.value = '';
    }
    self.index_bod_o = 0;
    self.stock_minimo = 0;
    self.stock_maximo = 0;
    self.stock_actual = 0;
};
const obtener_select_item = async (self, tabla, selec, inp) => {
    $(`#${selec}`).prop('disabled', true);
    const val = $(`#${selec}`).val();
    const list = $(`#${selec}`).attr('list');

    const elem = document.getElementById(list);
    const op = elem.querySelector(`option[value='${val}']`);
    let match = '0';
    if (op !== null) match = op.getAttribute('data-value2');
    else $(`#${selec}`).prop('disabled', false);

    $(`#${inp}`).val(match);

    if (match != '') {
        let element = null;
        switch (tabla) {
            case 'tipocodigo': {
                await cagar_codigos(self, match, null, null);
                element = $dom('#codigo');
                if (element instanceof HTMLInputElement) {
                    element.focus();
                }
                break;
            }
            case 'codigo': {
                const tipoCodigo = $dom('#tipocodigo');
                if (tipoCodigo instanceof HTMLInputElement) {
                    await cargar_bodegas(self, tipoCodigo.value, match);
                }
                break;
            }
            case 'bodega_o': {
                self.index_bod_o = $(`#${list}`).find(`option[value="${val}"]`).data('value1');

                self.stock_minimo = 0;
                self.stock_maximo = 0;
                self.stock_actual = 0;
                self.valor = 0;

                if (self.array_bodega_o !== FALSE) {
                    const result = self.array_bodega_o.find(item => item.cod_bodega == match);
                    if (result !== undefined) {
                        self.stock_minimo = result.stock_minimo;
                        self.stock_maximo = result.stock_maximo;
                        self.stock_actual = result.stock_actual;
                        self.valor = result.preciocompra;
                    }
                }

                element = $('#cantidad');
                break;
            }
        }
        if (element instanceof HTMLInputElement) {
            element.focus();
        }
    }
    $(`#${selec}`).prop('disabled', false);
};
/* eslint-disable */
const _appAjuste = new Vue({
    /* eslint-enable */
    el: '.content',
    delimiters: ['${', '}'],
    data() {
        return {
            array_tipocodigo: [],
            array_codigo: [],
            array_bodega: [],
            array_bodega_o: [],
            array_ajuste_bodega: {
                observacion: '',
            },
            array_items: [],
            value_option: 'Ingreso',
            modal_accion: 'new',
            edit_index: '',
            index_doc: 0,
            index_bod_o: 0,
            stock_minimo: 0,
            stock_maximo: 0,
            stock_actual: 0,
            valor: 0,
            select_bodega: '',
        };
    },
    async mounted() {
        // Carga Tipo Código
        const response = (await versaFetch({
            url: '/api/getTipoCodigo',
            method: 'POST',
            data: JSON.stringify({ estado: 1 }),
            headers: { 'Content-Type': 'application/json' },
        })) as VersaFetchResponse | false;
        if (FALSE !== response) {
            response.forEach(value => {
                this.array_tipocodigo.push({
                    value: value.descripcion,
                    id: value.id,
                });
            });
        }

        // Carga Bodegas
        const responseBodegas = (await versaFetch({
            url: '/api/getBodegas',
            method: 'POST',
            data: JSON.stringify({ estado: 1 }),
            headers: { 'Content-Type': 'application/json' },
        })) as VersaFetchResponse | false;
        if (FALSE !== responseBodegas) {
            responseBodegas.forEach(value => {
                this.array_bodega.push({
                    descripcion: value.descripcion,
                    codigo: value.codigo,
                });
            });
        }

        this.index_doc = $('#index_doc').val();
        if (this.index_doc != 0) {
            this.load_doc_ajuste(this.index_doc);
        }
    },
    methods: {
        async load_all_products() {
            let error = false;
            if (this.select_bodega == '') {
                show_toast('Ajuste de Inventario', 'Debe seleccionar una bodega antes de procesar');
                error = true;
            }
            if (FALSE == error) {
                this.array_items = [];
                const FormD = new FormData();
                FormD.append('cod_bodega', this.select_bodega);
                const response = await versaFetch({
                    url: '/api/getALLProductosByBodega',
                    method: 'POST',
                    data: FormD,
                });

                if (response.detalle != FALSE) {
                    this.array_items = response.detalle;
                }
            }
        },
        modal_agregar_item() {
            limpiar_modal(this);
            this.modal_accion = 'new';
            $('#modal_agregar_item').modal('show');
        },
        async limpiar_tabla() {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de limpiar el detalle ingresado?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                this.array_items = [];
            }
        },
        save_new_item() {
            const cod_tipocodigo = ($dom('#tipocodigo') as HTMLSelectElement)?.value;
            const codigo = ($dom('#codigo') as HTMLInputElement)?.value;
            const codigo_bodega_o = ($dom('#bodega_o') as HTMLSelectElement)?.value;
            const cantidad = ($dom('#cantidad') as HTMLInputElement)?.value;
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

            if (cantidad == '' || cantidad == '0') {
                show_toast('Registro Nuevo Item', 'Debe ingresar cantidad de nuevo item');
                error = true;
            }
            this.array_items.forEach(el => {
                if (
                    el.cod_tipocodigo === cod_tipocodigo &&
                    el.codigo === codigo &&
                    el.cod_bodega_o === codigo_bodega_o
                ) {
                    show_toast(
                        'Registro Nuevo Item',
                        'El producto, bodega de origen y bodega de destino seleccionado ya se encuentra ingresado en el detalle'
                    );
                    error = true;
                }
            });

            let stock_final = 0;
            if (this.value_option == 'Descuento') {
                stock_final = parseFloat(this.stock_actual) - parseFloat(cantidad);
                if (stock_final < 0) {
                    show_toast(
                        'Registro Nuevo Item',
                        `La cantidad a descontar no puede dejar el stock final en valor negativo: ${stock_final}`
                    );
                    error = true;
                }
            } else {
                stock_final = parseFloat(this.stock_actual) + parseFloat(cantidad);
            }

            if (FALSE == error) {
                this.array_items.push({
                    cod_tipocodigo,
                    desc_tipocodigo: ($dom('#list_tipocodigo') as HTMLInputElement)?.value,
                    codigo,
                    desc_codigo: ($dom('#list_codigo') as HTMLInputElement)?.value,
                    cod_bodega_o: codigo_bodega_o,
                    desc_bodega_o: ($dom('#list_bodega_o') as HTMLInputElement)?.value,
                    cantidad,
                    stock_actual: this.stock_actual,
                    stock_maximo: this.stock_maximo,
                    stock_minimo: this.stock_maximo,
                    valor: this.valor,
                    tipo_movimiento: this.value_option,
                    stock_final,
                });
                $('#modal_agregar_item').modal('hide');
                limpiar_modal(this);
            }
        },
        async load_edit_item(index) {
            ($dom('#tipocodigo') as HTMLSelectElement).value = this.array_items[index].cod_tipocodigo;
            ($dom('#list_tipocodigo') as HTMLInputElement).value = this.array_items[index].desc_tipocodigo;
            await cagar_codigos(
                this,
                this.array_items[index].cod_tipocodigo,
                this.array_items[index].codigo,
                this.array_items[index].desc_codigo
            );

            ($dom('#bodega_o') as HTMLSelectElement).value = this.array_items[index].cod_bodega_o;
            ($dom('#list_bodega_o') as HTMLInputElement).value = this.array_items[index].desc_bodega_o;

            ($dom('#cantidad') as HTMLInputElement).value = this.array_items[index].cantidad;

            this.stock_minimo = this.array_items[index].stock_minimo;
            this.stock_maximo = this.array_items[index].stock_maximo;
            this.stock_actual = this.array_items[index].stock_actual;
            this.valor = this.array_items[index].valor;
            this.value_option = this.array_items[index].tipo_movimiento;

            this.modal_accion = 'edit';
            this.edit_index = index;

            const editIndex = $dom('#edit_index');
            if (editIndex instanceof HTMLInputElement) {
                editIndex.value = index;
            }
            setTimeout(() => {
                $('#modal_agregar_item').modal('show');
            }, 500);
        },
        async remove_item(index) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de eliminar este item?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                this.array_items.splice(index, 1);
            }
        },
        save_edit_item() {
            const cod_tipocodigo = ($dom('#tipocodigo') as HTMLSelectElement)?.value;
            const codigo = ($dom('#codigo') as HTMLInputElement)?.value;
            const codigo_bodega_o = ($dom('#bodega_o') as HTMLSelectElement)?.value;
            const cantidad = ($dom('#cantidad') as HTMLInputElement)?.value;

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

            if (cantidad == '' || cantidad === '0') {
                show_toast('Registro Nuevo Item', 'Debe ingresar cantidad de nuevo item');
                error = true;
            }
            this.array_items.forEach((el, index) => {
                if (
                    this.edit_index != index &&
                    el.cod_tipocodigo == cod_tipocodigo &&
                    el.codigo == codigo &&
                    el.cod_bodega_o == codigo_bodega_o
                ) {
                    show_toast(
                        'Registro Nuevo Item',
                        'El producto, bodega de origen y bodega de destino seleccionado ya se encuentra ingresado en el detalle'
                    );
                    error = true;
                }
            });

            let stock_final = 0;
            if (this.value_option == 'Descuento') {
                stock_final = parseFloat(this.stock_actual) - parseFloat(cantidad);
                if (stock_final < 0) {
                    show_toast(
                        'Registro Nuevo Item',
                        `La cantidad a descontar no puede dejar el stock final en valor negativo: ${stock_final}`
                    );
                    error = true;
                }
            } else {
                stock_final = parseFloat(this.stock_actual) + parseFloat(cantidad);
            }

            if (FALSE == error) {
                const index = this.edit_index;

                this.array_items[index].cod_tipocodigo = cod_tipocodigo;
                this.array_items[index].desc_tipocodigo = ($dom('#list_tipocodigo') as HTMLInputElement)?.value;
                this.array_items[index].codigo = codigo;
                this.array_items[index].desc_codigo = ($dom('#list_codigo') as HTMLInputElement)?.value;
                this.array_items[index].cod_bodega_o = codigo_bodega_o;
                this.array_items[index].desc_bodega_o = ($dom('#list_bodega_o') as HTMLInputElement)?.value;
                this.array_items[index].cantidad = cantidad;
                this.array_items[index].stock_actual = this.stock_actual;
                this.array_items[index].stock_maximo = this.stock_maximo;
                this.array_items[index].stock_minimo = this.stock_maximo;
                this.array_items[index].valor = this.valor;
                this.array_items[index].tipo_movimiento = this.value_option;
                this.array_items[index].stock_final = stock_final;

                $('#modal_agregar_item').modal('hide');
                limpiar_modal(this);
            }
        },
        async save_doc_ajuste(id) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de guardar el ajuste de inventario?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });
            if (!result.isConfirmed) {
                return;
            }

            //Filtro sólo item modificados
            const new_item = this.array_items.filter(items => items.tipo_movimiento != '--' && items.cantidad != 0);
            const observacion = ($dom('#observacion') as HTMLInputElement)?.value;

            let error = false;
            if (new_item.length <= 0) {
                show_toast('Ajuste de Inventario', 'Debe ingresar a lo menos un item en el Documento Proveedor');
                error = true;
            }
            if (observacion == '') {
                show_toast('Ajuste de Inventario', 'Debe ingresar una observacion');
                error = true;
            }
            if (error == FALSE) {
                const FormD = new FormData();
                FormD.append('id', id);
                FormD.append('observacion', observacion);

                FormD.append('items', JSON.stringify(new_item));

                const json = await versaFetch({
                    url: '/api/save_ajuste_bodegas',
                    method: 'POST',
                    data: FormD,
                });

                if (json.success == 1) {
                    show_toast(json.title ?? 'success', json.message, 'success', 'success');
                    setTimeout(() => {
                        location.href = '/bodega/ajuste';
                    }, 1000);
                } else {
                    show_toast(json.title ?? 'warning', json.message, 'warning', 'warning');
                }
            }
        },
        async load_doc_ajuste(id) {
            const FormD = new FormData();
            FormD.append('id', id);

            const json = (await versaFetch({
                url: '/api/get_bodega_AjusteById',
                method: 'POST',
                data: FormD,
            })) as VersaFetchResponse | false;

            if (json !== FALSE) {
                this.array_items = [];
                this.array_ajuste_bodega = {
                    observacion: '',
                };

                this.array_ajuste_bodega = json.encabezado;

                if (json.detalle != FALSE) {
                    this.array_items = json.detalle;
                }
            } else {
                show_toast('warning', 'No se encontro el ajuste', 'warning', 'warning');
            }
        },
        obtener_select_item(tabla, selec, inp) {
            obtener_select_item(this, tabla, selec, inp);
        },
    },
});
