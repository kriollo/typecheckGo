// Correct: Protected member access
class Base {
  protected value: number = 10;
}

class Derived extends Base {
  getValue() {
    return this.value;
  }
}

const obj = new Derived();
console.log(obj.getValue());
