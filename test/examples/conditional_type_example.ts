// Conditional Type Example
type IsString<T> = T extends string ? true : false;
const test: IsString<'hello'> = true;
