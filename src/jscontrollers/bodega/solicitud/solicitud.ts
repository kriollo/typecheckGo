import { $dom } from '@/jscontrollers/composables/dom-selector';
import {
    fecthCampus,
    fetchGetAreas,
    fetchGetCGestion,
    fetchGetProductos,
    fetchGetTipoCodigo,
    fetchUsuarioSolicitante,
} from '@/jscontrollers/composables/fetching';
import { FALSE, GetUniquedArrayObject, TRUE, show_toast, versaFetch } from '@/jscontrollers/composables/utils';

import { usePPalStore } from '@/jscontrollers/usePPalStore';
import type { VersaFetchResponse } from 'versaTypes';

import inputDataList from '@/jscontrollers/components/inputDataList';

/* eslint-disable */
const idl = inputDataList;
/* eslint-enable */

async function cagar_codigos(self, tipocodigo, codigo = '', desc_codigo = '') {
    self.array_codigo = [];
    $('#list_codigo').prop('disabled', true);
    $('#list_codigo').val('');
    $('#codigo').val(0);

    const data = (await fetchGetProductos(tipocodigo)) as VersaFetchResponse | boolean;
    if (data != FALSE) {
        self.array_codigo = data;

        $('#list_codigo').prop('disabled', false);
        const $list_codigo = $dom('#list_codigo');
        if ($list_codigo instanceof HTMLElement) {
            $list_codigo.focus();
        }

        if (codigo != '') {
            $('#list_codigo').val(desc_codigo);
            $('#codigo').val(codigo);
        }
    }
}
async function cagar_areas(self, codigo, cod_area = '', desc_area = '') {
    self.array_area = [];
    $('#list_area').prop('disabled', true);
    $('#list_area').val('');
    $('#area').val(0);
    self.array_solicitud_bodega.cod_area = '';
    self.array_solicitud_bodega.desc_area = '';

    const data = (await fetchGetAreas(codigo)) as VersaFetchResponse | boolean;
    if (data != FALSE) {
        self.array_area = data;

        $('#list_area').prop('disabled', false);
        const $list_area = document.querySelector('#list_area');
        if ($list_area instanceof HTMLElement) {
            $list_area.focus();
        }
        if (cod_area != '') {
            self.array_solicitud_bodega.cod_area = cod_area;
            self.array_solicitud_bodega.desc_area = desc_area;
        }
    }
}
async function cagar_cgestion(self, codigo, cod_centrogestion = '', desc_centrogestion = '') {
    $('#list_cgestion').prop('disabled', true);
    $('#list_cgestion').val('');
    $('#list_cgestion').empty();
    $('#cgestion').val(0);
    self.array_cgestion = [];
    self.array_solicitud_bodega.cod_cgestion = '';
    self.array_solicitud_bodega.desc_cgestion = '';

    const codigo_campus = $dom('#campus');
    if (!(codigo_campus instanceof HTMLInputElement)) return;
    const data = (await fetchGetCGestion(codigo_campus.value, codigo)) as VersaFetchResponse | boolean;
    if (data != FALSE) {
        $.each(data, function (index, value: any) {
            self.array_cgestion.push({
                text: value.codigo,
                value: value.descripcion,
            });
        });
        $('#list_cgestion').prop('disabled', false);
        const $list_cgestion = document.querySelector('#list_cgestion');
        if ($list_cgestion instanceof HTMLElement) {
            $list_cgestion.focus();
        }
        if (cod_centrogestion != '') {
            self.array_solicitud_bodega.cod_cgestion = cod_centrogestion;
            self.array_solicitud_bodega.desc_cgestion = desc_centrogestion;
        }
    }
}
function limpiar_modal(self) {
    $('#tipocodigo').val('');
    $('#codigo').val('');
    $('#list_codigo').val('');
    $('#list_tipocodigo').val('');
    self.array_codigo_filter = [];
}
const obtener_select_item = async (self, tabla, selec, inp) => {
    $(`#${selec}`).prop('disabled', true);
    const val = $(`#${selec}`).val();
    const list = $(`#${selec}`).attr('list');

    const elem = document.getElementById(list);
    const op = elem.querySelector(`option[value='${val}']`);
    let match = '0';
    if (op != null) match = op.getAttribute('data-value2');
    else $(`#${selec}`).prop('disabled', false);

    if (inp != '') {
        $(`#${inp}`).val(match);
    }

    if (match != '') {
        let $elementFocus = null;
        switch (tabla) {
            case 'tipocodigo':
                await cagar_codigos(self, match);
                $elementFocus = $dom('#codigo');
                break;
            case 'codigo':
                self.load_codigos($('#tipocodigo').val(), match);
                break;
            case 'campus':
                self.array_solicitud_bodega.cod_campus = match;
                self.array_solicitud_bodega.desc_campus = val;
                await cagar_areas(self, match);
                $elementFocus = $dom('#list_area');
                break;
            case 'area':
                self.array_solicitud_bodega.cod_area = match;
                self.array_solicitud_bodega.desc_area = val;
                await cagar_cgestion(self, match);
                $elementFocus = $dom('#list_cgestion');
                break;
            case 'cgestion':
                self.array_solicitud_bodega.cod_cgestion = match;
                self.array_solicitud_bodega.desc_cgestion = val;
                $elementFocus = $dom('#solicitante');
                break;
            case 'solicitante':
                if (self.array_all_solicitantes.length == 0) return;
                self.array_jefatura = [];
                self.array_jefatura = self.array_all_solicitantes.filter(item => {
                    if (item.solicitantes.toUpperCase() == match.toUpperCase() && item.correo_jefatura != '')
                        return item;
                });
                if (self.array_jefatura.length > 0) {
                    self.array_solicitud_bodega.correo_jefatura = self.array_jefatura[0].correo_jefatura;
                    $elementFocus = $dom('#select_jefatura');
                } else {
                    self.array_solicitud_bodega.correo_jefatura = '';
                    $elementFocus = $dom('#observacion');
                }

                break;
        }
        if ($elementFocus instanceof HTMLElement) {
            $elementFocus.focus();
        }
    }
    $(`#${selec}`).prop('disabled', false);
};
const _appSOBodega = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    store: usePPalStore,
    data: function () {
        return {
            array_familia1: [],
            familia1_select: '',
            array_tipocodigo: [],
            array_codigo: [],
            descripcion_filter: '',
            array_codigo_filter: [],
            array_solicitantes: [],
            array_all_solicitantes: [],
            NUM_RESULTS: 5, // Numero de resultados por página
            pag: 1,
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
                correo_jefatura: '',
                origen: 'LOCAL',
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
            array_jefatura: [],
        };
    },
    setup() {
        const owner_user = Vue.computed(() => usePPalStore.state.owner_user);
        const id_user = owner_user.value.id_user;
        return { id_user };
    },
    mounted: async function () {
        const index_doc = $dom('#index_doc');
        if (index_doc instanceof HTMLInputElement) {
            this.index_doc = index_doc.value;
        } else {
            this.index_doc = 0;
        }

        const reponse = await Promise.all([
            fecthCampus(),
            fetchGetTipoCodigo(),
            fetchUsuarioSolicitante({
                estado: '1',
                filtro: 'solicitantes',
            }),
        ]);
        const [campus, tipoCodigo, solicitantes] = reponse;

        this.array_campus = campus;
        this.array_tipocodigo = tipoCodigo;
        this.array_solicitantes = GetUniquedArrayObject('solicitantes', solicitantes);
        if (typeof solicitantes == 'boolean') this.array_all_solicitantes = [];
        else this.array_all_solicitantes = solicitantes;

        if (this.index_doc != 0) {
            this.load_doc_solicitud(this.index_doc);
        }
    },
    methods: {
        modal_agregar_item: function () {
            $('#modal_agregar_item').modal('show');
        },
        load_codigos: async function (tipocodigo, codigo) {
            this.array_codigo_filter = [];
            const response = (await versaFetch({
                url: '/api/getProductos_solicitudByFamilia',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    tipocodigo,
                    codigo,
                    origen: 'Solicitud',
                }),
            })) as VersaFetchResponse | boolean;
            if (response != FALSE && typeof response != 'boolean') {
                this.array_codigo_filter = response.data;
            }
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
            const $img_zoom = document.querySelector('#img_zoom');
            if (!($img_zoom instanceof HTMLInputElement)) return;
            $img_zoom.src = src;

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
            if (result.value) {
                this.array_items = [];
            }
        },
        save_new_item: function () {
            const find = this.array_items.find(item => {
                if (item.codigo == this.array_codigo_filter[0].codigo) {
                    return item;
                }
            });
            if (find != undefined) {
                show_toast('Solicitud a bodega', 'El item ya se encuentra en la lista');
                return;
            }

            this.array_items.push(this.array_codigo_filter[0]);

            $('#modal_agregar_item').modal('hide');
            limpiar_modal(this);
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
            if (result.value) {
                this.array_items.splice(index, 1);
            }
        },
        calculateTotalItem: function (index) {
            if (this.array_codigo_filter[index].cantidad > 0)
                this.array_codigo_filter[index].total =
                    this.array_codigo_filter[index].cantidad * this.array_codigo_filter[index].valor;
            else this.array_codigo_filter[index].total = 0;
        },
        save_doc_solicitud: async function (id) {
            const observacion = $('#observacion').val();
            const campus = $('#campus').val();
            const area = $('#area').val();
            const cgestion = $('cgestion').val();

            let error = false;
            if (this.array_items.length <= 0) {
                show_toast('Solicitud a bodega', 'Debe ingresar a lo menos un item en el Documento Proveedor');
                error = true;
            }
            if (observacion == '') {
                show_toast('Solicitud a bodega', 'Debe ingresar una observacion');
                error = true;
            }
            if (campus == '') {
                show_toast('Solicitud a bodega', 'Debe seleccionar un Campues');
                error = true;
            }
            if (area == '') {
                show_toast('Solicitud a bodega', 'Debe seleccionar un Area');
                error = true;
            }
            if (cgestion == '') {
                show_toast('Solicitud a bodega', 'Debe seleccionar un Centro de Gestión');
                error = true;
            }
            const val = this.array_items.find(item => item.total == 0);
            if (val != undefined) {
                show_toast('Solicitud a bodega', 'Todos los productos deben tener valor y cantidad mayor a 1');
                error = TRUE;
            }

            if (error == FALSE) {
                $('#btn_save').prop('disabled', true);

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

                    setTimeout(function () {
                        location.href = '/bodega/solicitud';
                    }, 1000);
                } else {
                    $('#btn_save').prop('disabled', false);
                    show_toast(json.title, json.message, 'warning', 'warning');
                }
            }
        },
        load_doc_solicitud: async function (id) {
            const json = (await versaFetch({
                url: '/api/get_bodega_SolicitudById',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ id }),
            })) as VersaFetchResponse | boolean;
            if (json !== FALSE && typeof json !== 'boolean') {
                this.array_items = [];
                this.array_solicitud_bodega = {
                    cod_campus: '',
                    desc_campus: '',
                    cod_area: '',
                    desc_area: '',
                    observacion: '',
                    cod_cgestion: '',
                    desc_cgestion: '',
                    origen: 'LOCAL',
                };
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

                if (json.detalle != FALSE) {
                    this.array_items = json.detalle;
                }
            } else {
                show_toast('Solicitud a bodega', 'No se ha podido cargar el documento', 'warning', 'warning');
            }
        },
        obtener_select_item: function (tabla, selec, inp) {
            obtener_select_item(this, tabla, selec, inp);
        },
    },
    computed: {
        total_solicitud: function () {
            let total = 0;
            for (const item of this.array_items) {
                total += item.cantidad * item.valor;
            }
            return total;
        },
    },
});
