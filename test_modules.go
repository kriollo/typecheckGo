package main

import (
	"fmt"
	"log"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/checker"
	"tstypechecker/pkg/parser"
)

func main() {
	fmt.Println("=== Test de Sistema de Módulos ===")
	
	// Crear type checker con resolución de módulos
	tc := checker.NewWithModuleResolver(".")
	
	// Probar archivo con imports
	fmt.Println("\n--- Probando main_simple.ts con imports ---")
	result, err := checkFileWithModules(tc, "test/main_simple.ts")
	if err != nil {
		log.Printf("Error al analizar main_simple.ts: %v", err)
	} else {
		fmt.Printf("Resultado: %s\n", result)
	}
	
	// Probar archivo con exports
	fmt.Println("\n--- Probando math_simple.ts con exports ---")
	result, err = checkFileWithModules(tc, "test/math_simple.ts")
	if err != nil {
		log.Printf("Error al analizar math_simple.ts: %v", err)
	} else {
		fmt.Printf("Resultado: %s\n", result)
	}
	
	fmt.Println("\n=== Test completado ===")
}

func checkFileWithModules(tc *checker.TypeChecker, filename string) (string, error) {
	// Parsear el archivo
	program, err := parseFile(filename)
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

func parseFile(filename string) (*ast.File, error) {
	return parser.ParseFile(filename)
}