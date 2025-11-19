import { $dom } from '@/jscontrollers/composables/dom-selector';
import lazyLoad from '@/jscontrollers/composables/lazy-load';
import { FALSE, GetUniquedArrayObject, show_toast, versaFetch } from '@/jscontrollers/composables/utils';

import Loader from '@/jscontrollers/components/loading';
/* eslint-disable */
const ld = Loader;
/* eslint-enable */

async function cagar_areas(self, codigo_campus, cod_area, desc_area) {
    self.array_area = [];
    $('#list_area').prop('disabled', true);
    $('#list_area').val('');
    $('#area').val(0);
    self.array_solicitud_bodega.cod_area = '';
    self.array_solicitud_bodega.desc_area = '';

    const array_temp = self.array_estructura_user.filter(item => item.cod_campus == codigo_campus);
    self.array_area = GetUniquedArrayObject('cod_area', array_temp);

    $('#list_area').prop('disabled', false);
    const $list_area = $dom('#list_area');
    if ($list_area instanceof HTMLInputElement) {
        $list_area.focus();
    }
    if (cod_area != '') {
        self.array_solicitud_bodega.cod_area = cod_area;
        self.array_solicitud_bodega.desc_area = desc_area;
    }
}
async function cagar_cgestion(self, codigo_area, cod_centrogestion, desc_centrogestion) {
    $('#list_cgestion').prop('disabled', true);
    $('#list_cgestion').val('');
    $('#list_cgestion').empty();
    $('#cgestion').val(0);
    self.array_cgestion = [];
    self.array_solicitud_bodega.cod_cgestion = '';
    self.array_solicitud_bodega.desc_cgestion = '';

    const codigo_campus = $('#campus').val();
    const array_temp = self.array_estructura_user.filter(
        item => item.cod_campus == codigo_campus && item.cod_area == codigo_area
    );
    self.array_cgestion = GetUniquedArrayObject('cod_cgestion', array_temp);

    $('#list_cgestion').prop('disabled', false);
    const $observacion = $dom('#observacion');
    if ($observacion instanceof HTMLInputElement) {
        $observacion.focus();
    }
    if (cod_centrogestion != '') {
        self.array_solicitud_bodega.cod_cgestion = cod_centrogestion;
        self.array_solicitud_bodega.desc_cgestion = desc_centrogestion;
    }
}
async function obtener_select_item(self, tabla, selec, inp) {
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
        let $element = null;
        switch (tabla) {
            case 'campus':
                self.array_solicitud_bodega.cod_campus = match;
                self.array_solicitud_bodega.desc_campus = val;
                await cagar_areas(self, match, null, null);
                $element = $dom('#list_area');
                break;
            case 'area':
                self.array_solicitud_bodega.cod_area = match;
                self.array_solicitud_bodega.desc_area = val;
                await cagar_cgestion(self, match, null, null);
                $element = $dom('#list_cgestion');
                break;
            case 'cgestion':
                self.array_solicitud_bodega.cod_cgestion = match;
                self.array_solicitud_bodega.desc_cgestion = val;
                $element = $dom('#observacion');
                break;
        }
        if ($element instanceof HTMLInputElement) {
            $element.focus();
        }
    }
    $(`#${selec}`).prop('disabled', false);
}

Vue.directive('lazyload', lazyLoad);

