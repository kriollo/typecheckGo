// Error: Rest parameters wrong type
function sum(...numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}

const result = sum(1, 2, "3");
