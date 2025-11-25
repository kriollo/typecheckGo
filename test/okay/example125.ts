// Correct: Getter/setter types
class Temperature {
  private _celsius: number = 0;

  get celsius(): number {
    return this._celsius;
  }

  set celsius(value: number) {
    this._celsius = value;
  }
}
