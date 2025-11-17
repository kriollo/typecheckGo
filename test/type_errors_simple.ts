// Test file for type errors without type annotations

// ❌ Error: Type mismatch in assignment
let x = 10;
x = "string";

// ❌ Error: Type mismatch in assignment
let y = "hello";
y = 42;

// ❌ Error: Type mismatch in assignment
let z = true;
z = "not a boolean";

// ❌ Error: Type mismatch in assignment
let arr = [1, 2, 3];
arr = "not an array";
