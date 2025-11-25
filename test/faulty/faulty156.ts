// Error: Callable interface wrong return type
interface Callable {
  (x: number): string;
}

const fn: Callable = (x: number) => x * 2;
