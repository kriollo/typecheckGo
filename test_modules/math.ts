// math.ts - Módulo con exportaciones
export function add(a: number, b: number): number {
    return a + b;
}

export function multiply(x: number, y: number): number {
    return x * y;
}

export const PI = 3.14159;

export default function calculateArea(radius: number): number {
    return PI * radius * radius;
}