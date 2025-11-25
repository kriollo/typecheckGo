// Error: Destructuring with wrong type
const obj = { x: 10, y: 20 };
const { x, y, z }: { x: number; y: number; z: number } = obj;
