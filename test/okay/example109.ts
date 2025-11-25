// Correct: Infer keyword
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type Func = (x: number) => string;
const result: ReturnType<Func> = "hello";
