export function promiseChain(): Promise<string> { return Promise.resolve("chain").then(s => s + "!"); }
var chain: number = promiseChain();