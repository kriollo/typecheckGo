// Error: Generic constraint violation
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const person = { name: "John", age: 30 };
const value = getProperty(person, "email");
