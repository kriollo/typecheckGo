class GenericClass<T> { value: T; constructor(v: T) { this.value = v; } }
var gc = new GenericClass("hello");