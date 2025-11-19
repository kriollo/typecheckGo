const _appPedido = new Vue({
    el: '#content',
    delimiters: ['${', '}'],
    data: function () {
        return {
            habilitar_pedido: 'habilitar_pedido',
            loader: false,
            array_familia1: [],
            familia1_select: '',
        };
    }
});
