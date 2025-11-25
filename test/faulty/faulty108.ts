// Error: Discriminated union wrong property
type Circle = { kind: "circle"; radius: number };
type Square = { kind: "square"; sideLength: number };
type Shape = Circle | Square;

function getArea(shape: Shape): number {
  if (shape.kind === "circle") {
    return Math.PI * shape.sideLength ** 2;
  }
  return shape.radius ** 2;
}
