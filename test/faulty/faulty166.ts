// Error: Generic function inference failure
function identity<T>(arg: T): T {
  return arg;
}

const result: number = identity("hello");
