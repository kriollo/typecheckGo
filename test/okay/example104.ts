// Correct: Mapped type readonly
type ReadonlyType<T> = {
  readonly [P in keyof T]: T[P];
};

const user: ReadonlyType<{ name: string }> = { name: "Alice" };
const newUser = { ...user, name: "Bob" };
