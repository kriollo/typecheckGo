// // Vue Composition API types
// interface Ref<T = any> {
//     value: T;
// }

// interface ComputedRef<T = any> {
//     readonly value: T;
// }

// interface defineComponent({
//     setup: (props: any, context: any) => any;
//     render: (ctx: any) => any;
//     computed: (getter: () => any) => ComputedRef<any>;
// })

// interface VueCompositionAPI {

//     // Component Props
//     defineProps: <T>() => T;
//     defineEmits: <T>() => T;
//     defineExpose: <T>() => T;
//     defineSlots: <T>() => T;

//     // Component definition
//     defineComponent: (options: any) => any;

//     // Reactivity Core
//     ref: <T = any>(value: T) => Ref<T>;
//     computed: <T = any>(getter: () => T) => ComputedRef<T>;
//     reactive: <T extends object>(target: T) => T;
//     readonly: <T extends object>(target: T) => T;

//     // Reactivity Utilities
//     isRef: (value: any) => boolean;
//     unref: <T>(ref: T | Ref<T>) => T;
//     toRef: <T extends object, K extends keyof T>(object: T, key: K) => Ref<T[K]>;
//     toRefs: <T extends object>(object: T) => { [K in keyof T]: Ref<T[K]> };

//     // Reactivity Advanced
//     shallowRef: <T = any>(value: T) => Ref<T>;
//     triggerRef: (ref: Ref) => void;
//     customRef: <T>(factory: any) => Ref<T>;
//     shallowReactive: <T extends object>(target: T) => T;

//     // Lifecycle Hooks
//     onMounted: (callback: () => void) => void;
//     onUpdated: (callback: () => void) => void;
//     onUnmounted: (callback: () => void) => void;
//     onBeforeMount: (callback: () => void) => void;
//     onBeforeUpdate: (callback: () => void) => void;
//     onBeforeUnmount: (callback: () => void) => void;
//     onActivated: (callback: () => void) => void;
//     onDeactivated: (callback: () => void) => void;
//     onErrorCaptured: (callback: (err: Error, instance: any, info: string) => boolean | void) => void;

//     // Watchers
//     watch: <T = any>(source: any, callback: (newValue: T, oldValue: T) => void, options?: any) => void;
//     watchEffect: (effect: () => void, options?: any) => void;
//     watchPostEffect: (effect: () => void, options?: any) => void;
//     watchSyncEffect: (effect: () => void, options?: any) => void;

//     // Dependency Injection
//     provide: <T>(key: string | symbol, value: T) => void;
//     inject: <T>(key: string | symbol, defaultValue?: T) => T | undefined;

//     // Other
//     nextTick: (callback?: () => void) => Promise<void>;
//     getCurrentInstance: () => any;

// }

// // Vuex types
// interface VuexMapHelpers {
//     mapState: (map: string[] | Record<string, any>) => any;
//     mapGetters: (map: string[] | Record<string, any>) => any;
//     mapMutations: (map: string[] | Record<string, any>) => any;
//     mapActions: (map: string[] | Record<string, any>) => any;
// }

// // SweetAlert2 types
// interface SwalResult {
//     isConfirmed: boolean;
//     isDenied: boolean;
//     isDismissed: boolean;
//     value?: any;
// }

// interface SwalOptions {
//     title?: string;
//     text?: string;
//     html?: string;
//     icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
//     showCancelButton?: boolean;
//     confirmButtonText?: string;
//     cancelButtonText?: string;
//     confirmButtonColor?: string;
//     cancelButtonColor?: string;
//     showConfirmButton?: boolean;
//     timer?: number;
//     timerProgressBar?: boolean;
//     [key: string]: any;
// }

// interface SweetAlert {
//     fire: (options: SwalOptions | string) => Promise<SwalResult>;
//     close: () => void;
//     isVisible: () => boolean;
// }

// // Global declarations
declare var Vue;
declare var Vuex;
declare var Swal;
// declare var Function: FunctionConstructor;

// interface FunctionConstructor {
//     new (...args: string[]): Function;
//     (...args: string[]): Function;
//     readonly prototype: Function;
// }
