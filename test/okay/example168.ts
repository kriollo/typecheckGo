// Correct: Conditional type distribution
type ToArray<T> = T extends any ? T[] : never;
type Result = ToArray<string | number>;
const value: Result = ["hello"];
