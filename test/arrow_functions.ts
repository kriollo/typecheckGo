// Test arrow functions

// Simple arrow function
const add = (a: number, b: number) => a + b;

// Arrow function with single parameter (no parens)
const double = x => x * 2;

// Arrow function with no parameters
const getRandom = () => Math.random();

// Arrow function with block body
const greet = (name: string) => {
    const message = `Hello, ${name}!`;
    console.log(message);
    return message;
};

// Arrow function in array methods
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers;

// Nested arrow functions
const multiply = (x: number) => (y: number) => x * y;

// Arrow function with setTimeout
setTimeout(() => {
    console.log("Delayed message");
}, 1000);

// Using arrow functions
const result1 = add(10, 20);
const result2 = double(15);
const result3 = getRandom();
const result4 = greet("Alice");
const result5 = multiply(5);

console.log(result1, result2, result3, result4, result5);
