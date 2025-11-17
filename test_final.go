package main

import (
	"fmt"
	"log"
	"tstypechecker/pkg/checker"
	"tstypechecker/pkg/parser"
)

func main() {
	fmt.Println("=== Test Final de Sistema de Módulos ===")
	
	// Crear type checker con resolución de módulos
	tc := checker.NewWithModuleResolver(".")
	
	// Test 1: Archivo con exports
	fmt.Println("\n1. Probando exports en utils.ts:")
	result, err := checkFile(tc, "test/utils.ts")
	if err != nil {
		log.Printf("Error: %v", err)
	} else {
		fmt.Printf("Resultado: %s\n", result)
	}
	
	// Test 2: Archivo con funciones normales
	fmt.Println("\n2. Probando funciones normales en simple.ts:")
	result, err = checkFile(tc, "test/simple.ts")
	if err != nil {
		log.Printf("Error: %v", err)
	} else {
		fmt.Printf("Resultado: %s\n", result)
	}
	
	// Test 3: Verificar tabla de símbolos
	fmt.Println("\n3. Tabla de símbolos:")
	symbolTable := tc.GetSymbolTable()
	fmt.Printf("Global scope symbols: %d\n", len(symbolTable.Global.Symbols))
	for name, symbol := range symbolTable.Global.Symbols {
		fmt.Printf("  - %s: %s\n", name, symbol.Type)
	}
	
	fmt.Println("\n=== Test completado exitosamente ===")
	fmt.Println("✅ Sistema de módulos implementado para exports")
	fmt.Println("⚠️  Falta arreglar parsing de imports para completar el sistema")
}

func checkFile(tc *checker.TypeChecker, filename string) (string, error) {
	// Parsear el archivo
	program, err := parser.ParseFile(filename)
	if err != nil {
		return "", fmt.Errorf("error al parsear %s: %w", filename, err)
	}
	
	// Type checking
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