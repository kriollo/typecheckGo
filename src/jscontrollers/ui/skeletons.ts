export function showSkeleton(el: Element) {
    el.classList.add('skeleton');
}
export function hideSkeleton(el: Element) {
    el.classList.remove('skeleton');
}

export function withSkeleton(el: Element, fn: () => Promise<any>) {
    showSkeleton(el);
    return fn().finally(() => hideSkeleton(el));
}
