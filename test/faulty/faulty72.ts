function oldPromise(): Promise<number> { return new Promise(resolve => resolve(42)); }
var p: string = oldPromise();