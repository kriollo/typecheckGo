// Decorators Example
function log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;
    descriptor.value = function (...args: any[]) {
        console.log(`Calling ${propertyKey} with`, args);
        return original.apply(this, args);
    };
}

class Example {
    @log
    greet(name: string) {
        return `Hello, ${name}`;
    }
}

const e = new Example();
e.greet("TypeScript");
