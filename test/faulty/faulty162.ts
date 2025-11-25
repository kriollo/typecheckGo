// Error: Private member access
class Person {
  private ssn: string = "123-45-6789";
}

const person = new Person();
console.log(person.ssn);
