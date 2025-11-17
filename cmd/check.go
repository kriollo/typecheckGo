package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

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

	// Determine root directory for module resolution
	var rootDir string
	if info.IsDir() {
		rootDir = absPath
	} else {
		rootDir = filepath.Dir(absPath)
	}

	// Create type checker with module resolution
	typeChecker := checker.NewWithModuleResolver(rootDir)

	// Process files
	if info.IsDir() {
		return checkDirectory(typeChecker, absPath)
	} else {
		return checkFile(typeChecker, absPath)
	}
}

func checkDirectory(tc *checker.TypeChecker, dir string) error {
	startTime := time.Now()

	var allErrors []checker.TypeError
	var filesChecked int
	var filesWithErrors int

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
			filesChecked++

			// Parse file
			ast, parseErr := parser.ParseFile(path)
			if parseErr != nil {
				fmt.Printf("Parse error in %s: %v\n", path, parseErr)
				return nil
			}

			// Type check
			errors := tc.CheckFile(path, ast)
			if len(errors) > 0 {
				filesWithErrors++
				allErrors = append(allErrors, errors...)
			}
		}

		return nil
	})

	if err != nil {
		return err
	}

	elapsed := time.Since(startTime)
	elapsedMs := elapsed.Milliseconds()

	// Report summary
	if len(allErrors) > 0 {
		reportErrorsWithContext("", allErrors)
		fmt.Printf("\n%sChecked %d files in %dms. Found errors in %d file(s).%s\n", colorYellow, filesChecked, elapsedMs, filesWithErrors, colorReset)
		return fmt.Errorf("type checking failed")
	}

	fmt.Printf("\n%s✓%s Checked %d files in %dms. No errors found.\n", colorGreen, colorReset, filesChecked, elapsedMs)
	return nil
}

func checkFile(tc *checker.TypeChecker, filename string) error {
	startTime := time.Now()

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
	errors := tc.CheckFile(filename, ast)

	elapsed := time.Since(startTime)
	elapsedMs := elapsed.Milliseconds()

	// Report errors with context
	if len(errors) > 0 {
		reportErrorsWithContext(filename, errors)
		fmt.Printf("\n%sFinished in %dms.%s\n", colorGray, elapsedMs, colorReset)
		return fmt.Errorf("type checking failed")
	}

	// Success message
	relPath, err := filepath.Rel(".", filename)
	if err != nil || relPath == "" {
		relPath = filepath.Base(filename)
	}
	fmt.Printf("%s✓%s %s %s(%dms)%s\n", colorGreen, colorReset, relPath, colorGray, elapsedMs, colorReset)
	return nil
}

// ANSI color codes
const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorCyan   = "\033[36m"
	colorGray   = "\033[90m"
	colorBold   = "\033[1m"
)

func reportErrorsWithContext(filename string, errors []checker.TypeError) {
	if len(errors) == 0 {
		return
	}

	// Use first error's file if filename is empty
	if filename == "" && len(errors) > 0 {
		filename = errors[0].File
	}
	// Read file content for context
	content, err := os.ReadFile(filename)
	if err != nil {
		// Fallback to simple error reporting
		fmt.Printf("\nFound %d errors in %s:\n", len(errors), filename)
		for _, e := range errors {
			fmt.Printf("  %s:%d:%d - %s (%s)\n", e.File, e.Line, e.Column, e.Message, e.Code)
		}
		return
	}

	lines := splitLines(string(content))

	fmt.Printf("\n")
	for i, e := range errors {
		// Show error header with color
		fmt.Printf("  %s×%s %s%s%s\n", colorRed, colorReset, colorBold, e.Message, colorReset)

		// Show file location with color
		// Get current working directory
		cwd, err := os.Getwd()
		var displayPath string
		if err == nil {
			// Try to get relative path from cwd
			relPath, err := filepath.Rel(cwd, e.File)
			if err == nil && !filepath.IsAbs(relPath) && len(relPath) < len(e.File) {
				displayPath = relPath
			} else {
				displayPath = e.File
			}
		} else {
			displayPath = e.File
		}
		fmt.Printf("   %s╭─[%s%s:%d:%d%s]\n", colorGray, colorCyan, displayPath, e.Line, e.Column, colorGray)

		// Show code context (only 3 lines: previous, error, next)
		startLine := max(1, e.Line-1)
		endLine := min(len(lines), e.Line+1)

		for lineNum := startLine; lineNum <= endLine; lineNum++ {
			if lineNum-1 < len(lines) {
				lineContent := lines[lineNum-1]

				if lineNum == e.Line {
					// Error line
					fmt.Printf(" %s%3d%s %s│%s %s\n", colorGray, lineNum, colorReset, colorGray, colorReset, lineContent)

					// Add error marker on the next line with arrow pointing up
					spaces := e.Column - 1
					if spaces < 0 {
						spaces = 0
					}
					// Calculate padding to align with the code (after line number and │)
					padding := 5 // "   3 │ " = 5 characters for line number display
					fmt.Printf("%s%s%s^%s %s[%s]%s\n",
						repeatString(" ", padding+spaces),
						colorRed,
						"",
						colorReset,
						colorGray,
						e.Code,
						colorReset)
				} else {
					// Context line
					fmt.Printf(" %s%3d%s %s│%s %s\n", colorGray, lineNum, colorReset, colorGray, colorReset, lineContent)
				}
			}
		}

		fmt.Printf("   %s╰────%s\n", colorGray, colorReset)

		if i < len(errors)-1 {
			fmt.Printf("\n")
		}
	}

	fmt.Printf("\n%sFound %d error(s).%s\n", colorRed, len(errors), colorReset)
}

func splitLines(content string) []string {
	lines := []string{}
	current := ""

	for _, ch := range content {
		if ch == '\n' {
			lines = append(lines, current)
			current = ""
		} else if ch != '\r' {
			current += string(ch)
		}
	}

	if current != "" {
		lines = append(lines, current)
	}

	return lines
}

func repeatString(s string, count int) string {
	result := ""
	for i := 0; i < count; i++ {
		result += s
	}
	return result
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
