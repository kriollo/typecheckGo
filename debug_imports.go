package main

import (
	"fmt"
	"log"
	"tstypechecker/pkg/checker"
	"tstypechecker/pkg/parser"
)

func main() {
	filename := "test/main.ts"

	// Parse file
	ast, err := parser.ParseFile(filename)
	if err != nil {
		log.Fatalf("Parse error: %v", err)
	}

	// Create type checker with module resolution
	tc := checker.NewWithModuleResolver("test")

	// Check file
	errors := tc.CheckFile(filename, ast)

	// Dump symbol table
	fmt.Println("=== SYMBOL TABLE ===")
	fmt.Println(tc.DumpSymbolTable())

	// Show errors
	fmt.Printf("\n=== ERRORS (%d) ===\n", len(errors))
	for _, err := range errors {
		fmt.Printf("  - %s\n", err.Error())
	}
}
