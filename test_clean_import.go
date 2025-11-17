package main

import (
	"fmt"
	"log"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/parser"
)

func main() {
	fmt.Println("=== Test de import limpio ===")
	
	// Probar archivo limpio
	program, err := parser.ParseFile("test/clean_import.ts")
	if err != nil {
		log.Printf("Error al parsear clean_import.ts: %v", err)
		return
	}
	
	fmt.Printf("Parseado exitosamente: %d declaraciones\n", len(program.Body))
	for i, stmt := range program.Body {
		fmt.Printf("  %d: %T\n", i+1, stmt)
		if importDecl, ok := stmt.(*ast.ImportDeclaration); ok {
			fmt.Printf("    Source: %v\n", importDecl.Source)
			if importDecl.Source != nil {
				fmt.Printf("    Source Value: %v\n", importDecl.Source.Value)
				fmt.Printf("    Source Raw: %v\n", importDecl.Source.Raw)
			}
		}
	}
}