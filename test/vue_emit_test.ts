const { defineComponent } = Vue;

export default defineComponent({
    setup(props, { emit }) {
        // Direct use of emit in setup - this should work
        emit('test', 123);

        return {};
    }
});
