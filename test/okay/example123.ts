// Correct: Function overload
function process(x: string): string;
function process(x: number): number;
function process(x: string | number): string | number {
  return x;
}
