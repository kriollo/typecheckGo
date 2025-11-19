package cmd

import (
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "tscheck",
	Short: "TypeScript type checker written in Go",
	Long: `A fast TypeScript type checker written in Go that provides
basic type checking capabilities with incremental analysis and LSP support.`,
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	rootCmd.AddCommand(checkCmd)
	rootCmd.AddCommand(astCmd)
	rootCmd.AddCommand(parseCmd)
}
