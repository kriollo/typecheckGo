// Correct: Mapped type modifier
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

type ReadonlyPerson = {
  readonly name: string;
  readonly age: number;
};

const person: Mutable<ReadonlyPerson> = { name: "John", age: 30 };
person.name = "Jane";
