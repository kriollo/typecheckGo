export function merge<T, U>(obj1: T, obj2: U): T & U { return { ...obj1, ...obj2 }; }
var merged: { a: number } = merge({ a: 1 }, { b: "2" });