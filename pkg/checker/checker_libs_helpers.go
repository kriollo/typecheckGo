package checker

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"tstypechecker/pkg/modules"
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

	// Use GlobalExtractionCache to avoid re-parsing identical content
	hash := modules.SharedGlobalCache.CalculateHash(content)

	cached := modules.SharedExtractionCache.Get(hash)
	if cached == nil {
		// Cache miss - parse and store
		interfaces := parseInterfacesFromText(string(content))

		// Convert to cached format
		cachedInterfaces := make([]modules.CachedInterface, len(interfaces))
		for i, iface := range interfaces {
			cachedInterfaces[i] = modules.CachedInterface{
				Name: iface.Name,
				Type: iface.Type,
				// Node field is not available in ExtractedInterface
			}
		}

		// Store in cache
		// Note: We only store interfaces here, globals will be added in pass 2 or separate entry
		// For simplicity, we use the same cache entry and update it
		cached = &modules.ExtendedCachedFile{
			CachedFile: modules.CachedFile{
				ContentHash: hash,
			},
			ExtractedInterfaces: cachedInterfaces,
		}
		modules.SharedExtractionCache.Put(hash, cached)
	}

	// Use cached interfaces
	for _, iface := range cached.ExtractedInterfaces {
		// Add to global types immediately so it can be referenced
		tc.globalEnv.Types[iface.Name] = iface.Type

		// Also register as a symbol
		symbol := tc.symbolTable.DefineSymbol(iface.Name, symbols.InterfaceSymbol, nil, false)
		symbol.FromDTS = true
	}

	// Process type aliases outside of declare module blocks
	// Note: parseInterfacesFromText doesn't handle type aliases yet, so we keep this call
	// Ideally we should move type alias parsing to parser_parallel.go too
	tc.extractTypeAliasFromLine(string(content))
}

// extractVariablesFromFile extracts variable and function declarations from a .d.ts file (Pass 2)
func (tc *TypeChecker) extractVariablesFromFile(filePath string) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return
	}

	// Use GlobalExtractionCache
	hash := modules.SharedGlobalCache.CalculateHash(content)

	cached := modules.SharedExtractionCache.Get(hash)

	// If not in cache or globals not extracted yet
	if cached == nil || cached.ExtractedGlobals == nil {
		globals := parseGlobalsFromText(string(content))

		cachedGlobals := make([]modules.CachedGlobal, len(globals))
		for i, global := range globals {
			cachedGlobals[i] = modules.CachedGlobal{
				Name:        global.Name,
				IsNamespace: global.IsNamespace,
				IsFunction:  global.IsFunction,
			}
		}

		if cached == nil {
			cached = &modules.ExtendedCachedFile{
				CachedFile: modules.CachedFile{
					ContentHash: hash,
				},
			}
		}

		cached.ExtractedGlobals = cachedGlobals
		modules.SharedExtractionCache.Put(hash, cached)
	}

	// Use cached globals
	for _, global := range cached.ExtractedGlobals {
		if global.IsNamespace {
			tc.globalEnv.Objects[global.Name] = types.Any
			symbol := tc.symbolTable.DefineSymbol(global.Name, symbols.VariableSymbol, nil, false)
			symbol.FromDTS = true
			if os.Getenv("DEBUG_LIB_LOADING") == "1" {
				fmt.Fprintf(os.Stderr, "Extracted namespace: %s\n", global.Name)
			}
		} else if global.IsFunction {
			tc.globalEnv.Objects[global.Name] = types.Any
			symbol := tc.symbolTable.DefineSymbol(global.Name, symbols.FunctionSymbol, nil, false)
			symbol.IsFunction = true
			symbol.FromDTS = true
		} else {
			// Variable
			tc.globalEnv.Objects[global.Name] = types.Any
			symbol := tc.symbolTable.DefineSymbol(global.Name, symbols.VariableSymbol, nil, false)
			symbol.FromDTS = true
		}
	}
}

// extractInterfacesUsingPatterns extracts interface and type declarations (Pass 1)
func (tc *TypeChecker) extractInterfacesUsingPatterns(text string) {
	// This function is kept for compatibility but now we prefer extractInterfacesFromFile with caching
	// If called directly with text, we can't easily cache by file hash, so we parse directly
	interfaces := parseInterfacesFromText(text)

	for _, iface := range interfaces {
		// Add to global types immediately so it can be referenced
		tc.globalEnv.Types[iface.Name] = iface.Type

		// Also register as a symbol
		symbol := tc.symbolTable.DefineSymbol(iface.Name, symbols.InterfaceSymbol, nil, false)
		symbol.FromDTS = true
	}

	tc.extractTypeAliasFromLine(text)
}

// extractVariablesUsingPatterns extracts variable and function declarations (Pass 2)
func (tc *TypeChecker) extractVariablesUsingPatterns(text string) {
	// This function is kept for compatibility
	globals := parseGlobalsFromText(text)

	for _, global := range globals {
		if global.IsNamespace {
			tc.globalEnv.Objects[global.Name] = types.Any
			symbol := tc.symbolTable.DefineSymbol(global.Name, symbols.VariableSymbol, nil, false)
			symbol.FromDTS = true
			if os.Getenv("DEBUG_LIB_LOADING") == "1" {
				fmt.Fprintf(os.Stderr, "Extracted namespace: %s\n", global.Name)
			}
		} else if global.IsFunction {
			tc.globalEnv.Objects[global.Name] = types.Any
			symbol := tc.symbolTable.DefineSymbol(global.Name, symbols.FunctionSymbol, nil, false)
			symbol.IsFunction = true
			symbol.FromDTS = true
		} else {
			// Variable
			tc.globalEnv.Objects[global.Name] = types.Any
			symbol := tc.symbolTable.DefineSymbol(global.Name, symbols.VariableSymbol, nil, false)
			symbol.FromDTS = true
		}
	}
}
