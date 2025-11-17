// Test file for return type checking

// ✅ Valid: consistent return types
function getNumber() {
    return 42;
}

function getString() {
    return "hello";
}

function getBoolean() {
    return true;
}

// ✅ Valid: multiple returns with same type
function max(a, b) {
    if (a > b) {
        return a;
    } else {
        return b;
    }
}

// ✅ Valid: void function
function logMessage(msg) {
    console.log(msg);
}

// ✅ Valid: early return
function checkValue(x) {
    if (x < 0) {
        return "negative";
    }
    return "positive";
}

console.log(getNumber());
console.log(getString());
console.log(getBoolean());
console.log(max(5, 10));
logMessage("test");
console.log(checkValue(-5));
