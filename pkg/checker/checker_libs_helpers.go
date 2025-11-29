package checker

import (
	"os"
	"path/filepath"
	"strings"

	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

// loadPackageTypes loads all .d.ts files from a package directory
// Uses two-pass approach: first load interfaces/types, then variables
func (tc *TypeChecker) loadPackageTypes(pkgDir string) {
	var dtsFiles []string

	// Collect all .d.ts files
	_ = filepath.Walk(pkgDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors
		}
		if !info.IsDir() && strings.HasSuffix(path, ".d.ts") {
			dtsFiles = append(dtsFiles, path)
		}
		return nil
	})

	// Pass 1: Extract interfaces and types (they define callable signatures)
	for _, path := range dtsFiles {
		tc.extractInterfacesFromFile(path)
	}

	// Pass 2: Extract variables and functions (they may reference interfaces from pass 1)
	for _, path := range dtsFiles {
		tc.extractVariablesFromFile(path)
	}
}

// extractInterfacesFromFile extracts interface and type declarations from a .d.ts file (Pass 1)
func (tc *TypeChecker) extractInterfacesFromFile(filePath string) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return
	}
	tc.extractInterfacesUsingPatterns(string(content))
}

// extractVariablesFromFile extracts variable and function declarations from a .d.ts file (Pass 2)
func (tc *TypeChecker) extractVariablesFromFile(filePath string) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return
	}
	tc.extractVariablesUsingPatterns(string(content))
}

// extractInterfacesUsingPatterns extracts interface and type declarations (Pass 1)
func (tc *TypeChecker) extractInterfacesUsingPatterns(text string) {
	lines := strings.Split(text, "\n")

	// Track context
	inDeclareBlock := false
	blockDepth := 0

	// Interface parsing state
	var currentInterface *types.Type
	interfaceDepth := 0

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Skip comments
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "/*") || strings.HasPrefix(trimmed, "*") {
			continue
		}

		// Track declare module/namespace blocks
		if strings.HasPrefix(trimmed, "declare module") || strings.HasPrefix(trimmed, "declare namespace") {
			inDeclareBlock = true
			blockDepth = 0
		}

		// Start of interface declaration
		if (strings.HasPrefix(trimmed, "interface ") || strings.HasPrefix(trimmed, "export interface ")) && currentInterface == nil {
			parts := strings.Fields(trimmed)
			for j, part := range parts {
				if part == "interface" && j+1 < len(parts) {
					interfaceName := parts[j+1]
					// Clean interface name (remove generics <T>, extends, {)
					if idx := strings.IndexAny(interfaceName, "<{"); idx != -1 {
						interfaceName = interfaceName[:idx]
					}
					interfaceName = strings.TrimSpace(interfaceName)

					if isValidIdentifier(interfaceName) {
						currentInterface = types.NewObjectType(interfaceName, make(map[string]*types.Type))

						// Add to global types immediately so it can be referenced
						tc.globalEnv.Types[interfaceName] = currentInterface

						// Also register as a symbol
						symbol := tc.symbolTable.DefineSymbol(interfaceName, symbols.InterfaceSymbol, nil, false)
						symbol.FromDTS = true

						interfaceDepth = 0
					}
					break
				}
			}
		}

		// Count braces to track nesting
		openBraces := strings.Count(line, "{")
		closeBraces := strings.Count(line, "}")

		if inDeclareBlock {
			blockDepth += openBraces - closeBraces
			if blockDepth <= 0 {
				inDeclareBlock = false
			}
		}

		// Inside an interface
		if currentInterface != nil {
			interfaceDepth += openBraces - closeBraces

			// Parse members if we are directly inside the interface (depth 1)
			if interfaceDepth == 1 && !strings.HasPrefix(trimmed, "interface ") && !strings.HasPrefix(trimmed, "export interface ") {
				memberLine := trimmed
				if strings.HasPrefix(memberLine, "readonly ") {
					memberLine = strings.TrimPrefix(memberLine, "readonly ")
				}

				// Extract name
				var name string
				isMethod := false

				// Check for method: name(
				if idx := strings.Index(memberLine, "("); idx != -1 {
					colonIdx := strings.Index(memberLine, ":")
					if colonIdx == -1 || colonIdx > idx {
						name = memberLine[:idx]
						name = strings.TrimSuffix(name, "?")
						name = strings.TrimSpace(name)
						isMethod = true
					}
				}

				// Check for property: name: Type;
				if name == "" {
					if idx := strings.Index(memberLine, ":"); idx != -1 {
						name = memberLine[:idx]
						name = strings.TrimSuffix(name, "?")
						name = strings.TrimSpace(name)
					}
				}

				if name != "" && isValidIdentifier(name) {
					var memberType *types.Type
					if isMethod {
						memberType = types.NewFunctionType([]*types.Type{}, types.Any)
					} else {
						memberType = types.Any
					}
					currentInterface.Properties[name] = memberType
				}
			}

			// End of interface
			if interfaceDepth <= 0 {
				currentInterface = nil
			}
		}

		// Process type aliases outside of declare module blocks
		if !inDeclareBlock && currentInterface == nil {
			tc.extractTypeAliasFromLine(trimmed)
		}
	}
}
