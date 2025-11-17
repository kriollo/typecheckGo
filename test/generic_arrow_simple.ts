// Test simple generic arrow functions

// Simple generic arrow function
const identity = <T>(x: T): T => {
    return x;
};

// Generic arrow with default type
const withDefault = <T = string>(x: T): T => {
    return x;
};

// Multiple type parameters
const pair = <A, B>(a: A, b: B) => {
    return a;
};

// Using the functions
const num = identity(42);
const str = withDefault("hello");
const p = pair(1, "two");

console.log(num, str, p);
