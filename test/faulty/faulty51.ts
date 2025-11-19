export function identity<T>(arg: T): T { return arg; }
var id: string = identity<number>(42);