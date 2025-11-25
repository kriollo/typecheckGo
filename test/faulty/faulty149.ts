// Error: Symbol type mismatch
const sym1: symbol = Symbol("key");
const sym2: symbol = Symbol("key");
const obj = {
  [sym1]: "value"
};
console.log(obj[sym2]);
