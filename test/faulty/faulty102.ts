// Error: Conditional type mismatch
type IsString<T> = T extends string ? true : false;
const result: IsString<number> = true;
