// Test file with intentional errors

// Error: undefined variable
const x = undefinedVar;

// Error: wrong number of arguments
function greet(name: string) {
    return "Hello, " + name;
}
greet(); // Too few arguments
greet("Alice", "Bob"); // Too many arguments

// Error: calling non-function
const message = "Hello";
message(); // Not a function

// Error: undefined function
unknownFunction();

// Valid code
const validVar = 42;
console.log(validVar);
