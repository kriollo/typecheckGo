// Error: Indexable interface wrong type
interface StringArray {
  [index: number]: string;
}

const arr: StringArray = ["a", "b", 3];
