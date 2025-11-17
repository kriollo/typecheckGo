// Test file for type inference and checking

// Primitives
const num = 42;
const str = "hello";
const bool = true;

// Arrays
const numbers = [1, 2, 3];
const strings = ["a", "b", "c"];
const mixed = [1, "two", true];

// Functions
function add(a: number, b: number): number {
    return a + b;
}

const result = add(5, 3);

// Template strings
const name = "Alice";
const greeting = `Hello, ${name}!`;

// Math operations
const sum = 10 + 20;
const product = 5 * 6;
const division = 100 / 10;

// Comparisons
const isEqual = 5 === 5;
const isGreater = 10 > 5;

// Global objects
console.log("Testing console");
console.error("Error message");
console.warn("Warning message");

// Math object
const randomNum = Math.random();
const maxNum = Math.max(10, 20, 30);
const piValue = Math.PI;

// Array methods
const isArr = Array.isArray(numbers);

// Global functions
const parsed = parseInt("42");
const floatNum = parseFloat("3.14");
const notANumber = isNaN(parsed);
