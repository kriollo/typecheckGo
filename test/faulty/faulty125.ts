// Error: Getter/setter type mismatch
class Temperature {
  private _celsius: number = 0;

  get celsius(): number {
    return this._celsius;
  }

  set celsius(value: string) {
    this._celsius = parseFloat(value);
  }
}
