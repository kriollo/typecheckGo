package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"tstypechecker/pkg/checker"
	"tstypechecker/pkg/parser"

	"github.com/spf13/cobra"
)

var parseCmd = &cobra.Command{
	Use:   "parse [path]",
	Short: "Parse TypeScript files and report syntax errors",
	Long:  `Parse TypeScript files and report syntax errors without performing type checking.`,
	Args:  cobra.MaximumNArgs(1),
	RunE:  runParse,
}

func init() {
	// Reuse flags from checkCmd if needed, or define new ones
	parseCmd.Flags().StringVarP(&outputFormat, "format", "f", "text", "Output format: text, json, toon")
}

func runParse(cmd *cobra.Command, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("path argument is required")
	}

	path := args[0]
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("invalid path: %w", err)
	}

	info, err := os.Stat(absPath)
	if err != nil {
		return fmt.Errorf("cannot access path: %w", err)
	}

	start := time.Now()
	var fileCount int
	var allErrors []checker.TypeError

	if info.IsDir() {
		err = filepath.Walk(absPath, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() && (strings.HasSuffix(path, ".ts") || strings.HasSuffix(path, ".tsx")) && !strings.Contains(path, "node_modules") {
				fileCount++
				_, parseErr := parser.ParseFile(path)
				if parseErr != nil {
					allErrors = append(allErrors, parseErrorToTypeError(path, parseErr))
				}
			}
			return nil
		})
	} else {
		fileCount = 1
		_, parseErr := parser.ParseFile(absPath)
		if parseErr != nil {
			allErrors = append(allErrors, parseErrorToTypeError(absPath, parseErr))
		}
	}

	if err != nil {
		return err
	}

	duration := time.Since(start)

	if len(allErrors) > 0 {
		switch outputFormat {
		case "json":
			reportErrorsJSON(allErrors)
		case "toon":
			reportErrorsTOON(allErrors)
		default:
			reportErrorsWithContext("", allErrors)
			fmt.Printf("\nParsed %d files in %v\n", fileCount, duration)
		}
		return fmt.Errorf("found %d parse errors", len(allErrors))
	}

	fmt.Printf("\nParsed %d files in %v\n", fileCount, duration)
	fmt.Println("No parse errors found.")
	return nil
}
