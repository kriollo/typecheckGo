// Test file for type inference without type annotations

// ✅ Valid: Type inference from literals
const num = 42;
const str = "hello";
const bool = true;
const arr = [1, 2, 3];

// ✅ Valid: Type inference from expressions
const sum = 10 + 20;
const concat = "hello" + " world";
const comparison = 5 > 3;

// ✅ Valid: Assignments with compatible types
let a = 10;
a = 20;
a = 30;

let b = "hello";
b = "world";

// ✅ Valid: Compound assignments
let counter = 0;
counter += 1;
counter -= 1;
counter *= 2;
counter /= 2;

let message = "Hello";
message += " World";

// ✅ Valid: Arrow functions
const add = (x, y) => x + y;
const greet = (name) => "Hello, " + name;

// ✅ Valid: Function calls with inferred types
const result = add(5, 10);
const greeting = greet("Alice");

console.log(num, str, bool, arr);
console.log(sum, concat, comparison);
console.log(a, b);
console.log(counter, message);
console.log(result, greeting);
