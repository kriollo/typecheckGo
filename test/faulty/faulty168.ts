// Error: Conditional type distribution wrong
type ToArray<T> = T extends any ? T[] : never;
type Result = ToArray<string | number>;
const value: Result = ["hello", 42];
