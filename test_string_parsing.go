package main

import (
	"fmt"
	"log"
	"os"
	"tstypechecker/pkg/parser"
)

func main() {
	fmt.Println("=== Test de parsing de string ===")
	
	// Probar diferentes formatos de string
	testCases := []struct {
		name string
		code string
	}{
		{"string doble", `const x = "hello";`},
		{"string simple", `const x = 'hello';`},
		{"import doble", `import { add } from "./math.js";`},
		{"import simple", `import { add } from './math.js';`},
	}
	
	for i, testCase := range testCases {
		fmt.Printf("\n--- Test %d: %s ---\n", i+1, testCase.name)
		
		// Crear archivo temporal
		filename := fmt.Sprintf("test_temp_%d.ts", i)
		err := os.WriteFile(filename, []byte(testCase.code), 0644)
		if err != nil {
			log.Printf("Error al crear archivo temporal: %v", err)
			continue
		}
		defer os.Remove(filename)
		
		program, err := parser.ParseFile(filename)
		if err != nil {
			log.Printf("Error: %v", err)
		} else {
			fmt.Printf("Parseado exitosamente: %d declaraciones\n", len(program.Body))
		}
	}
}