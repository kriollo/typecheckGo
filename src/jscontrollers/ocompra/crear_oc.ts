import { $dom } from '@/jscontrollers/composables/dom-selector';
import {
    fecthCampus,
    fecthCuentaContable,
    fetchCondicion1,
    fetchCondicion2,
    fetchGetAreas,
    fetchGetCGestion,
    fetchProyectos,
    fetchUsuarioSolicitante,
    fetchgetProveedores,
} from '@/jscontrollers/composables/fetching';
import {
    FALSE,
    TRUE,
    focusElement,
    format_number_n_decimal,
    getDiaActual,
    isNumber,
    show_toast,
    versaFetch,
} from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

import uploadFileExcel from '@/jscontrollers/components/uploadFileExcel';
import { AccionData, actionsType } from 'versaTypes';
/* eslint-disable */
const upe = uploadFileExcel;
/* eslint-enable */

const cagar_cuenta_gasto = async (self, codigo, cod_gastos, desc_gasto) => {
    self.array_cuentagastos = [];
    $('#list_gasto').prop('disabled', true);
    $('#list_gasto').val('');
    $('#cuentagasto').val(0);

    const data = await versaFetch({
        url: '/api/getCuentaGasto',
        method: 'POST',
        data: JSON.stringify({ codigo: codigo }),
        headers: {
            'content-type': 'application/json',
        },
    });
    if (typeof data != 'boolean') {
        data.forEach(value => {
            self.array_cuentagastos.push({
                text: value.codigocuentagasto,
                value: value.descripcion,
            });
        });
        $('#list_gasto').prop('disabled', false);
        focusElement('list_gasto');
        if (cod_gastos != '') {
            $('#list_gasto').val(desc_gasto);
            $('#cuentagasto').val(cod_gastos);
        }
    } else {
        focusElement('list_campus');
    }
};
const cagar_areas = async (self, codigo, cod_area, desc_area) => {
    self.array_area = [];
    $('#list_area').prop('disabled', true);
    $('#list_area').val('');
    $('#area').val(0);

    $('#list_centrogestion').prop('disabled', true);
    $('#list_centrogestion').val('');
    $('#centrogestion').val(0);

    const data = await fetchGetAreas(codigo);
    if (typeof data !== 'boolean') {
        self.array_area = data.map(value => ({
            text: value.codigo,
            value: value.descripcion,
        }));

        $('#list_area').prop('disabled', false);

        focusElement('list_area');

        if (cod_area != '') {
            $('#area').val(cod_area);
            $('#list_area').val(desc_area);
        }
    }
};
const cagar_centrogestion = async (self, codigo, cod_centrogestion, desc_centrogestion) => {
    $('#list_centrogestion').prop('disabled', true);
    $('#list_centrogestion').val('');
    $('#list_centrogestion').empty();

    $('#centrogestion').val(0);
    self.array_centrogestion = [];

    const codigo_campus = $('#campus').val();

    const data = await fetchGetCGestion(codigo_campus, codigo);
    if (typeof data !== 'boolean') {
        self.array_centrogestion = data.map(value => ({
            text: value.codigo,
            value: value.descripcion,
        }));

        $('#list_centrogestion').prop('disabled', false);
        focusElement('list_centrogestion');
        if (cod_centrogestion != '') {
            $('#list_centrogestion').val(desc_centrogestion);
            $('#centrogestion').val(cod_centrogestion);
            focusElement('valor');
        }
    }
};
const limpiar_modal = () => {
    $('#cuentacontable').val('');
    $('#list_cuenta').val('');
    $('#cuentagasto').val(0);
    $('#list_gasto').val('');
    $('#list_campus').val('');
    $('#campus').val('');
    $('#area').val(0);
    $('#list_area').val('');
    $('#centrogestion').val(0);
    $('#list_centrogestion').val('');
    $('#valor').val();
    $('#factor').val(0);
    $('#valorfactor').val(0);
    $('#detalle').val('');
    $('#proyecto').val('');
    $('#list_proyectos').val('');
    $('#list_centrogestion').prop('disabled', true);
    $('#list_area').prop('disabled', true);
    $('#list_gasto').prop('disabled', true);
};

