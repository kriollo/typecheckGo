// Correct: Unknown type with type guard
const value: unknown = "hello";
if (typeof value === "string") {
  console.log(value.toUpperCase());
}
