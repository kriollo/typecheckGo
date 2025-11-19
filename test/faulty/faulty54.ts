class GenericClass<T> { value: T; constructor(v: T) { this.value = v; } }
var gc: GenericClass<string> = new GenericClass(456);