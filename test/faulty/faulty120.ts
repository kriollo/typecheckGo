// Error: Variadic tuple types wrong usage
type Tuple<T extends any[]> = [string, ...T, number];
const tuple: Tuple<[boolean]> = ["hello", 42, true];
