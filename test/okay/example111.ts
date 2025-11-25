// Correct: Intersection type
type A = { x: number };
type B = { y: string };
type C = A & B;
const obj: C = { x: 42, y: "hello" };
