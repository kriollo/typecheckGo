import { storeCPB } from '@/jscontrollers/bodega/solicitud/construct/construct_pedido_STORE';
import { show_toast } from '@/jscontrollers/composables/utils';
import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';
const { defineComponent, ref, computed, onMounted } = Vue;
export default defineComponent({
    name: 'configuracion_productos',
    setup() {
        const tipoCodigoLocal = ref('1');
        const findProducto = ref('');
        const showUploadExcel = ref(false);
        const eraseAll = ref(true);
        const optionsTipoCodigo = ref([
            {
                id: 0,
                value: '0',
                label: 'Seleccione Tipo Código',
            },
        ]);

        storeCPB.dispatch('getTipoCodigo').then(response => {
            if (response !== false) {
                optionsTipoCodigo.value = response.map(forTipoCodigo => ({
                    id: forTipoCodigo.id,
                    value: forTipoCodigo.id,
                    label: forTipoCodigo.descripcion,
                    disabled: false,
                }));
            }
        });

        const pedido = computed(() => storeCPB.state.pedido);
        const productos = computed(() => storeCPB.state.productos);
        const array_title_productos = computed(() => storeCPB.state.array_title_productos);
        const function_pasarella = computed(() => storeCPB.state.function_pasarella);

        const renderTableProductos = () => {
            if ($('#tbl_productos').find('tr').children().length > 0) {
                $('#tbl_productos').find('tr').children().remove();
                $('#tbl_productos').find('tbody').remove();
                $('#tbl_productos').DataTable().destroy();
                $('#tbl_productos').empty();
            }
            const iDisplayLength = 5;
            const iDisplayLengthText = '5';
            $('#tbl_productos').DataTable({
                language: {
                    search: 'Buscar:',
                    zeroRecords: 'No hay datos para mostrar',
                    info: 'Mostrando _END_ Registros, de un total de _TOTAL_ ',
                    loadingRecords: 'Cargando...',
                    processing: 'Procesando...',
                    infoEmpty: 'No hay entradas para mostrar',
                    lengthMenu: 'Mostrar _MENU_ Filas',
                    paginate: {
                        first: 'Primera',
                        last: 'Ultima',
                        next: 'Siguiente',
                        previous: 'Anterior',
                    },
                    decimal: ',',
                    thousands: '.',
                },
                columnDefs: array_title_productos.value,
                columns: [
                    { data: 'codigo' },
                    { data: 'descripcion' },
                    { data: 'familia1' },
                    { data: 'familia2' },
                    {
                        data: 'id',
                        render: (data, type, row, meta) => html`
                            <button
                                type="button"
                                class="btn btn-sm btn-flat btn-warning"
                                data-value='{"param":{"id": ${data},"index": ${meta.row}},"function":"delete_item_producto"}'
                                name="pasarella"
                                title="Eliminar Producto">
                                <i class="fas fa-trash"></i>
                            </button>
                        `,
                    },
                ],
                data: productos.value,
                info: true,
                searching: true,
                paging: true,
                responsive: true,
                lengthMenu: [
                    [iDisplayLength, 10, 25, 50, -1],
                    [iDisplayLengthText, 10, 25, 50, 'Todos'],
                ],
                pageLength: iDisplayLength,
                dom:
                    "<'row'<'col-sm-12 col-md-4'l><'col-sm-12 col-md-4 text-center'B><'col-sm-12 col-md-4'f>>" +
                    "<'row'<'col-sm-12'tr>>" +
                    "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
                buttons: ['excelHtml5'],
            });

            $('#tbl_productos').DataTable().columns.adjust().draw();
        };
        onMounted(() => {
            renderTableProductos();
        });

        return {
            tipoCodigoLocal,
            findProducto,
            showUploadExcel,
            eraseAll,
            optionsTipoCodigo,
            pedido,
            productos,
            array_title_productos,
            function_pasarella,
            renderTableProductos,
        };
    },
    methods: {
        ...Vuex.mapMutations([
            'SET_TIPOCODIGO',
            'DELETE_PRODUCTO',
            'SET_PRODUCTOS',
            'SET_SHOW_MODAL_UPLOAD',
            'SET_FUNCTIONS_PASARELLA',
        ]),
        ...Vuex.mapActions(['getTipoCodigo', 'delProductoPedido', 'getProductoPedido', 'saveProductoPedidoMasivo']),
        async deleteProductoPedido(param) {
            const result = await Swal.fire({
                title: '¿Estas seguro de eliminar este producto?',
                text: 'No podras revertir esta acción!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Si, Eliminar!',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed) {
                this.DELETE_PRODUCTO(param.index);
                this.delProductoPedido(param.id)
                    .then(response => {
                        if (response.success === 1) {
                            this.renderTableProductos();
                            Swal.fire('Eliminado!', 'El producto ha sido eliminado.', 'success');
                        } else {
                            Swal.fire('Error!', 'El producto no ha sido eliminado.', 'error');
                        }
                    })
                    .catch(function (error) {
                        show_toast('Error', error, 'error', 'error');
                    });
            }
        },
        async searchProducto() {
            const param = {
                id_tipocodigo: this.tipoCodigoLocal,
                codigo: this.findProducto,
                id_pedido: this.pedido.id,
            };
            const response = await this.getProductoPedido(param);
            if (response.success === 1) {
                this.SET_PRODUCTOS(response.data);
                this.renderTableProductos();
                this.findProducto = '';
            } else {
                Swal.fire('Error!', 'No se encontraron productos.', 'error');
            }
        },
        showModalUpload() {
            this.SET_SHOW_MODAL_UPLOAD(true);
        },
        accion(e) {
            const actions = {
                closeModalUploadFileExcel: () => {
                    this.showUploadExcel = false;
                },
                loadExcel: () => {
                    this.loadBaseProductos(e);
                },
            };
            const fn = actions[e.accion] || (() => {});
            if (typeof fn === 'function') {
                fn();
            }
        },
        async loadBaseProductos(e) {
            if (e.data.length === 0) {
                show_toast('error', 'No se encontraron productos.');
                return false;
            }

            const params = {
                id_tipocodigo: this.tipoCodigoLocal,
                codigos: e.data,
                checkEncabezado: 0,
                checkBorrarAll: this.eraseAll ? 1 : 0,
                id_pedido: this.pedido.id,
            };

            const response = await this.saveProductoPedidoMasivo(params);
            if (response.success === 1) {
                this.SET_PRODUCTOS(response.data);

                this.SET_FUNCTIONS_PASARELLA({
                    funcion: 'reder_table_productos',
                });
                this.showUploadExcel = false;
                show_toast('Éxito!', 'Se cargaron los productos correctamente.', 'success', 'success');
            } else {
                show_toast('Error!', 'No se encontraron productos.', 'warning', 'warning');
            }
        },
    },
    watch: {
        function_pasarella: function (val) {
            switch (val.funcion) {
                case 'delete_item_producto':
                    this.deleteProductoPedido(val.param);
                    break;
                case 'reder_table_productos':
                    this.renderTableProductos();
                    break;
            }
        },
    },
    template: html`
        <div class="row">
            <div class="col col-md-12" style="max-height: 550px;overflow-y: auto;">
                <div class="row">
                    <iRadio
                        id="tipoCodigo"
                        :horizontalList="true"
                        :options="optionsTipoCodigo"
                        key="tipoCodigo"
                        label="Seleccione Tipo Código"
                        v-model="tipoCodigoLocal" />
                </div>
                <hr class="m-0 mb-2" />
                <div class="row">
                    <div class="col col-md-4">
                        <h4>Productos Asociados al Pedido</h4>
                    </div>
                    <div class="col col-md-4 text-center" v-if="tipoCodigoLocal !== '0'">
                        <iCheck id="eraseall" key="eraseall" label="Eliminar Todos los Productos" v-model="eraseAll" />

                        <button type="button" class="btn btn-info" @click="showUploadExcel = true">Carga Masiva</button>

                        <uploadFileExcel :showModal="showUploadExcel" @accion="accion" from="cargaMasiva" />
                    </div>
                    <div class="col col-md-4" v-if="tipoCodigoLocal !== '0'">
                        <div class="input-group">
                            <input
                                type="text"
                                class="form-control"
                                placeholder="Buscar Producto para agregar"
                                v-model="findProducto" />
                            <div class="input-group-append">
                                <button
                                    type="button"
                                    class="btn btn-primary"
                                    @click="searchProducto"
                                    title="Presione aquí para agregar...">
                                    <i class="fas fa-arrow-down"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <hr />
                <div class="row p-0 m-0 table-responsive">
                    <table id="tbl_productos" class="table m-0" style="width: 100%;"></table>
                </div>
            </div>
        </div>
    `,
});
