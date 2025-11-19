const asyncFunc = async (n: number): Promise<number> => { return n * 2; };
export { asyncFunc };
var doubled: string = asyncFunc(5);