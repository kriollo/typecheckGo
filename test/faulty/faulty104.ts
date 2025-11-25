// Error: Mapped type readonly violation
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

const user: Readonly<{ name: string }> = { name: "Alice" };
user.name = "Bob";
