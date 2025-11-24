export interface Animal { speak(): void; }
export class Dog implements Animal { speak() { console.log("woof"); } }