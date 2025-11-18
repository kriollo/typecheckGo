// Test for infer keyword in conditional types

type ArrayElement<T> = T extends (infer U)[] ? U : never;

type StringArray = string[];
type Element1 = ArrayElement<StringArray>; // Should be string

type NumberArray = number[];
type Element2 = ArrayElement<NumberArray>; // Should be number

type NotArray = string;
type Element3 = ArrayElement<NotArray>; // Should be never

// Test with function types
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

type Func1 = () => string;
type Return1 = ReturnType<Func1>; // Should be string

type Func2 = (x: number) => boolean;
type Return2 = ReturnType<Func2>; // Should be boolean