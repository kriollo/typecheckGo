package main

import (
	"fmt"
	"os"
	"time"
	"tstypechecker/pkg/parser"
)

func testFile(filename string) bool {
	done := make(chan bool, 1)

	go func() {
		fmt.Printf("Parsing %s...\n", filename)
		start := time.Now()

		ast, err := parser.ParseFile(filename)
		if err != nil {
			fmt.Printf("  ❌ Error: %v\n", err)
			done <- false
			return
		}

		elapsed := time.Since(start)
		fmt.Printf("  ✓ OK en %v - Statements: %d\n", elapsed, len(ast.Body))
		done <- true
	}()

	// Timeout de 2 segundos
	select {
	case result := <-done:
		return result
	case <-time.After(2 * time.Second):
		fmt.Printf("  ❌ TIMEOUT\n")
		return false
	}
}

func main() {
	files := []string{
		"test/test_destructuring.ts",
	}

	for _, file := range files {
		if !testFile(file) {
			os.Exit(1)
		}
	}
}
