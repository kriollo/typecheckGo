// Test: Top-level function should be visible in nested scopes

// Usage BEFORE declaration - should work with hoisting
callMyFunction();

// Top-level function declaration
function myFunction() {
    console.log("Hello");
}

// Usage AFTER declaration
callMyFunction();

// Another top-level function that calls the first one
function callMyFunction() {
    myFunction();
}
