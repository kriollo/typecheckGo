// Error: Utility type Parameters wrong usage
type Func = (a: string, b: number) => void;
type Params = Parameters<Func>;
const params: Params = ["hello"];
