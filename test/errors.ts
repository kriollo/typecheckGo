// Test file with intentional errors

// Error: undefined variable
const x = "undefinedVar";

a = y + x;

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

// Valid code with type annotations
const validVar: number = 42;
const greeting: string = "Hello";
console.log(validVar);

const getStatusClass = (status: number): string => {
    return "bg-green-100";
};
const result = getStatusClass(1);
