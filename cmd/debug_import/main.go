package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/parser"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: debug_import <file.ts>")
	}

	filename := os.Args[1]
	content, err := os.ReadFile(filename)
	if err != nil {
		log.Fatalf("Error reading file: %v", err)
	}

	fmt.Printf("=== DEBUGGING IMPORT PARSING ===\n")
	fmt.Printf("File: %s\n", filename)
	fmt.Printf("Content:\n%s\n", string(content))
	fmt.Printf("=== TOKEN ANALYSIS ===\n")

	// Vamos a analizar manualmente los primeros caracteres
	source := string(content)
	lines := strings.Split(source, "\n")

	for i, line := range lines {
		fmt.Printf("Line %d: '%s'\n", i+1, line)
		if strings.Contains(line, "import") {
			fmt.Printf("  -> Found 'import' in line %d\n", i+1)
			// Verificar si hay espacios o caracteres especiales
			for j, char := range line {
				if j < 10 { // Solo mostrar primeros 10 caracteres
					fmt.Printf("    Pos %d: '%c' (code: %d)\n", j, char, int(char))
				}
			}
		}
	}

	fmt.Printf("\n=== PARSING RESULTS ===\n")

	// Parse the file
	program, err := parser.ParseFile(filename)

	if err != nil {
		fmt.Printf("Parse error: %v\n", err)
	} else {
		fmt.Printf("Parse successful!\n")
		fmt.Printf("Number of statements: %d\n", len(program.Body))

		for i, stmt := range program.Body {
			fmt.Printf("\nStatement %d: %T\n", i+1, stmt)

			if importDecl, ok := stmt.(*ast.ImportDeclaration); ok {
				fmt.Printf("  ✓ Import declaration found!\n")
				fmt.Printf("  Source: %s\n", importDecl.Source.Raw)
				fmt.Printf("  Source path: %s\n", importDecl.Source.Value)
				fmt.Printf("  Number of specifiers: %d\n", len(importDecl.Specifiers))

				for j, spec := range importDecl.Specifiers {
					if spec.Imported != nil {
						fmt.Printf("    Specifier %d: %s -> %s\n", j+1, spec.Imported.Name, spec.Local.Name)
					} else {
						fmt.Printf("    Specifier %d: (default) -> %s\n", j+1, spec.Local.Name)
					}
				}
			}
		}
	}
}
