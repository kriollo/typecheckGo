// Error: Utility type Exclude wrong result
type T = Exclude<"a" | "b" | "c", "a">;
const value: T = "a";
