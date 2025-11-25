package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"strings"

	"tstypechecker/pkg/checker"
	"tstypechecker/pkg/config"
	"tstypechecker/pkg/parser"

	"github.com/spf13/cobra"
)

var (
	outputFormat string
	showAST      bool
	codeInput    string
	filename     string
)

var checkCmd = &cobra.Command{
	Use:   "check [path]",
	Short: "Check TypeScript files for type errors",
	Long:  `Analyze TypeScript files and report type errors, undefined variables, and function arity mismatches.`,
	Args:  cobra.MaximumNArgs(1),
	RunE:  runCheck,
}

func init() {
	checkCmd.Flags().StringVarP(&outputFormat, "format", "f", "text", "Output format: text, json, toon")
	checkCmd.Flags().BoolVarP(&showAST, "ast", "a", false, "Show AST output")
	checkCmd.Flags().StringVarP(&codeInput, "code", "c", "", "TypeScript code as text input (alternative to file path)")
	checkCmd.Flags().StringVarP(&filename, "filename", "n", "stdin.ts", "Filename to use when checking code from text input")
}

func runCheck(cmd *cobra.Command, args []string) error {
	// Check if code input is provided
	if codeInput != "" {
		return checkCodeInput(codeInput, filename)
	}

	// Otherwise, check file/directory path
	if len(args) == 0 {
		return fmt.Errorf("path argument is required when --code flag is not used")
	}

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

	// Find tsconfig.json by walking up the directory tree
	configDir := rootDir
	for {
		configPath := filepath.Join(configDir, "tsconfig.json")
		if _, err := os.Stat(configPath); err == nil {
			rootDir = configDir
			break
		}

		parent := filepath.Dir(configDir)
		if parent == configDir {
			// Reached root, no tsconfig.json found
			break
		}
		configDir = parent
	}

	// Load tsconfig.json if it exists
	tsConfig, err := config.LoadTSConfig(rootDir)
	if err != nil {
		// Silently use default configuration
		tsConfig = config.GetDefaultConfig()
	}

	// Measure initialization time (loading types, libs, etc.)
	initStart := time.Now()

	// Create type checker with module resolution
	typeChecker := checker.NewWithModuleResolver(rootDir)

	// Configure type checker
	configureChecker(typeChecker, tsConfig)

	initDuration := time.Since(initStart)

	// Show type loading stats (only in verbose mode via environment variable)
	if os.Getenv("TSCHECK_VERBOSE") == "1" {
		defer typeChecker.PrintLoadStats()
	}

	// Show detailed performance profile (only when TSCHECK_PROFILE=1)
	if os.Getenv("TSCHECK_PROFILE") == "1" {
		defer typeChecker.PrintProfileReport()
	}

	// Process files
	if info.IsDir() {
		return checkDirectory(typeChecker, absPath, tsConfig, initDuration)
	} else {
		return checkFile(typeChecker, absPath)
	}
}

func configureChecker(typeChecker *checker.TypeChecker, tsConfig *config.TSConfig) {
	// Configure type checker with libs from tsconfig
	libs := tsConfig.CompilerOptions.GetLib()
	typeChecker.SetLibs(libs)

	// Configure path aliases from tsconfig
	if tsConfig.CompilerOptions.BaseUrl != "" || len(tsConfig.CompilerOptions.Paths) > 0 {
		typeChecker.SetPathAliases(tsConfig.CompilerOptions.BaseUrl, tsConfig.CompilerOptions.Paths)
	}

	// Configure type roots from tsconfig
	if len(tsConfig.CompilerOptions.TypeRoots) > 0 {
		typeChecker.SetTypeRoots(tsConfig.CompilerOptions.TypeRoots)
	}

	// Configure type checker with tsconfig options
	checkerConfig := &checker.CompilerConfig{
		NoImplicitAny:                tsConfig.CompilerOptions.NoImplicitAny,
		StrictNullChecks:             tsConfig.CompilerOptions.StrictNullChecks,
		StrictFunctionTypes:          tsConfig.CompilerOptions.StrictFunctionTypes,
		NoUnusedLocals:               tsConfig.CompilerOptions.NoUnusedLocals,
		NoUnusedParameters:           tsConfig.CompilerOptions.NoUnusedParameters,
		NoImplicitReturns:            tsConfig.CompilerOptions.NoImplicitReturns,
		NoImplicitThis:               tsConfig.CompilerOptions.NoImplicitThis,
		StrictBindCallApply:          tsConfig.CompilerOptions.StrictBindCallApply,
		StrictPropertyInitialization: tsConfig.CompilerOptions.StrictPropertyInitialization,
		AlwaysStrict:                 tsConfig.CompilerOptions.AlwaysStrict,
		AllowUnreachableCode:         tsConfig.CompilerOptions.AllowUnreachableCode,
		AllowUnusedLabels:            tsConfig.CompilerOptions.AllowUnusedLabels,
		NoFallthroughCasesInSwitch:   tsConfig.CompilerOptions.NoFallthroughCasesInSwitch,
		NoUncheckedIndexedAccess:     tsConfig.CompilerOptions.NoUncheckedIndexedAccess,
	}
	typeChecker.SetConfig(checkerConfig)
}

