
function defineComponent(options: any): any {
    return options;
}

defineComponent({
  setup(props, { emit }) {
    emit('accion', {});
  }
});
