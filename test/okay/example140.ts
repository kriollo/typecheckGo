// Correct: Keyof operator
interface Person {
  name: string;
  age: number;
}

type PersonKeys = keyof Person;
const key: PersonKeys = "name";
