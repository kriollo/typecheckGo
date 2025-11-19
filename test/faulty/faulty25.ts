export interface Animal { speak(): void; }
export class Dog implements Animal { speak() { return "woof"; } }