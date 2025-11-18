// Test classes with inheritance and modifiers

// Basic class
class Person {
    name: string;
    age: number;

    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }

    greet() {
        console.log(`Hello, I'm ${this.name}`);
    }
}

// Class with inheritance
class Employee extends Person {
    private salary: number;
    protected department: string;
    public position: string;

    constructor(name: string, age: number, position: string) {
        super(name, age);
        this.position = position;
        this.salary = 50000;
        this.department = "Engineering";
    }

    work() {
        console.log(`${this.name} is working as ${this.position}`);
    }

    getSalary(): number {
        return this.salary;
    }
}

// Class with static members
class MathUtils {
    static PI = 3.14159;

    static square(x: number): number {
        return x * x;
    }

    static cube(x: number): number {
        return x * x * x;
    }
}

// Using classes
const person = new Person("John", 30);
person.greet();

const employee = new Employee("Jane", 25, "Developer");
employee.work();
console.log(employee.getSalary());

// Using static members
console.log(MathUtils.PI);
console.log(MathUtils.square(5));

// Class with readonly
class Config {
    readonly apiUrl: string;
    readonly timeout: number;

    constructor(url: string) {
        this.apiUrl = url;
        this.timeout = 5000;
    }
}

const config = new Config("https://api.example.com");
console.log(config.apiUrl);
