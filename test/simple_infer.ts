// Simple infer test

type ArrayElement<T> = T extends (infer U)[] ? U : never;

type Test = ArrayElement<string[]>;
