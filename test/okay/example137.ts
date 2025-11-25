// Correct: Utility type Parameters
type Func = (a: string, b: number) => void;
type Params = Parameters<Func>;
const params: Params = ["hello", 42];
