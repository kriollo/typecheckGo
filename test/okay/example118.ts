// Correct: Optional chaining
interface User {
  address?: {
    street: string;
  };
}

const user: User = {};
const street: string | undefined = user.address?.street;
