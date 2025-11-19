export async function* asyncGenerator() { yield await Promise.resolve(1); }
var gen: string = asyncGenerator();