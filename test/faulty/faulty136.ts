// Error: Utility type NonNullable with null
type T = NonNullable<string | null | undefined>;
const value: T = null;
