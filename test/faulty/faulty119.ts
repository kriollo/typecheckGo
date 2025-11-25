// Error: Nullish coalescing with wrong default type
const value: string | null = null;
const result: string = value ?? 42;
