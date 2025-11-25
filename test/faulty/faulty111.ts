// Error: Intersection type incompatible properties
type A = { x: number };
type B = { x: string };
type C = A & B;
const obj: C = { x: 42 };
