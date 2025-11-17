package main

import (
	"fmt"
	"log"
	"tstypechecker/pkg/parser"
)

func main() {
	fmt.Println("=== Test de parsing simple ===")
	
	// Probar archivo simple
	fmt.Println("\n--- Probando simple.ts ---")
	program, err := parser.ParseFile("test/simple.ts")
	if err != nil {
		log.Printf("Error al parsear simple.ts: %v", err)
	} else {
		fmt.Printf("Parseado exitosamente: %d declaraciones\n", len(program.Body))
		for i, stmt := range program.Body {
			fmt.Printf("  %d: %T\n", i+1, stmt)
		}
	}
	
	// Probar import simple
	fmt.Println("\n--- Probando import_simple.ts ---")
	program, err = parser.ParseFile("test/import_simple.ts")
	if err != nil {
		log.Printf("Error al parsear import_simple.ts: %v", err)
	} else {
		fmt.Printf("Parseado exitosamente: %d declaraciones\n", len(program.Body))
		for i, stmt := range program.Body {
			fmt.Printf("  %d: %T\n", i+1, stmt)
		}
	}
}