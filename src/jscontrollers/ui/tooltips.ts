export function initTooltips(root: ParentNode = document) {
    try {
        // Bootstrap 4/5 tooltip init
        const tooltipTriggerList = Array.from(
            (root as Element).querySelectorAll('[data-toggle="tooltip"],[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.forEach(el => {
            // @ts-ignore - bootstrap may be global
            if (typeof (window as any).bootstrap !== 'undefined' && (window as any).bootstrap.Tooltip) {
                // bootstrap 5 style
                new (window as any).bootstrap.Tooltip(el);
            } else if ((window as any).$) {
                // fallback to jQuery tooltip
                // @ts-ignore
                (window as any).$(el).tooltip();
            }
        });
    } catch (e) {
        console.warn('initTooltips failed', e);
    }
}
