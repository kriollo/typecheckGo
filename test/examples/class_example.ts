// Class Example
class Person {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  greet() {
    return `Hello, ${this.name}`;
  }
}
const p = new Person('Juan');
