type OmitType = Omit<{ a: number; b: string }, "b">;
var omit: OmitType = { a: "1", b: "2" };