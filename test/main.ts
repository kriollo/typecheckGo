// Módulo principal que importa desde math.ts
import { add, subtract, PI } from "./math.js";

// Función principal
function main() {
    const result1 = add(5, 3);
    const result2 = subtract(10, 4);
    
    console.log(`Resultados: ${result1}, ${result2}`);
    console.log(`PI: ${PI}`);
}

// Llamar a la función principal
main();