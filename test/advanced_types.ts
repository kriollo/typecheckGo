// Test advanced TypeScript types

// 1. Mapped Types
type Readonly<T> = {
    readonly [K in keyof T]: T[K]
};

type Partial<T> = {
    [K in keyof T]?: T[K]
};

type Record<K, V> = {
    [P in K]: V
};

// 2. Conditional Types
type IsString<T> = T extends string ? true : false;
type NonNullable<T> = T extends null ? never : T;

// 3. Template Literal Types
type Greeting = `Hello ${string}`;
type EventName<T> = `on${T}`;
type PropKey<T> = `get${T}` | `set${T}`;

// 4. Indexed Access Types
type Person = {
    name: string;
    age: number;
};

type PersonName = Person['name'];
type PersonKeys = keyof Person;

// 5. Generic Arrow Functions (not fully supported yet)
// const identity = <T>(x: T): T => x;
// const map = <T, U>(arr: T[], fn: (x: T) => U): U[] => [];
// const filter = <T>(arr: T[], pred: (x: T) => boolean): T[] => [];

// 6. Utility Types Usage
type User = {
    id: number;
    name: string;
    email: string;
};

type PartialUser = Partial<User>;
type ReadonlyUser = Readonly<User>;
type UserRecord = Record<string, User>;

console.log('Advanced types test');
