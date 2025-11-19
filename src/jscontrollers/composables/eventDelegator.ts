// Simple event delegator to register global handlers once and allow unregistering
type Handler = (ev: Event) => void;

const registry: Record<string, { event: string; handler: Handler }[]> = {};

export function register(name: string, event: string, handler: Handler) {
    if (!registry[name]) registry[name] = [];

    // Avoid duplicate registration for same handler
    const found = registry[name].find(r => r.event === event && r.handler === handler);
    if (found) return;

    registry[name].push({ event, handler });
    document.addEventListener(event, handler);
}

export function unregisterName(name: string) {
    const items = registry[name];
    if (!items) return;
    items.forEach(item => document.removeEventListener(item.event, item.handler));
    delete registry[name];
}

export function unregisterAll() {
    Object.keys(registry).forEach(unregisterName);
}

export default {
    register,
    unregisterName,
    unregisterAll,
};
