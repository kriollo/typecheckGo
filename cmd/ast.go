package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
	"tstypechecker/pkg/parser"
)

var (
	outputASTFormat string
)

var astCmd = &cobra.Command{
	Use:   "ast [file]",
	Short: "Show AST for TypeScript file",
	Long:  `Parse a TypeScript file and display its Abstract Syntax Tree in various formats.`,
	Args:  cobra.ExactArgs(1),
	RunE:  runAST,
}

func init() {
	astCmd.Flags().StringVarP(&outputASTFormat, "format", "f", "json", "Output format: json, toon")
}

func runAST(cmd *cobra.Command, args []string) error {
	filename := args[0]
	
	fmt.Printf("AST command called with file: %s\n", filename)
	
	// Parse file
	ast, err := parser.ParseFile(filename)
	if err != nil {
		return fmt.Errorf("parse error: %w", err)
	}
	
	if ast == nil {
		return fmt.Errorf("parser returned nil AST")
	}
	
	fmt.Printf("AST parsed successfully, found %d statements\n", len(ast.Body))
	
	// Output AST in requested format
	switch outputASTFormat {
	case "toon":
		toon, err := parser.ASTToTOON(ast)
		if err != nil {
			return fmt.Errorf("failed to convert to TOON: %w", err)
		}
		fmt.Println(toon)
	default:
		json, err := parser.ASTToJSON(ast)
		if err != nil {
			return fmt.Errorf("failed to convert to JSON: %w", err)
		}
		fmt.Println(json)
	}
	
	return nil
}