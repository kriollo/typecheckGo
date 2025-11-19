// Pequeño helper para animar contadores numéricos en el dashboard
// Exporta `animateCount` y `initCounters`.

type CounterElement = HTMLElement & { dataset: DOMStringMap };

export function animateCount(el: CounterElement, to: number, duration = 1200): Promise<void> {
    return new Promise(resolve => {
        const from = Number(el.dataset.from ?? el.textContent?.replace(/[^0-9.-]+/g, '') ?? 0) || 0;
        const start = performance.now();
        const isFloat = String(to).includes('.') || String(from).includes('.');
        const precision = isFloat ? 2 : 0;

        function format(n: number) {
            return isFloat ? n.toFixed(precision) : Math.round(n).toString();
        }

        function step(now: number) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3); // easing out
            const current = from + (to - from) * eased;
            el.textContent = format(current);
            if (t < 1) requestAnimationFrame(step);
            else {
                el.textContent = format(to);
                el.dataset.animated = '1';
                resolve();
            }
        }

        requestAnimationFrame(step);
    });
}

export function initCounters(root: Document | HTMLElement = document) {
    const selector = '.js-counter[data-target]';
    const elements = Array.from((root as Element | Document).querySelectorAll<CounterElement>(selector));
    if (!elements.length) return;

    const handle = (el: CounterElement) => {
        if (el.dataset.animated === '1') return;
        const target = Number(el.dataset.target ?? el.getAttribute('data-target'));
        if (Number.isNaN(target)) return;
        const duration = Number(el.dataset.duration ?? el.getAttribute('data-duration') ?? 1200);
        animateCount(el, target, duration).catch(() => {
            /* noop */
        });
    };

    if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        handle(entry.target as CounterElement);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.3 }
        );

        elements.forEach(el => obs.observe(el));
    } else {
        // Fallback: animate immediately
        elements.forEach(handle);
    }
}

export default initCounters;
