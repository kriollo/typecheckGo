// Simple conditional type test

type IsString<T> = T extends string ? true : false;

type Test1 = IsString<string>;  // Should be true
type Test2 = IsString<number>;  // Should be false