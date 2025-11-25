// Correct: Indexable interface
interface StringArray {
  [index: number]: string;
}

const arr: StringArray = ["a", "b", "c"];
