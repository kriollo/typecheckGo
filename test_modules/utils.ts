// utils.ts - Módulo con importaciones y exportaciones
import { add, multiply } from "./math";
import calculateArea, { PI } from "./math";

export function calculateTotal(price: number, quantity: number): number {
    return multiply(price, quantity);
}

export function calculateCircleArea(radius: number): number {
    return calculateArea(radius);
}

export { add, PI }; // Re-exportar