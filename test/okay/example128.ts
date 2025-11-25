// Correct: Never type
function throwError(): never {
  throw new Error("Error");
}

function process(): string {
  throwError();
}
