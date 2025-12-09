// Correct: Discriminated union type
export type Discriminated = { type: "a"; value: string; } | { type: "b"; value: number; }
export const disc: Discriminated = { type: "a", value: "hello" };