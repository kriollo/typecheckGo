package main

import (
	"fmt"
	"log"
	"tstypechecker/pkg/checker"
	"tstypechecker/pkg/parser"
)

func main() {
	fmt.Println("=== Test de Módulos sin Imports ===")
	
	// Crear type checker con resolución de módulos
	tc := checker.NewWithModuleResolver(".")
	
	// Probar archivo con exports solamente (sin imports)
	fmt.Println("\n--- Probando utils.ts con exports ---")
	result, err := checkFileWithModules(tc, "test/utils.ts")
	if err != nil {
		log.Printf("Error al analizar utils.ts: %v", err)
	} else {
		fmt.Printf("Resultado: %s\n", result)
	}
	
	fmt.Println("\n=== Test completado ===")
}

func checkFileWithModules(tc *checker.TypeChecker, filename string) (string, error) {
	// Parsear el archivo
	program, err := parser.ParseFile(filename)
	if err != nil {
		return "", fmt.Errorf("error al parsear %s: %w", filename, err)
	}
	
	// Type checking con soporte de módulos
	errors := tc.CheckFile(filename, program)
	
	if len(errors) > 0 {
		result := fmt.Sprintf("Encontrados %d errores:\n", len(errors))
		for _, err := range errors {
			result += fmt.Sprintf("  - %s\n", err.Error())
		}
		return result, nil
	}
	
	return "No se encontraron errores", nil
}