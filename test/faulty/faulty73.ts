export const asyncArrow = async (): Promise<void> => { await Promise.resolve(); };
var res: number = asyncArrow();