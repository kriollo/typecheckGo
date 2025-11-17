// Simple utility types test

interface User {
    id: number;
    name: string;
}

// Partial<T>
type PartialUser = Partial<User>;

// Readonly<T>
type ReadonlyUser = Readonly<User>;

// Pick<T, K> - commented out for now
// type UserName = Pick<User, 'name'>;

// Record<K, V>
type UserMap = Record<string, User>;

console.log('Test');
