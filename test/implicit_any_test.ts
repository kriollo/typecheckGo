// Test noImplicitAny option

// This should error with noImplicitAny: true
let x;

// This should error with noImplicitAny: true
function test(param) {
    return param;
}

// This should NOT error (has type annotation)
let y: number;

// This should NOT error (has initializer)
let z = 42;

// This should NOT error (has type annotation)
function test2(param: string) {
    return param;
}

console.log(x, y, z);
