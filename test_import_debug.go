package main

import (
	"fmt"
	"log"
	"os"
	"tstypechecker/pkg/parser"
)

func main() {
	fmt.Println("=== Test de parsing de imports ===")
	
	// Crear archivo de import
	importCode := `import { add } from "./math.js";`
	fmt.Printf("Código a parsear: %s\n", importCode)
	
	// Crear archivo temporal
	err := os.WriteFile("test_import_debug.ts", []byte(importCode), 0644)
	if err != nil {
		log.Printf("Error al crear archivo temporal: %v", err)
		return
	}
	defer os.Remove("test_import_debug.ts")
	
	// Intentar parsear
	program, err := parser.ParseFile("test_import_debug.ts")
	if err != nil {
		log.Printf("Error al parsear: %v", err)
		return
	}
	
	fmt.Printf("Parseado exitosamente: %d declaraciones\n", len(program.Body))
	for i, stmt := range program.Body {
		fmt.Printf("  %d: %T\n", i+1, stmt)
	}
}