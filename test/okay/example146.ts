// Correct: Covariance
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

let animals: Animal[] = [];
let dogs: Dog[] = [];
animals = dogs;
