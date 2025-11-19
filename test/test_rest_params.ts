// Test: Rest parameters without type annotations
function testRest(...args) {
    console.log(args);
}

const arrowRest = (...items) => {
    return items.length;
};

testRest(1, 2, 3);
arrowRest('a', 'b', 'c');
