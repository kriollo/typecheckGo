// Error: Optional chaining with wrong type
interface User {
  address?: {
    street: string;
  };
}

const user: User = {};
const street: string = user.address?.street;