Vue.component('info', {
    props: {
        array_oc: {
            type: Object,
            default: () => {},
        },
    },
    setup(props) {
        const array_oc = Vue.computed(() => props.array_oc);
        return {
            array_oc,
        };
    },
    template: html`
        <div class="d-flex justify-content-between" v-if="array_oc.id !=''">
            <span>
                <h6>Creado por: {{ array_oc.name }} - Fecha Registro: {{ array_oc.created_at }}</h6>
                <h6 v-if="array_oc.user_mod != '0'">
                    Modificado Por: {{ array_oc.user_mod }} - Fecha última modificación: {{ array_oc.updated_at }}
                </h6>
            </span>
            <span class="float-sm-right mt-0">
                <p :class="[ array_oc.estado == 1? 'text-green': 'text-blue']">
                    Estado de Orden: {{array_oc.estado_descripcion}}
                </p>
            </span>
        </div>
    `,
});

Vue.component('components', {
    props: {
        showmodal: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, { emit }) {
        const showModal = Vue.computed(() => props.showmodal);

        const accion = accion => {
            emit('accion', accion);
        };
        return {
            accion,
            showModal,
        };
    },
    template: html`
        <div>
            <uploadFileExcel :showModal="showModal" @accion="accion" from="CreaOC" />
        </div>
    `,
});