func checkDirectory(templateTc *checker.TypeChecker, dir string, tsConfig *config.TSConfig, initDuration time.Duration) error {
	checkStart := time.Now()

	var files []string

	// Walk directory and find TypeScript files
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip node_modules and hidden directories
		if info.IsDir() && (info.Name() == "node_modules" || info.Name()[0] == '.') {
			return filepath.SkipDir
		}

		// Only process .ts and .tsx files (and .js if allowJs is enabled)
		ext := filepath.Ext(path)
		isTypeScriptFile := ext == ".ts" || ext == ".tsx"
		isJavaScriptFile := ext == ".js" || ext == ".jsx"

		if !info.IsDir() && (isTypeScriptFile || (isJavaScriptFile && tsConfig.CompilerOptions.AllowJs)) {
			files = append(files, path)
		}

		return nil
	})

	if err != nil {
		return err
	}

	filesChecked := len(files)
	if filesChecked == 0 {
		fmt.Printf("\n%s✓%s Checked 0 files. No TypeScript files found.\n", colorGreen, colorReset)
		return nil
	}

	// Prepare for parallel execution
	numWorkers := runtime.NumCPU()
	// Cap workers to avoid excessive memory usage if many cores
	if numWorkers > 8 {
		numWorkers = 8
	}
	// Don't use more workers than files
	if numWorkers > filesChecked {
		numWorkers = filesChecked
	}

	jobs := make(chan string, filesChecked)
	results := make(chan []checker.TypeError, filesChecked)
	var wg sync.WaitGroup

	// Get shared resolver from template
	sharedResolver := templateTc.GetModuleResolver()

	// Start workers
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			// Create a new checker for this worker, sharing the module resolver
			tc := checker.NewWithSharedModuleResolver(sharedResolver)

			// Copy global types from the template checker (node_modules, libs, etc.)
			// This avoids re-parsing thousands of files per worker
			tc.CopyGlobalTypesFrom(templateTc)

			// Configure path aliases (needed for module resolution)
			if tsConfig.CompilerOptions.BaseUrl != "" || len(tsConfig.CompilerOptions.Paths) > 0 {
				tc.SetPathAliases(tsConfig.CompilerOptions.BaseUrl, tsConfig.CompilerOptions.Paths)
			}

			// Set compiler config (no I/O, just configuration)
			tc.SetConfig(&checker.CompilerConfig{
				NoImplicitAny:                tsConfig.CompilerOptions.NoImplicitAny,
				StrictNullChecks:             tsConfig.CompilerOptions.StrictNullChecks,
				StrictFunctionTypes:          tsConfig.CompilerOptions.StrictFunctionTypes,
				NoUnusedLocals:               tsConfig.CompilerOptions.NoUnusedLocals,
				NoUnusedParameters:           tsConfig.CompilerOptions.NoUnusedParameters,
				NoImplicitReturns:            tsConfig.CompilerOptions.NoImplicitReturns,
				NoImplicitThis:               tsConfig.CompilerOptions.NoImplicitThis,
				StrictBindCallApply:          tsConfig.CompilerOptions.StrictBindCallApply,
				StrictPropertyInitialization: tsConfig.CompilerOptions.StrictPropertyInitialization,
				AlwaysStrict:                 tsConfig.CompilerOptions.AlwaysStrict,
				AllowUnreachableCode:         tsConfig.CompilerOptions.AllowUnreachableCode,
				AllowUnusedLabels:            tsConfig.CompilerOptions.AllowUnusedLabels,
				NoFallthroughCasesInSwitch:   tsConfig.CompilerOptions.NoFallthroughCasesInSwitch,
				NoUncheckedIndexedAccess:     tsConfig.CompilerOptions.NoUncheckedIndexedAccess,
			})

			for path := range jobs {
				// Parse file
				ast, parseErr := parser.ParseFile(path)
				if parseErr != nil {
					// Report parse error as a type error
					results <- []checker.TypeError{{
						File:     path,
						Line:     1,
						Column:   1,
						Message:  fmt.Sprintf("Parse error: %v", parseErr),
						Code:     "TS1005",
						Severity: "error",
					}}
					continue
				}

				// Type check
				errors := tc.CheckFile(path, ast)
				results <- errors

				// Clear caches after each file
				tc.ClearFileCache()
			}
		}()
	}

	// Send jobs
	for _, file := range files {
		jobs <- file
	}
	close(jobs)

	// Wait for workers in a separate goroutine
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	var allErrors []checker.TypeError
	filesWithErrors := 0

	for errs := range results {
		if len(errs) > 0 {
			filesWithErrors++
			allErrors = append(allErrors, errs...)
		}
	}

	checkDuration := time.Since(checkStart)
	totalDuration := initDuration + checkDuration

	// Report summary with timing breakdown
	if len(allErrors) > 0 {
		switch outputFormat {
		case "json":
			reportErrorsJSON(allErrors)
		case "toon":
			reportErrorsTOON(allErrors)
		default:
			reportErrorsWithContext("", allErrors)
			// Show timing info
			fmt.Printf("\n%s[Timing] Initialization: %dms | Type checking: %dms | Total: %dms%s\n",
				colorGray, initDuration.Milliseconds(), checkDuration.Milliseconds(), totalDuration.Milliseconds(), colorReset)
		}
		return fmt.Errorf("type checking failed")
	}

	fmt.Printf("\n%s[Timing] Initialization: %dms | Type checking: %dms | Total: %dms%s\n",
		colorGray, initDuration.Milliseconds(), checkDuration.Milliseconds(), totalDuration.Milliseconds(), colorReset)
	fmt.Printf("%s✓%s Checked %d files. No errors found.\n", colorGreen, colorReset, filesChecked)
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

	// Report errors
	if len(errors) > 0 {
		switch outputFormat {
		case "json":
			reportErrorsJSON(errors)
		case "toon":
			reportErrorsTOON(errors)
		default:
			reportErrorsWithContext(filename, errors)
			fmt.Printf("\n%sFinished in %dms.%s\n", colorGray, elapsedMs, colorReset)
		}
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

func checkCodeInput(code string, name string) error {
	startTime := time.Now()

	// Get current working directory for root resolution
	rootDir, err := os.Getwd()
	if err != nil {
		rootDir = "."
	}

	// Load tsconfig.json if it exists
	tsConfig, err := config.LoadTSConfig(rootDir)
	if err != nil {
		// Silently use default configuration
		tsConfig = config.GetDefaultConfig()
	}

	// Create type checker with module resolution
	typeChecker := checker.NewWithModuleResolver(rootDir)

	// Configure type checker with libs from tsconfig
	libs := tsConfig.CompilerOptions.GetLib()
	typeChecker.SetLibs(libs)

	// Configure path aliases from tsconfig
	if tsConfig.CompilerOptions.BaseUrl != "" || len(tsConfig.CompilerOptions.Paths) > 0 {
		typeChecker.SetPathAliases(tsConfig.CompilerOptions.BaseUrl, tsConfig.CompilerOptions.Paths)
	}

	// Configure type roots from tsconfig
	if len(tsConfig.CompilerOptions.TypeRoots) > 0 {
		typeChecker.SetTypeRoots(tsConfig.CompilerOptions.TypeRoots)
	}

	// Configure type checker with tsconfig options
	checkerConfig := &checker.CompilerConfig{
		NoImplicitAny:                tsConfig.CompilerOptions.NoImplicitAny,
		StrictNullChecks:             tsConfig.CompilerOptions.StrictNullChecks,
		StrictFunctionTypes:          tsConfig.CompilerOptions.StrictFunctionTypes,
		NoUnusedLocals:               tsConfig.CompilerOptions.NoUnusedLocals,
		NoUnusedParameters:           tsConfig.CompilerOptions.NoUnusedParameters,
		NoImplicitReturns:            tsConfig.CompilerOptions.NoImplicitReturns,
		NoImplicitThis:               tsConfig.CompilerOptions.NoImplicitThis,
		StrictBindCallApply:          tsConfig.CompilerOptions.StrictBindCallApply,
		StrictPropertyInitialization: tsConfig.CompilerOptions.StrictPropertyInitialization,
		AlwaysStrict:                 tsConfig.CompilerOptions.AlwaysStrict,
		AllowUnreachableCode:         tsConfig.CompilerOptions.AllowUnreachableCode,
		AllowUnusedLabels:            tsConfig.CompilerOptions.AllowUnusedLabels,
		NoFallthroughCasesInSwitch:   tsConfig.CompilerOptions.NoFallthroughCasesInSwitch,
		NoUncheckedIndexedAccess:     tsConfig.CompilerOptions.NoUncheckedIndexedAccess,
	}
	typeChecker.SetConfig(checkerConfig)

	// Show type loading stats (only in verbose mode via environment variable)
	if os.Getenv("TSCHECK_VERBOSE") == "1" {
		defer typeChecker.PrintLoadStats()
	}

	// Parse code from string
	ast, err := parser.ParseCode(code, name)
	if err != nil {
		return fmt.Errorf("parse error in %s: %w", name, err)
	}

	// Show AST if requested
	if showAST {
		astJSON, err := parser.ASTToJSON(ast)
		if err != nil {
			return fmt.Errorf("failed to serialize AST: %w", err)
		}
		fmt.Printf("AST for %s:\n%s\n", name, astJSON)
	}

	// Type check
	errors := typeChecker.CheckFile(name, ast)

	elapsed := time.Since(startTime)
	elapsedMs := elapsed.Milliseconds()

	// Report errors
	if len(errors) > 0 {
		switch outputFormat {
		case "json":
			reportErrorsJSON(errors)
		case "toon":
			reportErrorsTOON(errors)
		default:
			reportErrorsWithContextFromCode(name, code, errors)
			fmt.Printf("\n%sFinished in %dms.%s\n", colorGray, elapsedMs, colorReset)
		}
		return fmt.Errorf("type checking failed")
	}

	// Success message
	fmt.Printf("%s✓%s %s %s(%dms)%s\n", colorGreen, colorReset, name, colorGray, elapsedMs, colorReset)
	return nil
}

func reportErrorsWithContextFromCode(filename string, code string, errors []checker.TypeError) {
	if len(errors) == 0 {
		return
	}

	lines := splitLines(code)

	fmt.Printf("\n")

	for i, e := range errors {
		// Show error header with color
		fmt.Printf("  %s×%s %s%s%s\n", colorRed, colorReset, colorBold, e.Message, colorReset)

		// Show file location with color
		fmt.Printf("   %s╭─[%s%s:%d:%d%s]\n", colorGray, colorCyan, filename, e.Line, e.Column, colorGray)

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

func reportErrorsJSON(errors []checker.TypeError) {
	fmt.Println("[")
	for i, e := range errors {
		if i > 0 {
			fmt.Println(",")
		}
		fmt.Printf("  {\n")
		fmt.Printf("    \"file\": %q,\n", e.File)
		fmt.Printf("    \"line\": %d,\n", e.Line)
		fmt.Printf("    \"column\": %d,\n", e.Column)
		fmt.Printf("    \"message\": %q,\n", e.Message)
		fmt.Printf("    \"code\": %q,\n", e.Code)
		fmt.Printf("    \"severity\": %q\n", e.Severity)
		fmt.Printf("  }")
	}
	fmt.Println("\n]")
}

func reportErrorsTOON(errors []checker.TypeError) {
	fmt.Printf("errors[%d]{file,line,column,message,code,severity}:\n", len(errors))
	for _, e := range errors {
		// Escape message for TOON format (replace newlines and quotes)
		msg := strings.ReplaceAll(e.Message, "\n", "\\n")
		msg = strings.ReplaceAll(msg, "\"", "\\\"")
		fmt.Printf("  %s,%d,%d,\"%s\",%s,%s\n", e.File, e.Line, e.Column, msg, e.Code, e.Severity)
	}
}

func reportErrorsWithContext(filename string, errors []checker.TypeError) {
	if len(errors) == 0 {
		return
	}

	// Group errors by file
	errorsByFile := make(map[string][]checker.TypeError)
	for _, e := range errors {
		errorsByFile[e.File] = append(errorsByFile[e.File], e)
	}

	// Get current working directory once
	cwd, _ := os.Getwd()

	// Process each file separately
	for file, fileErrors := range errorsByFile {
		// Read file content for context
		content, err := os.ReadFile(file)
		if err != nil {
			// Fallback to simple error reporting
			fmt.Printf("\n%s⚠%s Found %d errors in %s:\n", colorYellow, colorReset, len(fileErrors), file)
			for _, e := range fileErrors {
				fmt.Printf("  %s:%d:%d - %s (%s)\n", e.File, e.Line, e.Column, e.Message, e.Code)
			}
			continue
		}

		lines := splitLines(string(content))

		for _, e := range fileErrors {
			// Get relative path for display
			displayPath := file
			if cwd != "" {
				if relPath, err := filepath.Rel(cwd, e.File); err == nil && !filepath.IsAbs(relPath) && len(relPath) < len(e.File) {
					displayPath = relPath
				}
			}

			// Determine error icon and color based on severity
			icon := "×"
			iconColor := colorRed
			if e.Severity == "warning" {
				icon = "⚠"
				iconColor = colorYellow
			}

			// Show error header with icon and code
			fmt.Printf("\n  %s%s%s %stypescript(%s)%s: %s\n",
				iconColor, icon, colorReset,
				colorGray, e.Code, colorReset,
				e.Message)

			// Show file location
			fmt.Printf("     %s╭─[%s%s:%d:%d%s]\n",
				colorGray, colorCyan, displayPath, e.Line, e.Column, colorGray)

			// Show code context (3 lines: previous, error, next)
			startLine := max(1, e.Line-1)
			endLine := min(len(lines), e.Line+1)

			for lineNum := startLine; lineNum <= endLine; lineNum++ {
				if lineNum-1 < len(lines) {
					lineContent := lines[lineNum-1]

					if lineNum == e.Line {
						// Error line - show with line number
						fmt.Printf(" %s%4d%s %s│%s %s\n",
							colorGray, lineNum, colorReset,
							colorGray, colorReset,
							lineContent)

						// Add error marker with underline
						spaces := e.Column - 1
						if spaces < 0 {
							spaces = 0
						}

						// Calculate underline length (try to underline the whole token)
						underlineLen := 1
						if spaces < len(lineContent) {
							// Find end of token (simple heuristic)
							for i := spaces; i < len(lineContent); i++ {
								ch := lineContent[i]
								if ch == ' ' || ch == '\t' || ch == ',' || ch == ';' || ch == ')' || ch == '}' {
									break
								}
								underlineLen++
							}
						}

						// Show the underline with arrow
						padding := 6 // "  123 │ " = 6 characters
						fmt.Printf("%s%s·%s%s%s\n",
							repeatString(" ", padding+spaces),
							colorGray,
							repeatString("─", max(1, underlineLen-1)),
							"┬",
							colorReset)
						fmt.Printf("%s%s╰─%s %s[%s]%s\n",
							repeatString(" ", padding+spaces),
							colorGray,
							"─",
							colorGray,
							e.Code,
							colorReset)
					} else {
						// Context line
						fmt.Printf(" %s%4d%s %s│%s %s\n",
							colorGray, lineNum, colorReset,
							colorGray, colorReset,
							lineContent)
					}
				}
			}

			fmt.Printf("     %s╰────%s\n", colorGray, colorReset)
		}
	}

	// Count total errors and warnings
	totalErrors := 0
	totalWarnings := 0
	filesWithErrors := len(errorsByFile)

	for _, fileErrors := range errorsByFile {
		for _, e := range fileErrors {
			if e.Severity == "warning" {
				totalWarnings++
			} else {
				totalErrors++
			}
		}
	}

	// Show summary
	fmt.Printf("\n")
	if totalWarnings > 0 && totalErrors > 0 {
		fmt.Printf("%sFound %d warnings and %d errors in %d file(s).%s\n",
			colorYellow, totalWarnings, totalErrors, filesWithErrors, colorReset)
	} else if totalWarnings > 0 {
		fmt.Printf("%sFound %d warnings in %d file(s).%s\n",
			colorYellow, totalWarnings, filesWithErrors, colorReset)
	} else {
		fmt.Printf("%sFound %d errors in %d file(s).%s\n",
			colorRed, totalErrors, filesWithErrors, colorReset)
	}
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
