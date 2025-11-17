// main.ts - Archivo principal con importaciones
import { calculateTotal, calculateCircleArea } from "./utils";
import { add } from "./math";

const total = calculateTotal(10, 5);
const area = calculateCircleArea(3);
const sum = add(2, 3);

console.log(`Total: ${total}, Area: ${area}, Sum: ${sum}`);