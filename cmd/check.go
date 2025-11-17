package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
	"tstypechecker/pkg/checker"
	"tstypechecker/pkg/parser"
)

var (
	outputFormat string
	showAST      bool
)

var checkCmd = &cobra.Command{
	Use:   "check [path]",
	Short: "Check TypeScript files for type errors",
	Long:  `Analyze TypeScript files and report type errors, undefined variables, and function arity mismatches.`,
	Args:  cobra.ExactArgs(1),
	RunE:  runCheck,
}

func init() {
	checkCmd.Flags().StringVarP(&outputFormat, "format", "f", "text", "Output format: text, json, toon")
	checkCmd.Flags().BoolVarP(&showAST, "ast", "a", false, "Show AST output")
}

func runCheck(cmd *cobra.Command, args []string) error {
	path := args[0]
	
	// Resolve path
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("invalid path: %w", err)
	}

	// Check if path exists
	info, err := os.Stat(absPath)
	if err != nil {
		return fmt.Errorf("cannot access path: %w", err)
	}

	// Create type checker
	typeChecker := checker.New()

	// Process files
	if info.IsDir() {
		return checkDirectory(typeChecker, absPath)
	} else {
		return checkFile(typeChecker, absPath)
	}
}

func checkDirectory(checker *checker.TypeChecker, dir string) error {
	fmt.Printf("Checking directory: %s\n", dir)
	
	// Walk directory and find TypeScript files
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		// Skip node_modules and hidden directories
		if info.IsDir() && (info.Name() == "node_modules" || info.Name()[0] == '.') {
			return filepath.SkipDir
		}
		
		// Only process .ts and .tsx files
		if !info.IsDir() && (filepath.Ext(path) == ".ts" || filepath.Ext(path) == ".tsx") {
			return checkFile(checker, path)
		}
		
		return nil
	})
	
	return err
}

func checkFile(checker *checker.TypeChecker, filename string) error {
	fmt.Printf("Checking file: %s\n", filename)
	
	// Parse file
	ast, err := parser.ParseFile(filename)
	if err != nil {
		return fmt.Errorf("parse error in %s: %w", filename, err)
	}

	// Show AST if requested
	if showAST {
		astJSON, err := parser.ASTToJSON(ast)
		if err != nil {
			return fmt.Errorf("failed to serialize AST: %w", err)
		}
		fmt.Printf("AST for %s:\n%s\n", filename, astJSON)
	}

	// Type check
	errors := checker.CheckFile(filename, ast)
	
	// Report errors
	if len(errors) > 0 {
		fmt.Printf("Found %d errors in %s:\n", len(errors), filename)
		for _, err := range errors {
			reportError(err)
		}
		return fmt.Errorf("type checking failed")
	}
	
	fmt.Printf("✓ No errors found in %s\n", filename)
	return nil
}

func reportError(err error) {
	switch outputFormat {
	case "json":
		fmt.Printf("{\"error\": \"%s\"}\n", err.Error())
	case "toon":
		fmt.Printf("diags[1]{file,line,col,msg,code,severity}:\n  %s\n", err.Error())
	default:
		fmt.Printf("  - %s\n", err.Error())
	}
}