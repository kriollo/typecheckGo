export const sum = (...nums: number[]): number => nums.reduce((a,b)=>a+b,0);
var total: string = sum(1,2,3);