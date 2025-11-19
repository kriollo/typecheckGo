import type { SalidaExpressItem } from './types';

const test = {
    props: {
        PropsformData: {
            type: Object as () => SalidaExpressItem | null,
            required: true,
        },
    },
};
