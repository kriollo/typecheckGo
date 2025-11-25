// Correct: Type guard
function isString(value: unknown): value is string {
  return typeof value === "string";
}

const val: unknown = "hello";
if (isString(val)) {
  console.log(val.toUpperCase());
}
