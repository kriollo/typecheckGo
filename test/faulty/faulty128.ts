// Error: Never type assignment
function throwError(): never {
  throw new Error("Error");
}

const result: string = throwError();
