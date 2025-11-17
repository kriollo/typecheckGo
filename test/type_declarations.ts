// Test type and interface declarations

// Simple type alias
type StringOrNumber = string | number;

// Union type with literals
type Status = 'open' | 'closed' | 'pending';

// Type alias with generics
type Result<T> = T | null;

// Interface declaration
interface User {
    name: string;
    age: number;
    email?: string;
}

// Interface with extends
interface Admin extends User {
    role: string;
}

// Using the types
const status: Status = 'open';
const userName: string = "John";

console.log(status, userName);
