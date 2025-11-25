package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

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
	var errorCount int
	var fileCount int

	if info.IsDir() {
		err = filepath.Walk(absPath, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() && (strings.HasSuffix(path, ".ts") || strings.HasSuffix(path, ".tsx")) && !strings.Contains(path, "node_modules") {
				fileCount++
				// fmt.Printf("Parsing file %d: %s\n", fileCount, path)
				if err := parseFile(path); err != nil {
					errorCount++
					fmt.Printf("Parse error in %s: %v\n", path, err)
				}
			}
			return nil
		})
	} else {
		fileCount = 1
		if err := parseFile(absPath); err != nil {
			errorCount++
			fmt.Printf("Parse error in %s: %v\n", absPath, err)
		}
	}

	if err != nil {
		return err
	}

	duration := time.Since(start)
	fmt.Printf("\nParsed %d files in %v\n", fileCount, duration)
	if errorCount > 0 {
		fmt.Printf("Found %d parse errors.\n", errorCount)
		os.Exit(1)
	}

	fmt.Println("No parse errors found.")
	return nil
}

func parseFile(filePath string) error {
	_, err := parser.ParseFile(filePath)
	return err
}
