package checker

import (
	"strings"
	"tstypechecker/pkg/types"
)

// ExtractedInterface represents an interface extracted from a .d.ts file
type ExtractedInterface struct {
	Name string
	Type *types.Type
}

// ExtractedGlobal represents a global variable/function/namespace extracted from a .d.ts file
type ExtractedGlobal struct {
	Name        string
	Type        *types.Type
	IsFunction  bool
	IsNamespace bool
}

// parseInterfacesFromText extracts interface and type declarations from text
// Returns a list of extracted interfaces to be added to the global environment
func parseInterfacesFromText(text string) []ExtractedInterface {
	var results []ExtractedInterface
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
	}

	return results
}

// parseGlobalsFromText extracts global variables and functions from text
func parseGlobalsFromText(text string) []ExtractedGlobal {
	var results []ExtractedGlobal
	lines := strings.Split(text, "\n")

	// Track context
	inDeclareBlock := false
	blockDepth := 0

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Extract global namespaces FIRST (before inDeclareBlock check)
		// Pattern: declare namespace NAME { ... }
		if strings.HasPrefix(trimmed, "declare namespace ") {
			parts := strings.Fields(trimmed)
			if len(parts) >= 3 {
				name := parts[2]
				// Remove { if present
				name = strings.TrimSuffix(name, "{")
				name = strings.TrimSpace(name)

				if name != "" && isValidIdentifier(name) {
					results = append(results, ExtractedGlobal{
						Name:        name,
						Type:        types.Any,
						IsNamespace: true,
					})
				}
			}
		}

		// Track declare module/namespace blocks
		if strings.HasPrefix(trimmed, "declare module") || strings.HasPrefix(trimmed, "declare namespace") {
			inDeclareBlock = true
			blockDepth = 0
		}

		// Count braces
		blockDepth += strings.Count(line, "{") - strings.Count(line, "}")

		if inDeclareBlock && blockDepth <= 0 {
			inDeclareBlock = false
		}

		// Only extract global declarations (not inside declare module blocks)
		if !inDeclareBlock {
			// Pattern: declare const/var/let NAME: TYPE;
			if strings.HasPrefix(trimmed, "declare const ") ||
				strings.HasPrefix(trimmed, "declare var ") ||
				strings.HasPrefix(trimmed, "declare let ") {

				parts := strings.Fields(trimmed)
				if len(parts) >= 3 {
					name := parts[2]
					// Remove : and everything after it
					if idx := strings.Index(name, ":"); idx != -1 {
						name = name[:idx]
					}
					name = strings.TrimSuffix(name, ";")

					if name != "" && isValidIdentifier(name) {
						results = append(results, ExtractedGlobal{
							Name: name,
							Type: types.Any,
						})
					}
				}
			}

			// Pattern: declare function NAME(...): TYPE;
			if strings.HasPrefix(trimmed, "declare function ") {
				parts := strings.Fields(trimmed)
				if len(parts) >= 3 {
					name := parts[2]
					if idx := strings.Index(name, "("); idx != -1 {
						name = name[:idx]
					}

					if name != "" && isValidIdentifier(name) {
						results = append(results, ExtractedGlobal{
							Name:       name,
							Type:       types.Any,
							IsFunction: true,
						})
					}
				}
			}
		}
	}

	return results
}
