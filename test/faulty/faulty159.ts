// Error: Class implements interface missing method
interface Printable {
  print(): void;
  format(): string;
}

class Document implements Printable {
  print() {
    console.log("Printing...");
  }
}
