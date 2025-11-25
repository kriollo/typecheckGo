// Correct: Class implements interface
interface Printable {
  print(): void;
  format(): string;
}

class Document implements Printable {
  print() {
    console.log("Printing...");
  }
  format() {
    return "formatted";
  }
}
