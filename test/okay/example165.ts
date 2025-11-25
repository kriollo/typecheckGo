// Correct: Generic class with constraint
class Container<T extends { id: number }> {
  private item: T;

  constructor(item: T) {
    this.item = item;
  }
}

const container = new Container({ id: 1, name: "John" });
