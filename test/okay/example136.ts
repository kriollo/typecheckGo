// Correct: Utility type NonNullable
type T = NonNullable<string | null | undefined>;
const value: T = "hello";
