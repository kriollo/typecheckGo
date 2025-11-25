// Correct: Generic function inference
function identity<T>(arg: T): T {
  return arg;
}

const result: string = identity("hello");
