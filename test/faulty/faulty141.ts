// Error: Typeof operator misuse
const person = { name: "John", age: 30 };
type Person = typeof person;
const newPerson: Person = { name: "Jane" };
