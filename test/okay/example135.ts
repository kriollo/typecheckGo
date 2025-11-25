// Correct: Utility type Exclude
type T = Exclude<"a" | "b" | "c", "a">;
const value: T = "b";
