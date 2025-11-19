function createArray<T>(length: number, value: T): T[] { return Array(length).fill(value); }
var arr: string[] = createArray<number>(3, "test");