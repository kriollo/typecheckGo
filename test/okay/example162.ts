// Correct: Private member with getter
class Person {
  private ssn: string = "123-45-6789";

  getSSN(): string {
    return this.ssn;
  }
}

const person = new Person();
console.log(person.getSSN());
