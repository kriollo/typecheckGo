// Error: Accessor with different types
class Temperature {
  private _value: number = 0;

  get value(): number {
    return this._value;
  }

  set value(v: string) {
    this._value = parseFloat(v);
  }
}