const _appPedido = new Vue({
    el: '#content',
    delimiters: ['${', '}'],
    data: function () {
        return {
            habilitar_pedido: 'habilitar_pedido',
            loader: false,
            array_familia1: [],
            familia1_select: '',
            array_codigo: [],
            descripcion_filter: '',
            array_codigo_filter: [],
            NUM_RESULTS: 1000000, // Numero de resultados por página
            pag: 1,
            array_estructura_user: [],
            array_campus: [],
            array_area: [],
            array_cgestion: [],
            array_solicitud_bodega: {
                cod_campus: '',
                desc_campus: '',
                cod_area: '',
                desc_area: '',
                observacion: '',
                cod_cgestion: '',
                desc_cgestion: '',
                estado: 1,
                correo_jefatura: 0,
                origen: 'USUARIO',
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
            show_panel: 'Productos',
            array_jefatura: [],
            ordenar_por: 'az',
            codigo_familia: 0,
        };
    },
    mounted: async function () {
        const url = window.location.href;
        if (localStorage.ordenar_por) {
            this.ordenar_por = localStorage.ordenar_por;
        }
        if (url.includes('solicitudmantecion')) {
            this.habilitar_pedido = 'habilitar_pedidoman';
        }

        const loadEstructuraUser = async () => {
            const response = await versaFetch({
                url: '/api/getPerfilUsuarioBodega',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ id_user: 'owner' }),
            });
            return response;
        };
        const getFamiliasByCodigoHabilitaPedido = async () => {
            const response = await versaFetch({
                url: '/api/getFamiliasByCodigoHabilitaPedido',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    habilitar_pedido: this.habilitar_pedido,
                }),
            });
            return response;
        };

        const response = await Promise.all([loadEstructuraUser(), getFamiliasByCodigoHabilitaPedido()]);
        const [structureUser, familia] = response;

        if (typeof structureUser !== 'boolean') {
            this.array_estructura_user = structureUser.estructura;
            this.array_campus = GetUniquedArrayObject('cod_campus', this.array_estructura_user);
            this.array_jefatura = structureUser.perfil;
            if (this.array_jefatura.length > 0) {
                this.array_solicitud_bodega.correo_jefatura = this.array_jefatura[0].correo_jefatura;
            } else if (this.array_jefatura == FALSE) {
                this.array_solicitud_bodega.correo_jefatura = 0;
            }
        }
        if (typeof familia !== 'boolean') {
            this.array_familia1 = familia;
        }

        let flat = false;
        const index_doc = $dom('#index_doc');
        if (index_doc instanceof HTMLInputElement) {
            this.index_doc = index_doc.value;
        }
        if (this.index_doc == '') {
            this.index_doc = 0;
        } else if (this.index_doc.substr(0, 5) == 'clone') {
            this.index_doc = this.index_doc.substr(11, this.index_doc.length);
            flat = true;
        }

        if (localStorage.items) {
            this.array_items = localStorage.items == 'undefined' ? [] : JSON.parse(localStorage.items);
        }

        if (this.index_doc != 0) {
            await this.load_doc_solicitud(this.index_doc, flat);
        }
    },
    methods: {
        load_codigos: async function (id) {
            this.loader = true;

            this.show_panel = 'Productos';

            this.familia1_select = id;
            this.pag = 1;

            // Cargar Productos
            this.array_codigo = [];
            this.array_codigo_filter = [];

            const response = await versaFetch({
                url: '/api/getProductos_solicitudByFamilia',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    origen: 'Pedido',
                    Cod_familia1: id,
                    filter_solo_habilitados: true,
                    habilitar_pedido: this.habilitar_pedido,
                    ordenar_por: this.ordenar_por,
                }),
            });
            if (typeof response.data !== 'boolean') {
                this.array_codigo = response.data;
                this.array_codigo_filter = response.data;

                type Product = {
                    codigo: string;
                    cantidad: number;
                    selected: number;
                };

                // Convertir array_codigo a un mapa para búsquedas eficientes
                const codigoMap = new Map<string, Product>(response.data.map(item => [item.codigo, item]));

                for (const item of this.array_items) {
                    const data = codigoMap.get(item.codigo);
                    if (data) {
                        // Si el item existe en el mapa, actualiza la cantidad y selected
                        data.cantidad = item.cantidad;
                        data.selected = data.cantidad == 0 ? 0 : 1;
                    }
                }
            }
            this.loader = false;
        },
        filtrar_tabla: function () {
            if (this.descripcion_filter != '') {
                this.array_codigo_filter = this.array_codigo.filter(items => {
                    if (
                        items.descripcion.includes(this.descripcion_filter.toUpperCase()) ||
                        items.codigo.includes(this.descripcion_filter.toUpperCase())
                    ) {
                        return items;
                    }
                });
            } else {
                this.array_codigo_filter = this.array_codigo;
            }
        },
        ShowModalZoom: function (src) {
            const img_zoom = $dom('#img_zoom');
            if (img_zoom instanceof HTMLImageElement) {
                img_zoom.src = src;
            }
            $('#modal_view_image').modal('show');
        },
        backModal: function () {
            $('#modal_view_image').modal('hide');
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
        save_new_item: function (index) {
            if (this.array_codigo_filter[index].cantidad > 0) {
                const codigo = this.array_codigo_filter[index].codigo;
                const tipocodigo = this.array_codigo_filter[index].tipocodigo;
                const result = this.array_items.find(items => {
                    if (items.tipocodigo == tipocodigo && items.codigo == codigo) {
                        items.cantidad = this.array_codigo_filter[index].cantidad;
                        items.total = items.cantidad * this.array_codigo_filter[index].valor;
                        return true;
                    }
                });
                if (result == undefined) {
                    this.array_items.push(this.array_codigo_filter[index]);
                    this.array_items[this.array_items.length - 1].total =
                        this.array_items[this.array_items.length - 1].cantidad *
                        this.array_items[this.array_items.length - 1].valor;
                }
                this.array_codigo_filter.find(data => {
                    if (data.tipocodigo == tipocodigo && data.codigo == codigo) {
                        data.selected = data.cantidad == 0 ? 0 : 1;
                    }
                });
            } else {
                const codigo = this.array_codigo_filter[index].codigo;
                const tipocodigo = this.array_codigo_filter[index].tipocodigo;
                const result = this.array_items.findIndex(
                    items => items.tipocodigo == tipocodigo && items.codigo == codigo
                );
                if (result != -1) {
                    this.remove_item(result);
                }
            }

            localStorage.items = JSON.stringify(this.array_items);
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
                const codigo = this.array_items[index].codigo;
                const tipocodigo = this.array_items[index].tipocodigo;
                this.array_codigo_filter.find(data => {
                    if (data.tipocodigo == tipocodigo && data.codigo == codigo) {
                        data.cantidad = 0;
                        data.selected = 0;
                    }
                });

                this.array_items.splice(index, 1);
                localStorage.items = JSON.stringify(this.array_items);
            }
        },
        save_doc_solicitud: async function (id) {
            $('#btn_save').prop('disabled', true);

            let error = false;
            if (this.array_items.length <= 0) {
                show_toast('Solicitud a bodega', 'Debe ingresar a lo menos un item en el Documento Proveedor');
                error = true;
            }
            if (this.array_solicitud_bodega.observacion == '') {
                show_toast('Solicitud a bodega', 'Debe ingresar una observacion');
                error = true;
            }
            if (this.array_solicitud_bodega.cod_campus == '' || this.array_solicitud_bodega.cod_campus == 0) {
                show_toast('Solicitud a bodega', 'Debe seleccionar un Campues');
                error = true;
            }
            if (this.array_solicitud_bodega.cod_area == '' || this.array_solicitud_bodega.cod_area == 0) {
                show_toast('Solicitud a bodega', 'Debe seleccionar un Area');
                error = true;
            }
            if (this.array_solicitud_bodega.cod_cgestion == '' || this.array_solicitud_bodega.cod_cgestion == 0) {
                show_toast('Solicitud a bodega', 'Debe seleccionar un Centro de Gestión');
                error = true;
            }

            const val = this.array_items.find(item => item.total == 0 || item.cantidad == 0);
            if (val != undefined) {
                show_toast('Solicitud a bodega', 'Todos los productos deben tener valor y cantidad mayor a 1');
                error = true;
            }

            if (error == false) {
                const FormD = new FormData();
                FormD.append('id', id);

                FormD.append('solicitud', JSON.stringify(this.array_solicitud_bodega));
                FormD.append('items', JSON.stringify(this.array_items));

                const json = await versaFetch({
                    url: '/api/save_solicitud_bodegas',
                    method: 'POST',
                    data: FormD,
                });

                if (json.success == 1) {
                    show_toast(json.title, json.message, 'success', 'success');
                    localStorage.items = [];
                    setTimeout(function () {
                        location.href =
                            this.habilitar_pedido === 'habilitar_pedidoman'
                                ? '/bodega/pedidomanppal'
                                : '/bodega/pedido';
                    }, 1000);
                } else {
                    show_toast(json.title, json.message, 'warning', 'warning');
                }
            }
            $('#btn_save').prop('disabled', false);
        },
        load_doc_solicitud: async function (id, clone) {
            this.familia1_select = '';
            this.show_panel = 'Pedido';

            const json = await versaFetch({
                url: '/api/get_bodega_SolicitudById',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ id }),
            });

            this.array_items = [];
            this.array_solicitud_bodega = {
                cod_campus: '',
                desc_campus: '',
                cod_area: '',
                desc_area: '',
                observacion: '',
                cod_cgestion: '',
                desc_cgestion: '',
                origen: 'USUARIO',
            };
            if (typeof json !== 'boolean') {
                if (FALSE === clone) {
                    this.array_solicitud_bodega = json.encabezado;

                    await cagar_areas(
                        this,
                        this.array_solicitud_bodega.cod_campus,
                        this.array_solicitud_bodega.cod_area,
                        this.array_solicitud_bodega.desc_area
                    );

                    await cagar_cgestion(
                        this,
                        this.array_solicitud_bodega.cod_area,
                        this.array_solicitud_bodega.cod_cgestion,
                        this.array_solicitud_bodega.desc_cgestion
                    );
                }
                if (json.detalle != FALSE) {
                    this.array_items = json.detalle;
                    if (clone) {
                        this.index_doc = '';
                        this.array_solicitud_bodega.estado = 1;

                        this.array_items.map(function (item) {
                            item.estado = 1;
                            item.entregado = 0;
                        });

                        localStorage.items = JSON.stringify(this.array_items);
                    }
                }
            }
        },
        obtener_select_item: function (tabla, selec, inp) {
            obtener_select_item(this, tabla, selec, inp);
        },
        set_load_codigos: function (id) {
            this.codigo_familia = id;
            this.load_codigos(id);
        },
        cambiar_ordenar_por: function () {
            localStorage.ordenar_por = this.ordenar_por;

            // Función auxiliar para convertir cantidad a número de forma segura
            const parseQuantity = value => {
                if (value === null || value === undefined || value === '') {
                    return 0;
                }
                // Limpiar el string: remover espacios, comas, y caracteres no numéricos excepto punto y guión
                const cleanValue = String(value)
                    .trim()
                    .replace(/[^\d.-]/g, '');
                const parsed = parseFloat(cleanValue);
                return isNaN(parsed) ? 0 : parsed;
            };

            switch (this.ordenar_por) {
                case 'az':
                    this.array_codigo_filter.sort((a, b) => a.descripcion.localeCompare(b.descripcion));
                    break;
                case 'za':
                    this.array_codigo_filter.sort((a, b) => b.descripcion.localeCompare(a.descripcion));
                    break;
                case 'stockMayor':
                    this.array_codigo_filter.sort((a, b) => {
                        const cantidadA = parseQuantity(a.stock_actual);
                        const cantidadB = parseQuantity(b.stock_actual);
                        return cantidadB - cantidadA;
                    });
                    break;
                case 'stockMenor':
                    this.array_codigo_filter.sort((a, b) => {
                        const cantidadA = parseQuantity(a.stock_actual);
                        const cantidadB = parseQuantity(b.stock_actual);
                        return cantidadA - cantidadB;
                    });
                    break;
                case 'valorMenor':
                    this.array_codigo_filter.sort((a, b) => {
                        const cantidadA = parseQuantity(a.valor);
                        const cantidadB = parseQuantity(b.valor);
                        return cantidadA - cantidadB;
                    });
                    break;
                case 'valorMayor':
                    this.array_codigo_filter.sort((a, b) => {
                        const cantidadA = parseQuantity(a.valor);
                        const cantidadB = parseQuantity(b.valor);
                        return cantidadB - cantidadA;
                    });
                    break;
            }
        },
    },
    computed: {
        total_pedido: function () {
            let total = 0;
            for (const item of this.array_items) {
                total += item.cantidad * item.valor;
            }
            return total;
        },
    },
});
