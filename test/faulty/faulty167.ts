// Error: Multiple generic constraints wrong order
function merge<T extends object, U extends object>(obj1: T, obj2: U): T & U {
  return { ...obj2, ...obj1 };
}
