// Test: Arrow function returning object literal
const arr = [1, 2, 3];

const result = arr.map(item => ({
    value: item,
    double: item * 2
}));

console.log(result);
