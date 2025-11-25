// Correct: Conditional type
type IsString<T> = T extends string ? true : false;
const result: IsString<number> = false;
