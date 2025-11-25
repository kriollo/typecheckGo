// Correct: Symbol type
const sym: symbol = Symbol("key");
const obj = {
  [sym]: "value"
};
console.log(obj[sym]);
