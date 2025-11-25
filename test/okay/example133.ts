// Correct: Utility type Omit
interface User {
  id: number;
  name: string;
  password: string;
}

type PublicUser = Omit<User, "password">;
const user: PublicUser = { id: 1, name: "John" };
