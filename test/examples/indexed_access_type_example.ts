// Indexed Access Type Example
type Person = { name: string; age: number };
type NameType = Person['name'];
const n: NameType = 'Alice';
