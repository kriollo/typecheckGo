// Correct: Decorator usage
function logged(target: any, key: string) {
  console.log(`${key} was called`);
}

class Calculator {
  @logged
  add(a: number, b: number): number {
    return a + b;
  }
}
