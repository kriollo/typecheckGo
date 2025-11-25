// Error: Constructor type mismatch
interface ClockConstructor {
  new (hour: number, minute: number): ClockInterface;
}

interface ClockInterface {
  tick(): void;
}

const Clock: ClockConstructor = class Clock implements ClockInterface {
  constructor(h: string, m: string) {}
  tick() {}
};
