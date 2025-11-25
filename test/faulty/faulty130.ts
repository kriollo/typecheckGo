// Error: Utility type Partial misuse
interface User {
  id: number;
  name: string;
}

const user: Partial<User> = { id: 1 };
console.log(user.name.toUpperCase());
