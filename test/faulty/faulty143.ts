// Error: Assertion function wrong implementation
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "number") {
    throw new Error("Not a string");
  }
}
