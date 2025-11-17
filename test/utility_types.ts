// Test TypeScript Utility Types

interface User {
    id: number;
    name: string;
    email: string;
    age: number;
}

// Partial<T> - Makes all properties optional
type PartialUser = Partial<User>;

// Required<T> - Makes all properties required
type RequiredUser = Required<User>;

// Readonly<T> - Makes all properties readonly
type ReadonlyUser = Readonly<User>;

// Pick<T, K> - Pick specific properties
type UserPreview = Pick<User, 'id' | 'name'>;

// Omit<T, K> - Omit specific properties
type UserWithoutEmail = Omit<User, 'email'>;

// Record<K, V> - Create object type with keys K and values V
type UserMap = Record<string, User>;

// Exclude<T, U> - Exclude types from union
type Status = 'active' | 'inactive' | 'pending';
type ActiveStatus = Exclude<Status, 'inactive'>;

// Extract<T, U> - Extract types from union
type StringOrNumber = string | number | boolean;
type OnlyString = Extract<StringOrNumber, string>;

// NonNullable<T> - Remove null and undefined
type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>;

console.log('Utility types test');
