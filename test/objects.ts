// Test object literals

// Simple object
const person = {
    name: "Alice",
    age: 30
};

// Nested object
const user = {
    id: 1,
    profile: {
        name: "Bob",
        email: "bob@example.com"
    }
};

// Object with different value types
const mixed = {
    str: "hello",
    num: 42,
    bool: true,
    arr: [1, 2, 3]
};

// Empty object
const empty = {};

// Object with methods (arrow functions)
const calculator = {
    add: (a: number, b: number) => a + b,
    multiply: (x: number, y: number) => x * y
};

// Using objects
console.log(person.name);
console.log(user.profile.email);
const sum = calculator.add(5, 3);

console.log("Objects test completed");
