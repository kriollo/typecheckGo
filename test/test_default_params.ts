// Test: Default parameters
function test(a, b = 5, c = 'hello') {
    return a + b;
}

const arrow = (x = 10, y = 20) => x + y;

test(1);
arrow();
