// Correct: Hybrid type
interface Counter {
  (start: number): string;
  interval: number;
  reset(): void;
}

function getCounter(): Counter {
  const counter = ((start: number) => start.toString()) as Counter;
  counter.interval = 1000;
  counter.reset = () => {};
  return counter;
}
