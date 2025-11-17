// Test file for return type checking without else

// ✅ Valid: consistent return types
function getNumber() {
    return 42;
}

function getString() {
    return "hello";
}

// ✅ Valid: early return
function checkPositive(x) {
    if (x < 0) {
        return "negative";
    }
    return "positive";
}

// ❌ Error: inconsistent returns
function mixedReturns(x) {
    if (x > 0) {
        return 42;
    }
    return "text";
}

console.log(getNumber());
console.log(getString());
console.log(checkPositive(5));
console.log(mixedReturns(10));
