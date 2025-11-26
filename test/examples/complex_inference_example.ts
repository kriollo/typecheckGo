// Inferencia compleja de tipos
function identity<T>(value: T) {
    return value;
}

const a = identity(123); // number
const b = identity("hola"); // string
const c = identity({ x: 1, y: 2 }); // { x: number, y: number }

// Inferencia con arrays y funciones
const arr = [1, "dos", true]; // (number | string | boolean)[]
const fn = (x = 42) => x; // x: number, return: number

// Inferencia con destructuring
const { x, y } = { x: 10, y: "test" }; // x: number, y: string
