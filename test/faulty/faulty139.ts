// Error: Decorator metadata wrong type
function logged(target: any, key: string) {
  console.log(`${key} was called`);
}

class Calculator {
  @logged
  add(a: number, b: number): string {
    return a + b;
  }
}
