// Error: Covariance and contravariance violation
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

let animals: Animal[] = [];
let dogs: Dog[] = [];
dogs = animals;
