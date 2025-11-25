// Correct: Callable interface
interface Callable {
  (x: number): string;
}

const fn: Callable = (x: number) => x.toString();
