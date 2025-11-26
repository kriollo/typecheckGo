// Function Overload Example
function add(a: number, b: number): number;
function add(a: string, b: string): string;
function add(a: any, b: any): any {
  return a + b;
}
const sum1 = add(1, 2);
const sum2 = add('a', 'b');
