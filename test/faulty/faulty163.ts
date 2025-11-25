// Error: Parameter properties wrong modifier
class Point {
  constructor(public readonly x: number, public readonly y: number) {}
}

const point = new Point(10, 20);
point.x = 30;
