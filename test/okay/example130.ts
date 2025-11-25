// Correct: Utility type Partial
interface User {
  id: number;
  name: string;
}

const user: Partial<User> = { id: 1 };
if (user.name) {
  console.log(user.name.toUpperCase());
}
