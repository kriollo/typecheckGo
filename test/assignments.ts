// Test assignments and unary operators

// Basic assignments
let x = 10;
x = 20;
x = x + 5;

// Compound assignments
let y = 5;
y += 10;
y -= 3;
y *= 2;
y /= 4;

// Unary operators - prefix
let a = 5;
let b = ++a;
let c = --a;
let d = !true;
let e = -10;

// Unary operators - postfix
let f = 5;
let g = f++;
let h = f--;

// In loops
for (let i = 0; i < 10; i++) {
    console.log(i);
}

let counter = 0;
while (counter < 5) {
    console.log(counter);
    counter++;
}

// Complex expressions
let result = 0;
result = result + 1;
result += 5;
result *= 2;

console.log("Assignments test completed");
