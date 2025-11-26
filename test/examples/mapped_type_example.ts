// Mapped Type Example
type Keys = 'a' | 'b';
type Flags = { [K in Keys]: boolean };
const flags: Flags = { a: true, b: false };
