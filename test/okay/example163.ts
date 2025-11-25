// Correct: Parameter properties
class Point {
  constructor(public readonly x: number, public readonly y: number) {}
}

const point = new Point(10, 20);
const newPoint = new Point(point.x + 10, point.y);
