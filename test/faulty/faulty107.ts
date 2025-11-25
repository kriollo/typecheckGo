// Error: Type guard incorrect narrowing
function isString(value: unknown): value is string {
  return typeof value === "number";
}

const val: unknown = "hello";
if (isString(val)) {
  console.log(val.toFixed());
}
