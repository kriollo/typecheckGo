export function filterArray<T>(arr: T[], predicate: (item: T) => boolean): T[] { return arr.filter(predicate); }
var filtered: string[] = filterArray<number>([1,2,3], (item) => item > 1);