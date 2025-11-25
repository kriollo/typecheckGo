// Correct: Variadic tuple types
type Tuple<T extends any[]> = [string, ...T, number];
const tuple: Tuple<[boolean]> = ["hello", true, 42];
