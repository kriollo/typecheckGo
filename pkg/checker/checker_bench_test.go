package checker

import (
	"os"
	"path/filepath"
	"testing"

	"tstypechecker/pkg/parser"
)

// BenchmarkCheckFile benchmarks type checking a single file
func BenchmarkCheckFile(b *testing.B) {
	// Use a real file from the project
	testFile := filepath.Join("..", "..", "testProject", "jscontrollers", "bodega", "masters", "salida_express", "item.ts")

	// Check if file exists
	if _, err := os.Stat(testFile); os.IsNotExist(err) {
		b.Skip("Test file not found")
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Create a new checker for each iteration
		rootDir := filepath.Join("..", "..", "testProject")
		tc := NewWithModuleResolver(rootDir)

		// Parse the file
		ast, err := parser.ParseFile(testFile)
		if err != nil {
			b.Fatalf("Failed to parse file: %v", err)
		}

		// Type check
		_ = tc.CheckFile(testFile, ast)
	}
}

// BenchmarkParseFile benchmarks just the parsing step
func BenchmarkParseFile(b *testing.B) {
	testFile := filepath.Join("..", "..", "testProject", "jscontrollers", "bodega", "masters", "salida_express", "item.ts")

	if _, err := os.Stat(testFile); os.IsNotExist(err) {
		b.Skip("Test file not found")
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := parser.ParseFile(testFile)
		if err != nil {
			b.Fatalf("Failed to parse file: %v", err)
		}
	}
}

// BenchmarkTypeCheckOnly benchmarks just the type checking step (no parsing)
func BenchmarkTypeCheckOnly(b *testing.B) {
	testFile := filepath.Join("..", "..", "testProject", "jscontrollers", "bodega", "masters", "salida_express", "item.ts")

	if _, err := os.Stat(testFile); os.IsNotExist(err) {
		b.Skip("Test file not found")
	}

	// Parse once
	ast, err := parser.ParseFile(testFile)
	if err != nil {
		b.Fatalf("Failed to parse file: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Create a new checker for each iteration
		rootDir := filepath.Join("..", "..", "testProject")
		tc := NewWithModuleResolver(rootDir)

		// Type check only
		_ = tc.CheckFile(testFile, ast)
	}
}
