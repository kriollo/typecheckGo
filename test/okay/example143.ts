// Correct: Assertion function
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("Not a string");
  }
}

const val: unknown = "hello";
assertIsString(val);
console.log(val.toUpperCase());