const appOC = new Vue({
    el: '.content',
    delimiters: ['${', '}'],
    data: () => ({
        modal_accion: 'new',
        edit_index: '',
        edit_oc: false,
        index_oc: 0,
        newArray_oc: {
            id: '',
            folion: '',
            indice: '',
            fecha: '',
            solicitante: '',
            userlisaoc: '',
            observacion: '',
            rut_proveedor: '',
            tipo_orden: '',
            provision: false,
            estado: 1,
            created_at: '',
            updated_at: '',
            nombre: '',
            name: '',
            plantilla: false,
            nombreplantilla: '',
            valortotal: '0',
            cod_condicion1: '',
            desc_condicion1: '',
            cod_condicion2: '',
            desc_condicion2: '',
            ncliente: '',
            medidor: '',
            consumo: '',
            show_adicional: 0,
            proyeccion: false,
        },
        array_oc: {},
        array_items: [],
        array_tipolinea: [],
        array_proveedor: [],
        array_userlisaoc: [],
        array_solicitantes: [],
        array_cuentacontable: [],
        array_cuentagastos: [],
        array_campus: [],
        array_area: [],
        array_centrogestion: [],
        array_proyectos: [],
        array_tipo_oc: [
            {
                value: 'resultado',
            },
            {
                value: 'Inversión',
            },
        ],
        total_valor: 0,
        total_valorfactor: 0,
        array_condiciones1: [],
        array_condiciones2: [],
        placedato1: '',
        placedato2: '',
        placedato3: '',
        array_hojas: [],
        array_data: [],
        val_asociado: '',
        alertaErrorLargo: false,
        showModalUploadExcel: false,
        showBtnSearchOCFromSOC: false,
        id_soc: 0,
    }),
    created: async function () {
        this.array_oc = JSON.parse(JSON.stringify(this.newArray_oc));

        const fetchTipolinea = async () => {
            const response = await versaFetch({
                url: '/api/getTipoLinea',
                method: 'POST',
            });
            return response;
        };

        const getPromise = await Promise.all([
            fetchgetProveedores({ estado: '1' }),
            fetchProyectos(),
            fecthCampus(),
            fecthCuentaContable(),
            fetchTipolinea(),
            fetchCondicion1(),
            fetchCondicion2(),
            fetchUsuarioSolicitante({
                estado: '1',
                filtro: 'solicitantes',
            }),
            fetchUsuarioSolicitante({
                estado: '1',
                filtro: 'userlisa',
            }),
        ]);

        const [
            proveedor,
            proyectos,
            campus,
            cuentaContable,
            tipoLinea,
            condicion1,
            condicion2,
            solicitante,
            userlisaoc,
        ] = getPromise;

        campus.forEach(value => {
            this.array_campus.push({
                value: value.descripcion,
                text: value.id,
            });
        });
        proyectos.forEach(value => {
            this.array_proyectos.push({
                value: value.descripcion,
                text: value.codigoproyecto,
                monto: value.monto,
            });
        });

        cuentaContable.forEach(value => {
            this.array_cuentacontable.push({
                value: value.descripcion,
                text: value.codigo,
            });
        });

        tipoLinea.forEach(value => {
            this.array_tipolinea.push({
                text: value.descripcion,
                value: value.id,
            });
        });

        condicion1.forEach(value => {
            this.array_condiciones1.push({
                text: value.descripcion,
                codigo: value.codigo,
                adicional: value.adicional,
                dato1: value.dato1,
                dato2: value.dato2,
                dato3: value.dato3,
            });
        });

        condicion2.forEach(value => {
            this.array_condiciones2.push({
                text: value.descripcion,
                codigo: value.codigo,
            });
        });

        proveedor.forEach(value => {
            this.array_proveedor.push({
                text: value.rut,
                value: value.nombre,
                selected: false,
                val_asociado: value.val_asociado,
            });
        });

        solicitante.forEach(value => {
            this.array_solicitantes.push({
                text: value.solicitantes,
            });
        });

        userlisaoc.forEach(value => {
            this.array_userlisaoc.push({
                text: value.solicitantes,
            });
        });
    },
    mounted: function () {
        this.array_oc.fecha = getDiaActual();

        if ($('#view_oc').val() != '') {
            this.load_edit_oc($('#view_oc').val());
            if ((window as any).__udd_find_folio_timeout) clearTimeout((window as any).__udd_find_folio_timeout);
            (window as any).__udd_find_folio_timeout = setTimeout(() => {
                this.find_folio_oc();
            }, 1000);
        }
    },
    methods: {
        modal_agregar_item: function () {
            const valor = String($('#valortotal').val()).replace(/\./g, '').replace(/,/g, '.');
            if (valor != '' && isNumber(valor) && Number(valor) > 0) {
                this.modal_accion = 'new';
                limpiar_modal();
                $('#valor').val(valor);
                $('#modal_agregar_item').modal({
                    keyboard: true,
                    focus: false,
                });
            } else {
                show_toast('Ingresar Orden de Compra', 'Antes debe ingresar un Valor de Compra');
            }
        },
        modal_cargaexcel: function () {
            this.showModalUploadExcel = true;
        },
        load_excel_base: async function (data) {
            this.array_data = data;

            const FormD = new FormData();
            FormD.append('encabezado', '0');
            FormD.append('items', JSON.stringify(this.array_data));

            const json = await versaFetch({
                url: '/api/cargar_masiva_oc',
                method: 'POST',
                data: FormD,
            });
            if (json.success == 1) {
                show_toast('Alerta', json.message, 'success', 'success');

                this.array_items = [];

                this.array_oc = JSON.parse(JSON.stringify(json.encabezado));

                if (json.detalle != FALSE) {
                    this.array_items = json.detalle;
                }
            } else {
                show_toast('Alerta', json.message, 'warning', 'warning');
            }
        },
        limpiar_tabla: async function () {
            const result = await Swal.fire({
                title: '¿Está seguro de limpiar la tabla?',
                text: 'Se eliminarán todos los registros',
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
            const cod_tipolinea = $('#tipolinea').val();

            const cuenta_contable = $('#cuentacontable').val();
            const cuenta_gasto = $('#cuentagasto').val();

            const campus = $('#campus').val();
            const area = $('#area').val();
            const centro_gestion = $('#centrogestion').val();

            const valor = $('#valor').val();
            const factor = $('#factor').val();
            const valor_factor = $('#valorfactor').val();

            const datelle = String($('#detalle').val()).trim();

            let error = false;

            if (cod_tipolinea == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un tipo de linea');
                error = true;
            }

            if ($('#list_gasto').is(':disabled') == FALSE && cuenta_gasto == '0' && $('#list_gasto').val() == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una cuenta de gasto');
                error = true;
            }

            if (cuenta_contable == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una cuenta contable');
                error = true;
            }
            if ($('#list_campus').is(':disabled') == FALSE && campus == '' && $('#list_campus').val() == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un campus');
                error = true;
            }
            if ($('#list_area').is(':disabled') == FALSE && area == '0' && $('#list_area').val() == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un area');
                error = true;
            }
            if (
                $('#list_centrogestion').is(':disabled') == FALSE &&
                centro_gestion == '0' &&
                $('#list_centrogestion').val() == ''
            ) {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un centro de Gestión');
                error = true;
            }
            if (valor == '' || valor == 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar valor de nuevo item');
                error = true;
            }
            if (valor_factor == '' || valor_factor == 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar factor de nuevo item');
                error = true;
            }
            if (datelle == '') {
                show_toast('Registro Nuevo Item', 'Debe ingresar detalle de nuevo item');
                error = true;
            }

            if (FALSE == error) {
                this.array_items.push({
                    cod_tipolinea: cod_tipolinea,
                    desc_tipolinea: $('#list_tipolinea').val(),
                    cod_cuenta_contable: cuenta_contable,
                    cuenta_contable: $('#list_cuenta').val(),
                    cod_cuenta_gasto: cuenta_gasto,
                    cuenta_gasto: $('#list_gasto').val(),
                    cod_campus: campus,
                    campus: $('#list_campus').val(),
                    cod_area: area,
                    area: $('#list_area').val(),
                    cod_centro_gestion: centro_gestion,
                    centro_gestion: $('#list_centrogestion').val(),
                    valor: format_number_n_decimal(valor),
                    factor: format_number_n_decimal(factor, 4),
                    valor_factor: format_number_n_decimal(valor_factor, 0),
                    detalle: datelle,
                    cod_proyecto: ($dom('#proyecto') as HTMLInputElement).value,
                    proyecto: $('#list_proyectos').val(),
                });
                $('#modal_agregar_item').modal('hide');
                limpiar_modal();
            }
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
        duplicate_item: function (index) {
            this.array_items.push({ ...this.array_items[index] });
        },
        load_edit_item: async function (index) {
            if ($('#valortotal').val() != '' && Number($('#valortotal').val()) > 0) {
                $('#tipolinea').val(this.array_items[index].cod_tipolinea);
                $('#list_tipolinea').val(this.array_items[index].desc_tipolinea);

                $('#valor').val($('#valortotal').val());
                $('#list_cuenta').val(this.array_items[index].cuenta_contable);
                $('#cuentacontable').val(this.array_items[index].cod_cuenta_contable);
                await cagar_cuenta_gasto(
                    this,
                    this.array_items[index].cod_cuenta_contable,
                    this.array_items[index].cod_cuenta_gasto,
                    this.array_items[index].cuenta_gasto
                );

                $('#list_campus').val(this.array_items[index].campus);
                $('#campus').val(this.array_items[index].cod_campus);

                await cagar_areas(
                    this,
                    this.array_items[index].cod_campus,
                    this.array_items[index].cod_area,
                    this.array_items[index].area
                );

                await cagar_centrogestion(
                    this,
                    this.array_items[index].cod_area,
                    this.array_items[index].cod_centro_gestion,
                    this.array_items[index].centro_gestion
                );

                $('#factor').val(this.array_items[index].factor.replace(/\./g, '').replace(/,/g, '.'));
                $('#valorfactor').val(this.array_items[index].valor_factor.replace(/\./g, '').replace(/,/g, '.'));

                $('#detalle').val(this.array_items[index].detalle);

                $('#list_proyectos').val(this.array_items[index].proyecto);
                $('#proyecto').val(this.array_items[index].cod_proyecto);

                this.modal_accion = 'edit';
                this.edit_index = index;

                $('#edit_index').val(index);
                setTimeout(() => {
                    $('#modal_agregar_item').modal('show');
                }, 500);
            } else {
                show_toast('Ingresar Orden de Compra', 'Antes debe ingresar un Valor de Compra');
                focusElement('valortotal');
            }
        },
        save_edit_item: function () {
            const cod_tipolinea = $('#tipolinea').val();

            const cuenta_contable = $('#cuentacontable').val();
            const cuenta_gasto = $('#cuentagasto').val();

            const campus = $('#campus').val();
            const area = $('#area').val();
            const centro_gestion = $('#centrogestion').val();

            const valor = $('#valor').val();
            const factor = $('#factor').val();
            const valor_factor = $('#valorfactor').val();

            const datelle = $('#detalle').val();

            let error = false;
            if (cod_tipolinea == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un tipo de linea');
                error = true;
            }

            if ($('#list_gasto').is(':disabled') == FALSE && cuenta_gasto == '0' && $('#list_gasto').val() == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una cuenta de gasto');
                error = true;
            }

            if (cuenta_contable == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar una cuenta contable');
                error = true;
            }
            if ($('#list_campus').is(':disabled') == FALSE && campus == '' && $('#list_campus').val() == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un campus');
                error = true;
            }
            if ($('#list_area').is(':disabled') == FALSE && area == '0' && $('#list_area').val() == '') {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un area');
                error = true;
            }
            if (
                $('#list_centrogestion').is(':disabled') == FALSE &&
                centro_gestion == '0' &&
                $('#list_centrogestion').val() == ''
            ) {
                show_toast('Registro Nuevo Item', 'Debe seleccionar un centro de Gestión');
                error = true;
            }
            if (valor == '' || valor == 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar valor de nuevo item');
                error = true;
            }
            if (valor_factor == '' || valor_factor == 0) {
                show_toast('Registro Nuevo Item', 'Debe ingresar factor de nuevo item');
                error = true;
            }
            if (datelle == '') {
                show_toast('Registro Nuevo Item', 'Debe ingresar detalle de nuevo item');
                error = true;
            }

            if (FALSE == error) {
                const index = this.edit_index;
                this.array_items[index].cod_tipolinea = cod_tipolinea;
                this.array_items[index].desc_tipolinea = $('#list_tipolinea').val();
                this.array_items[index].cod_cuenta_contable = cuenta_contable;
                this.array_items[index].cuenta_contable = $('#list_cuenta').val();
                this.array_items[index].cod_cuenta_gasto = cuenta_gasto;
                this.array_items[index].cuenta_gasto = $('#list_gasto').val();
                this.array_items[index].cod_campus = campus;
                this.array_items[index].campus = $('#list_campus').val();
                this.array_items[index].cod_area = area;
                this.array_items[index].area = $('#list_area').val();
                this.array_items[index].cod_centro_gestion = centro_gestion;
                this.array_items[index].centro_gestion = $('#list_centrogestion').val();
                this.array_items[index].valor = format_number_n_decimal(valor);
                this.array_items[index].factor = format_number_n_decimal(factor, 4);
                this.array_items[index].valor_factor = format_number_n_decimal(valor_factor, 0);
                this.array_items[index].detalle = datelle;
                this.array_items[index].cod_proyecto = ($dom('#proyecto') as HTMLInputElement).value;
                this.array_items[index].proyecto = ($dom('#list_proyectos') as HTMLInputElement).value;

                $('#modal_agregar_item').modal('hide');
                limpiar_modal();
            }
        },
        save_orden_compra: async function (id) {
            const folio = Number(String($('#folio').val()).trim());
            const indice = Number(String($('#indice').val()).trim());
            const provision = $('#anticipo').is(':checked') ? 1 : 0;
            const solicitante = String($('#solicitante').val()).trim();
            const proveedor = String($('#proveedor').val()).trim();
            const fecha = $('#fecha').val();
            const tipo_oc = String($('#tipo_oc').val()).trim();
            const observacion = String($('#observacion').val()).trim();
            const plantilla = $('#plantilla').is(':checked');
            const nombreplantilla = String($('#nombreplantilla').val()).trim();
            const valortotal = String($('#valortotal').val()).trim();
            const cod_condicion1 = String($('#cod_condicion1').val()).trim();
            const cod_condicion2 = String($('#cod_condicion2').val()).trim();
            const ncliente = String($('#ncliente').val()).trim();
            const medidor = String($('#medidor').val()).trim();
            const consumo = String($('#consumo').val()).trim();
            const userlisaoc = String($('#userlisaoc').val()).trim();
            const proyeccion = this.array_oc.proyeccion ? 1 : 0;

            let error = false;
            if (this.alertaErrorLargo == TRUE) {
                show_toast('Ingresar Orden de Compra', 'El largo del Folio debe ser de 10 caracteres');
                return false;
            }
            if (folio !== undefined && folio == 0) {
                show_toast('Ingresar Orden de Compra', 'Debe ingresar Folio Orden de Compra');
                error = true;
            }
            if (solicitante == '') {
                show_toast('Ingresar Orden de Compra', 'Debe ingresar solicitante Orden de Compra');
                error = true;
            }
            if (userlisaoc == '') {
                show_toast('Ingresar Orden de Compra', 'Debe ingresar usuario que creo Orden de Compra en SAP');
                error = true;
            }
            if (proveedor == '') {
                show_toast('Ingresar Orden de Compra', 'Debe ingresar Proveedor Orden de Compra');
                error = true;
            }
            if (tipo_oc == '') {
                show_toast('Ingresar Orden de Compra', 'Debe ingresar Tipo de Orden');
                error = true;
            }
            if (this.array_items.length <= 0) {
                show_toast('Ingresar Orden de Compra', 'Debe ingresar a lo menos un item en la Orden de Compra');
                error = true;
            }
            if (plantilla == TRUE && nombreplantilla == '') {
                show_toast(
                    'Ingresar Orden de Compra',
                    'Debe ingresar un nombre para la seleccion de planitllas o quite ticket'
                );
                error = true;
            }
            if (cod_condicion1 == '') {
                show_toast('Ingresar Documento Proveedor', 'Debe ingresar Condición 1');
                error = true;
            }
            if (cod_condicion2 == '') {
                show_toast('Ingresar Documento Proveedor', 'Debe ingresar Condición 2');
                error = true;
            }

            if (error == FALSE) {
                const FormD = new FormData();
                FormD.append('id', id);
                FormD.append('folion', String(folio));
                FormD.append('indice', String(indice));
                FormD.append('solicitante', solicitante);
                FormD.append('userlisaoc', userlisaoc);
                FormD.append('proveedor', proveedor);
                FormD.append('provision', String(provision));
                FormD.append('fecha', String(fecha));
                FormD.append('tipo_oc', tipo_oc);
                FormD.append('observacion', observacion);
                FormD.append('tipo_oc', tipo_oc);
                FormD.append('observacion', observacion);
                FormD.append('total_valorfactor', this.total_valorfactor);
                FormD.append('total_valor', this.total_valor);
                FormD.append('plantilla', String(plantilla));
                FormD.append('nombreplantilla', nombreplantilla);
                FormD.append('valortotal', valortotal);
                FormD.append('cod_condicion1', cod_condicion1);
                FormD.append('cod_condicion2', cod_condicion2);
                FormD.append('ncliente', ncliente);
                FormD.append('medidor', medidor);
                FormD.append('consumo', consumo);
                FormD.append('proyeccion', String(proyeccion));

                FormD.append('items', JSON.stringify(this.array_items));

                const json = await versaFetch({
                    url: '/api/save_ordencompra',
                    method: 'POST',
                    data: FormD,
                });
                if (json.success == 1) {
                    show_toast('Ingresar Orden de Compra', json.message, 'success', 'success');

                    if ((window as any).__udd_oc_redirect) clearTimeout((window as any).__udd_oc_redirect);
                    (window as any).__udd_oc_redirect = setTimeout(function () {
                        location.href = '/ordencompra/ordencompra';
                    }, 1000);
                } else {
                    show_toast('Ingresar Orden de Compra', json.message, 'warning', 'warning');
                }
            }
        },
        async find_folio_oc() {
            this.edit_oc = false;
            this.index_oc = 0;
            const folio = $('#folio').val() == '' ? '0' : $('#folio').val();
            const indice = $('#indice').val() == '' ? '0' : $('#indice').val();
            const FormD = new FormData();
            FormD.append('folion', String(folio));
            FormD.append('indice', String(indice));

            this.array_oc.folion = folio;
            this.array_oc.indice = indice;

            const data = await versaFetch({
                url: '/api/find_folio_oc',
                method: 'POST',
                data: FormD,
            });

            this.edit_oc = Boolean(data['find']);
            this.index_oc = data['id'];
            this.id_soc = data['id_soc'];

            this.showBtnSearchOCFromSOC = data['id_soc'] > 0;

            if (this.edit_oc == FALSE) {
                this.array_oc.estado = 1;
            }
        },
        async searchOCFromSOC() {
            type SOC = {
                formulario: any;
                archivos: any[];
            };

            const data = (await versaFetch({
                url: '/api/getSOCById',
                method: 'POST',
                data: JSON.stringify({ id: this.id_soc }),
                headers: {
                    'Content-Type': 'application/json',
                },
            })) as unknown as SOC;
            const { formulario, archivos } = data;
            const seleccionado = archivos.find(item => item.seleccionado == TRUE || item.seleccionado == 1);

            if (formulario) {
                this.array_oc = {
                    ...this.array_oc,
                    cod_condicion1: formulario.cod_condicion1,
                    cod_condicion2: formulario.cod_condicion2,
                    desc_condicion1: formulario.desc_condicion1,
                    desc_condicion2: formulario.desc_condicion2,
                    tipo_orden: formulario.tipo_oc,
                    valortotal: formulario.monto,
                    observacion: formulario.observacion,
                    rut_proveedor: seleccionado.rutproveedor,
                    nombre: seleccionado.nombreproveedor,
                    solicitante: String(formulario.solicitante).toUpperCase(),
                };
            }
        },
        load_edit_oc: async function (id) {
            this.array_items = [];
            this.array_oc = JSON.parse(JSON.stringify(this.newArray_oc));
            const FormD = new FormData();
            FormD.append('id', id);
            FormD.append('carga_de', 'orden');

            const data = await versaFetch({
                url: '/api/get_OCById',
                method: 'POST',
                data: FormD,
            });
            if (typeof data !== 'boolean') {
                this.array_oc = JSON.parse(JSON.stringify(data.encabezado));
                this.array_oc.anticipo = this.array_oc.anticipo == '1';
                this.array_oc.plantilla = this.array_oc.plantilla == '1';
                this.array_oc.proyeccion = this.array_oc.proyeccion == '1';
                if (data.detalle != FALSE) {
                    this.array_items = data.detalle;
                }
            }
        },
        delete_oc: async function (id) {
            const result = await Swal.fire({
                title: 'Atención',
                text: 'Está seguro de eliminar esta Orden de Compra?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });

            if (result.isConfirmed) {
                const folio = $('#folio').val();
                const indice = $('#indice').val();

                const FormD = new FormData();
                FormD.append('id', id);
                FormD.append('folion', String(folio));
                FormD.append('indice', String(indice));

                const data = await versaFetch({
                    url: '/api/delete_OCById',
                    method: 'POST',
                    data: FormD,
                });

                if (data.success == 1) {
                    show_toast(data.title, data.message, 'success', 'success');

                    if ((window as any).__udd_oc_redirect) clearTimeout((window as any).__udd_oc_redirect);
                    (window as any).__udd_oc_redirect = setTimeout(function () {
                        location.href = '/ordencompra/ordencompra';
                    }, 1000);
                } else {
                    show_toast(data.title, data.message, 'warning', 'warning');
                }
            }
        },
        change_estado_oc: async function (id) {
            const estado = this.array_oc.estado;
            let estado_final = '';
            if (this.array_oc.estado == 1 || this.array_oc.estado == 2) {
                estado_final = 'Cerrar';
            } else {
                estado_final = 'Abrir';
            }

            const result = await Swal.fire({
                title: '¿Estas seguro de cambiar el estado de la Orden de Compra?',
                text: `${estado_final} Orden de Compra`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, estoy seguro!',
                cancelButtonText: 'No, cancelar!',
            });

            if (result.isConfirmed) {
                const FormD = new FormData();
                FormD.append('id', id);
                FormD.append('estado', estado);

                const data = await versaFetch({
                    url: '/api/change_estado_OC',
                    method: 'POST',
                    data: FormD,
                });
                if (data.success == 1) {
                    show_toast(data.title, data.message, 'success', 'success');

                    if ((window as any).__udd_oc_redirect) clearTimeout((window as any).__udd_oc_redirect);
                    (window as any).__udd_oc_redirect = setTimeout(function () {
                        location.href = '/ordencompra/ordencompra';
                    }, 1000);
                } else {
                    show_toast(data.title, data.message, 'warning', 'warning');
                }
            }
        },
        change_rebaja_proyeccion: async function () {
            if (this.array_oc.id !== '') {
                const result = await Swal.fire({
                    title: "¿Estas seguro de cambiar el estado de 'Rebaja Proyección'?",
                    text: 'No podras revertir esta acción!, Todos los documentos asociados se verán afectados.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Si, estoy seguro!',
                    cancelButtonText: 'No, cancelar!',
                });

                if (result.isConfirmed) {
                    const data = await versaFetch({
                        url: '/api/updateRebajaProyeccion',
                        method: 'POST',
                        data: JSON.stringify({
                            origen: 'OC',
                            id: this.array_oc.id,
                            orden: this.array_oc.folion,
                            indice: this.array_oc.indice,
                            proyeccion: this.array_oc.proyeccion === true,
                        }),
                        headers: {
                            'content-type': 'application/json',
                        },
                    });

                    if (data.success == 1) {
                        show_toast(data.title, data.message, 'success', 'success');

                        setTimeout(function () {
                            location.href = '/ordencompra/ordencompra';
                        }, 1000);
                    } else {
                        show_toast(data.title, data.message, 'warning', 'warning');
                    }
                } else {
                    this.array_oc.proyeccion = !this.array_oc.proyeccion;
                }
            }
        },
        obtener_select_item: async function (tabla, selec, inp) {
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
                    case 'cuentacontable':
                        await cagar_cuenta_gasto(this, match, null, null);
                        $element = document.querySelector('#list_gasto');
                        break;
                    case 'campus':
                        cagar_areas(this, match, null, null);
                        $element = document.querySelector('#list_area');
                        break;
                    case 'area':
                        cagar_centrogestion(this, match, null, null);
                        $element = document.querySelector('#list_centrogestion');
                        break;
                    case 'centrogestion':
                        $element = document.querySelector('#valor');
                        break;
                    case 'proveedor':
                        appOC.array_oc.rut_proveedor = match;
                        appOC.array_oc.nombre = val;
                        $element = document.querySelector('#fecha');
                        break;
                    case 'condicion1':
                        appOC.array_oc.cod_condicion1 = match;
                        appOC.array_oc.show_adicional = $(`#${list}`).find(`option[value="${val}"]`).data('value3');

                        appOC.placedato1 = $(`#${list}`).find(`option[value="${val}"]`).data('value4');
                        appOC.placedato2 = $(`#${list}`).find(`option[value="${val}"]`).data('value5');
                        appOC.placedato3 = $(`#${list}`).find(`option[value="${val}"]`).data('value6');

                        $element = document.querySelector('#list_condicion2');
                        break;
                    case 'condicion2':
                        appOC.array_oc.cod_condicion2 = match;
                        $element = document.querySelector('#ncliente');
                        break;
                    case 'tipolinea':
                        $element = document.querySelector('#list_cuenta');
                        break;
                    case 'cuentagasto':
                        $element = document.querySelector('#list_campus');
                        break;
                }
                if ($element instanceof HTMLElement) {
                    $element.focus();
                }
            }
            $(`#${selec}`).prop('disabled', false);
        },
        accion(accion: AccionData) {
            const actions: actionsType = {
                closeModalUploadFileExcel: () => {
                    this.showModalUploadExcel = false;
                },
                loadExcel: () => {
                    this.showModalUploadExcel = false;
                    this.load_excel_base(accion.data);
                },
            };
            const fn = actions[accion.accion] || (() => {});
            if (typeof fn === 'function') {
                fn();
            }
        },
        update_ValorFactor() {
            const valor: number = $('#valor').val() === '' ? 0 : Number($('#valor').val());
            let factor: number = $('#factor').val() === '' ? 0 : Number($('#factor').val());

            if (factor > 0) {
                factor = factor / 100;
            }
            const valorfactor: number = valor * factor;

            $('#valorfactor').val(valorfactor.toFixed(0));
        },
    },
    watch: {
        'array_oc.rut_proveedor': function (val) {
            this.val_asociado = '';
            if (val === '') return;
            const result = this.array_proveedor.find(element => {
                if (String(element.text).trim() === String(this.array_oc.rut_proveedor)) {
                    return element.val_asociado;
                }
            });

            if (result === undefined) return;

            this.val_asociado =
                result.val_asociado == 1
                    ? html`
                          <i class="fas fa-check-circle text-success"></i>
                      `
                    : html`
                          <i class="fas fa-exclamation-circle text-warning"></i>
                      `;
        },
        'array_oc.folion': function () {
            this.alertaErrorLargo = this.array_oc.folion.length !== 10;
        },
    },
    computed: {
        sumar_items() {
            this.total_valorfactor = 0;
            for (const item of this.array_items) {
                const factor = parseFloat(item.factor.replace(/\./g, '').replace(/,/g, '.')) / 100;
                item.valor_factor = format_number_n_decimal(parseFloat(this.array_oc.valortotal) * factor, 0);
                this.total_valorfactor += parseFloat(item.valor_factor.replace(/\./g, '').replace(/,/g, '.'));
            }
            return `Total Valor Factor: ${format_number_n_decimal(this.total_valorfactor, 0)}`;
        },
    },
});
