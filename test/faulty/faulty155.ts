// Error: Object spread with incompatible types
const obj1 = { x: 10 };
const obj2 = { x: "20" };
const merged: { x: number } = { ...obj1, ...obj2 };
