// Complete feature test - all working features

// ===== Variables =====
const num = 42;
let str = "hello";
var flag = true;

// ===== Arrays =====
const numbers = [1, 2, 3, 4, 5];
const mixed = [1, "two", true];

// ===== Functions =====
function add(a: number, b: number): number {
    return a + b;
}

function greet(name: string): string {
    return "Hello, " + name;
}

// ===== Arrow Functions =====
const multiply = (x: number, y: number) => x * y;
const square = x => x * x;
const getRandom = () => Math.random();

const complexArrow = (a: number) => {
    const result = a * 2;
    return result;
};

// ===== Operators =====
const sum = 10 + 20;
const diff = 50 - 30;
const product = 5 * 6;
const quotient = 100 / 10;
const remainder = 17 % 5;

const isEqual = 5 === 5;
const isNotEqual = 10 !== 5;
const isGreater = 20 > 10;
const isLess = 5 < 10;

const andResult = true && false;
const orResult = true || false;
const notResult = !false;

// ===== Unary Operators =====
let counter = 0;
counter++;
++counter;
counter--;
--counter;

const negative = -10;
const positive = +5;

// ===== Assignments =====
let x = 10;
x = 20;
x += 5;
x -= 3;
x *= 2;
x /= 4;

// ===== For Loops =====
for (let i = 0; i < 5; i) {
    const value = numbers[i];
    console.log(value);
}

// ===== While Loops =====
let count = 0;
while (count < 3) {
    console.log(count);
    count++;
}

// ===== If Statements =====
if (num > 0) {
    console.log("Positive");
}

// Ternary operator not yet supported
// const check = flag ? "yes" : "no";

// ===== Template Strings =====
const name = "Alice";
const age = 30;
const message = `Name: ${name}, Age: ${age}`;
const complex = `Sum: ${10 + 20}, Product: ${5 * 6}`;

// ===== Global Objects =====

// Console
console.log("Testing console");
console.error("Error message");
console.warn("Warning");
console.info("Info");

// Math
const pi = Math.PI;
const e = Math.E;
const randomNum = Math.random();
const maxNum = Math.max(10, 20, 30);
const minNum = Math.min(5, 15, 25);
const absNum = Math.abs(-42);
const ceilNum = Math.ceil(4.3);
const floorNum = Math.floor(4.9);
const roundNum = Math.round(4.5);

// Array
const isArray = Array.isArray(numbers);

// JSON
const jsonStr = JSON.stringify(numbers);

// Global functions
const parsed = parseInt("42");
const floated = parseFloat("3.14");
const notANum = isNaN(parsed);

// ===== Function Calls =====
const result1 = add(5, 3);
const result2 = multiply(4, 7);
const result3 = square(9);
const result4 = greet("Bob");

// ===== Member Access =====
const firstNum = numbers[0];
const length = numbers.length;

// ===== Complex Expressions =====
const expr1 = (10 + 20) * 3;
const expr2 = num > 0 && str === "hello";
const expr3 = sum + product * 2 - diff / 5;

// ===== Nested Functions =====
function outer(x: number) {
    function inner(y: number) {
        return x + y;
    }
    return inner(10);
}

const outerResult = outer(5);

// ===== Arrow Functions in Callbacks =====
setTimeout(() => {
    console.log("Delayed");
}, 1000);

const intervalId = setInterval(() => {
    console.log("Repeated");
}, 1000);

clearInterval(intervalId);

// ===== Imports (from other files) =====
// This file can import from math.ts, utils.ts, etc.

console.log("All features test completed successfully!");
