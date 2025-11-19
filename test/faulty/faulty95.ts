export type PickType = Pick<{ a: number; b: string }, "a">;
export const pick: PickType = { a: "1" };