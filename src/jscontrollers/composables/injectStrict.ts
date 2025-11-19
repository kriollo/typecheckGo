const { inject, provide } = Vue;

export interface InjectionBundle<T> {
    key: symbol;
    provide: (value: T) => void;
    inject: () => T;
    tryInject: () => T | undefined;
}

export default function createInjection<T>(keyDesc: string): InjectionBundle<T> {
    const key: symbol = Symbol(keyDesc);
    return {
        key,
        provide: (value: T): void => provide(key, value),
        inject: (): T => {
            const injected = inject(key);
            if (injected === undefined) {
                throw new Error(`[Injection] "${keyDesc}" not provided`);
            }
            return injected as T;
        },
        tryInject: (): T | undefined => inject(key) as T | undefined,
    };
}
