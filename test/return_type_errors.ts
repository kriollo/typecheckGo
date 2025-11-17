// Test file for return type errors

// ❌ Error: inconsistent return types
function mixedReturns(x) {
    if (x > 0) {
        return 42;
    } else {
        return "negative";
    }
}

// ❌ Error: inconsistent return types
function anotherMixed(flag) {
    if (flag) {
        return true;
    }
    return 123;
}

console.log(mixedReturns(5));
console.log(anotherMixed(true));
