// Error: Utility type Pick wrong keys
interface User {
  id: number;
  name: string;
  email: string;
}

type UserPreview = Pick<User, "id" | "age">;
