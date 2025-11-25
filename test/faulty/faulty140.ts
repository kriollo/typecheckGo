// Error: Keyof with wrong property
interface Person {
  name: string;
  age: number;
}

type PersonKeys = keyof Person;
const key: PersonKeys = "email";
