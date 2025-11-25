// Error: Generic class constraint violation
class Container<T extends { id: number }> {
  private item: T;

  constructor(item: T) {
    this.item = item;
  }
}

const container = new Container({ name: "John" });
