// Test: Async function calling another top-level async function

async function firstFunction(param1, param2) {
    console.log("First", param1);
    return param1 + param2;
}

async function secondFunction(param) {
    // This should find firstFunction in the same scope
    const result = await firstFunction(param, 10);
    return result;
}

// Call it
secondFunction(5);
