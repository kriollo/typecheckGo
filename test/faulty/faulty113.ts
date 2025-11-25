// Error: Index signature type mismatch
interface StringMap {
  [key: string]: string;
}

const map: StringMap = {
  name: "John",
  age: 30
};
