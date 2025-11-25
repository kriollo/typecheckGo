// Error: Function overload implementation mismatch
function process(x: string): string;
function process(x: number): number;
function process(x: string | number): boolean {
  return true;
}
