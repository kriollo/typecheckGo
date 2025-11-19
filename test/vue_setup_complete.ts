// Test completo de Vue 3 setup con destructuring

import { defineComponent } from 'vue';

export default defineComponent({
    name: 'TestComponent',

    setup(props, { emit, expose }) {
        // emit debe ser reconocido como función
        const handleClick = () => {
            emit('click', { data: 'test' });
        };

        // emit en función anidada
        const nested = () => {
            const inner = () => emit('nested', true);
            return inner;
        };

        // expose también debe ser reconocido como función
        expose({
            doSomething: () => {
                emit('action', 'from expose');
            }
        });

        return {
            handleClick,
            nested
        };
    }
});
