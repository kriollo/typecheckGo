// Error: Hybrid type wrong implementation
interface Counter {
  (start: number): string;
  interval: number;
  reset(): void;
}

function getCounter(): Counter {
  const counter = ((start: number) => start * 2) as Counter;
  counter.interval = 1000;
  counter.reset = () => {};
  return counter;
}
