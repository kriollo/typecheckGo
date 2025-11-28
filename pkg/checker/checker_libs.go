package checker

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/parser"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

// loadTypeScriptLibs loads TypeScript library definition files based on configured libs
func (tc *TypeChecker) loadTypeScriptLibs(libs []string) {
	// Get root directory
	var rootDir string
	if tc.moduleResolver != nil {
		rootDir = tc.moduleResolver.GetRootDir()
	}
	if rootDir == "" {
		rootDir = "."
	}

	// Try to find TypeScript installation
	typescriptLibPath := filepath.Join(rootDir, "node_modules", "typescript", "lib")

	// Check if TypeScript lib directory exists
	if _, err := os.Stat(typescriptLibPath); os.IsNotExist(err) {
		// Try alternative path (@typescript/native-preview)
		typescriptLibPath = filepath.Join(rootDir, "node_modules", "@typescript", "native-preview-win32-x64", "lib")
		if _, err := os.Stat(typescriptLibPath); os.IsNotExist(err) {
			return
		}
	}

	// Store the path for lazy loading
	tc.typescriptLibPath = typescriptLibPath

	// Map of lib names to file names
	libFileMap := map[string]string{
		"es5":          "lib.es5.d.ts",
		"es6":          "lib.es2015.d.ts",
		"es2015":       "lib.es2015.d.ts",
		"es2016":       "lib.es2016.d.ts",
		"es2017":       "lib.es2017.d.ts",
		"es2018":       "lib.es2018.d.ts",
		"es2019":       "lib.es2019.d.ts",
		"es2020":       "lib.es2020.d.ts",
		"es2020.intl":  "lib.es2020.intl.d.ts",
		"es2021":       "lib.es2021.d.ts",
		"es2022":       "lib.es2022.d.ts",
		"es2023":       "lib.es2023.d.ts",
		"esnext":       "lib.esnext.d.ts",
		"dom":          "lib.dom.d.ts",
		"dom.iterable": "lib.dom.iterable.d.ts",
		"webworker":    "lib.webworker.d.ts",
		"scripthost":   "lib.scripthost.d.ts",
	}

	// Load the requested lib files
	for _, lib := range libs {
		libLower := strings.ToLower(lib)
		if fileName, ok := libFileMap[libLower]; ok {
			libFilePath := filepath.Join(typescriptLibPath, fileName)
			if _, err := os.Stat(libFilePath); err == nil {
				if os.Getenv("DEBUG_LIB_LOADING") == "1" {
					fmt.Fprintf(os.Stderr, "Loading lib file: %s from %s\n", lib, libFilePath)
				}
				tc.loadLibFile(libFilePath)
			}
		}
	}
}

// loadLibFile loads a single TypeScript lib file and extracts type definitions
func (tc *TypeChecker) loadLibFile(filePath string) {
	// First, check for /// <reference lib="..." /> directives and load them recursively
	tc.loadLibReferences(filePath)

	// Pass 1: Extract interfaces and types
	tc.extractInterfacesFromFile(filePath)

	// Pass 2: Extract variables and functions
	tc.extractVariablesFromFile(filePath)
}

// loadLibReferences parses a lib file for /// <reference lib="..." /> directives and loads them
func (tc *TypeChecker) loadLibReferences(filePath string) {
	file, err := os.Open(filePath)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	libDir := filepath.Dir(filePath)

	// Track loaded files to avoid infinite recursion
	if tc.loadedLibFiles == nil {
		tc.loadedLibFiles = make(map[string]bool)
	}

	// Mark this file as loaded
	tc.loadedLibFiles[filePath] = true

	lineCount := 0
	maxLines := 50

	for scanner.Scan() && lineCount < maxLines {
		lineCount++
		rawLine := scanner.Text()
		line := strings.TrimSpace(rawLine)

		// Look for /// <reference lib="libname" />
		if strings.HasPrefix(line, "///") && strings.Contains(line, "<reference") && strings.Contains(line, "lib=") {
			// Extract lib name from: /// <reference lib="es2019" />
			start := strings.Index(line, "lib=\"")
			if start == -1 {
				start = strings.Index(line, "lib='")
			}
			if start != -1 {
				start += 5 // skip 'lib="' or "lib='"
				end := strings.IndexAny(line[start:], "\"'")
				if end != -1 {
					libName := line[start : start+end]
					// Convert lib name to file name: "es2019" -> "lib.es2019.d.ts"
					libFileName := fmt.Sprintf("lib.%s.d.ts", libName)
					referencedPath := filepath.Join(libDir, libFileName)

					// Load referenced file if not already loaded
					if !tc.loadedLibFiles[referencedPath] {
						if _, err := os.Stat(referencedPath); err == nil {
							tc.loadLibFile(referencedPath)
						}
					}
				}
			}
		}
	}
}

// SetPathAliases configures path aliases from tsconfig for module resolution
func (tc *TypeChecker) SetPathAliases(baseUrl string, paths map[string][]string) {
	if tc.moduleResolver != nil {
		tc.moduleResolver.SetPathAliases(baseUrl, paths)
	}
}

// SetTypeRoots configures type roots from tsconfig for declaration file resolution
func (tc *TypeChecker) SetTypeRoots(typeRoots []string) {
	if tc.moduleResolver != nil {
		tc.moduleResolver.SetTypeRoots(typeRoots)
	}
	// Load global types from the configured typeRoots
	startTime := time.Now()
	tc.loadGlobalTypesFromRoots(typeRoots)
	tc.loadStats.TypeRootsTime = time.Since(startTime)
}

// loadNodeModulesTypes loads type definitions from node_modules with caching
// Loads from both @types packages and packages with bundled types
func (tc *TypeChecker) loadNodeModulesTypes(rootDir string) {
	startTime := time.Now()
	defer func() {
		tc.loadStats.NodeModulesTime = time.Since(startTime)
	}()

	nodeModulesDir := filepath.Join(rootDir, "node_modules")
	if _, err := os.Stat(nodeModulesDir); os.IsNotExist(err) {
		return
	}

	// Priority 1: Load from @types packages
	tc.loadTypesPackages(nodeModulesDir)

	// Priority 2: Load from packages with bundled types (like vue, react, etc.)
	tc.loadBundledTypes(nodeModulesDir)
}

// loadTypesPackages loads types from @types directory
func (tc *TypeChecker) loadTypesPackages(nodeModulesDir string) {
	typesDir := filepath.Join(nodeModulesDir, "@types")
	if _, err := os.Stat(typesDir); os.IsNotExist(err) {
		return
	}

	entries, err := os.ReadDir(typesDir)
	if err != nil {
		return
	}

	for _, entry := range entries {
		if entry.IsDir() {
			pkgDir := filepath.Join(typesDir, entry.Name())
			tc.loadPackageWithCache(pkgDir, "@types/"+entry.Name())
		}
	}
}

// loadBundledTypes scans node_modules for packages with bundled types
func (tc *TypeChecker) loadBundledTypes(nodeModulesDir string) {
	entries, err := os.ReadDir(nodeModulesDir)
	if err != nil {
		return
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		pkgDir := filepath.Join(nodeModulesDir, entry.Name())

		// Handle scoped packages (e.g., @vue, @angular, @types)
		if strings.HasPrefix(entry.Name(), "@") {
			// Skip @types as it's handled separadamente
			if entry.Name() == "@types" {
				continue
			}

			// Load scoped packages
			tc.loadScopedPackages(pkgDir, entry.Name())
			continue
		}

		// Handle regular packages
		packageJSONPath := filepath.Join(pkgDir, "package.json")
		if typesFile := tc.getPackageTypesFile(packageJSONPath); typesFile != "" {
			typesPath := filepath.Join(pkgDir, typesFile)
			if _, err := os.Stat(typesPath); err == nil {
				tc.loadPackageWithCache(pkgDir, entry.Name())
			}
		}
	}
}

// loadScopedPackages loads packages from a scoped directory like @vue, @angular
func (tc *TypeChecker) loadScopedPackages(scopeDir, scopeName string) {
	entries, err := os.ReadDir(scopeDir)
	if err != nil {
		return
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		pkgDir := filepath.Join(scopeDir, entry.Name())
		packageJSONPath := filepath.Join(pkgDir, "package.json")

		// Read package.json to find types entry point
		if typesFile := tc.getPackageTypesFile(packageJSONPath); typesFile != "" {
			typesPath := filepath.Join(pkgDir, typesFile)
			if _, err := os.Stat(typesPath); err == nil {
				pkgFullName := scopeName + "/" + entry.Name()
				if os.Getenv("TSCHECK_DEBUG") == "1" {
					fmt.Fprintf(os.Stderr, "Loading scoped package: %s (%s)\n", pkgFullName, typesPath)
				}
				tc.loadPackageWithCache(pkgDir, pkgFullName)
			}
		}
	}
}

// getPackageTypesFile reads package.json and returns the types file path
func (tc *TypeChecker) getPackageTypesFile(packageJSONPath string) string {
	data, err := os.ReadFile(packageJSONPath)
	if err != nil {
		return ""
	}

	// Simple JSON parsing to extract "types", "typings", or "exports" fields
	var pkg struct {
		Types   string `json:"types"`
		Typings string `json:"typings"`
	}

	if err := json.Unmarshal(data, &pkg); err != nil {
		return ""
	}

	if pkg.Types != "" {
		return pkg.Types
	}
	if pkg.Typings != "" {
		return pkg.Typings
	}

	// Fallback: check for common type definition files
	return ""
}

// loadPackageWithCache loads a package's types with caching support
func (tc *TypeChecker) loadPackageWithCache(pkgDir, pkgName string) {
	// Try to load from cache first
	if cached, err := tc.pkgTypeCache.Load(pkgDir); err == nil {
		// Load cached types into global environment
		for name, typ := range cached.Types {
			tc.globalEnv.Types[name] = typ
		}
		for name, iface := range cached.Interfaces {
			tc.globalEnv.Objects[name] = iface
		}
		tc.loadStats.CachedPackages++
	} else {
		// Load from source and cache
		beforeTypes := len(tc.globalEnv.Types)
		beforeInterfaces := len(tc.globalEnv.Objects)

		tc.loadPackageTypes(pkgDir)

		afterTypes := len(tc.globalEnv.Types)
		afterInterfaces := len(tc.globalEnv.Objects)

		// Only cache if we loaded something
		if afterTypes > beforeTypes || afterInterfaces > beforeInterfaces {
			// Extract only the new types for this package
			newTypes := make(map[string]*types.Type)
			newInterfaces := make(map[string]*types.Type)

			// Note: This is a simplified approach. In production, we'd need better tracking
			// of which types came from which package
			if err := tc.pkgTypeCache.Save(pkgDir, newTypes, newInterfaces); err != nil {
				// Log error but don't fail, cache is optional
				fmt.Fprintf(os.Stderr, "Warning: Failed to save type cache: %v\n", err)
			}
			tc.loadStats.LoadedPackages++
		} else {
			tc.loadStats.SkippedPackages++
		}
	}
}

// loadGlobalTypesFromRoots loads type definitions from configured typeRoots
func (tc *TypeChecker) loadGlobalTypesFromRoots(typeRoots []string) {
	if len(typeRoots) == 0 {
		return
	}

	// Get the root directory from moduleResolver
	var rootDir string
	if tc.moduleResolver != nil {
		rootDir = tc.moduleResolver.GetRootDir()
	}
	if rootDir == "" {
		rootDir = "."
	}

	// Load types from each typeRoot
	for _, typeRoot := range typeRoots {
		// Resolve relative paths
		var typesPath string
		if filepath.IsAbs(typeRoot) {
			typesPath = typeRoot
		} else {
			typesPath = filepath.Join(rootDir, typeRoot)
		}

		// Check if directory exists
		if info, err := os.Stat(typesPath); err == nil && info.IsDir() {
			// Load all .d.ts and .ts files from this directory
			tc.loadDeclarationFiles(typesPath)
		}
	}
}

// loadDeclarationFiles loads all .d.ts and .ts files from a directory (including subdirectories)
func (tc *TypeChecker) loadDeclarationFiles(dir string) {
	var declarationFiles []string

	// Collect all .d.ts and .ts files
	_ = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors
		}
		if !info.IsDir() {
			if strings.HasSuffix(path, ".d.ts") || strings.HasSuffix(path, ".ts") {
				// Only load declaration files (globals.ts, *.d.ts)
				baseName := filepath.Base(path)
				if strings.HasSuffix(path, ".d.ts") || baseName == "globals.ts" {
					declarationFiles = append(declarationFiles, path)
				}
			}
		}
		return nil
	})

	// Pass 1: Extract interfaces and types (they define callable signatures)
	for _, path := range declarationFiles {
		tc.extractInterfacesFromFile(path)
	}

	// Pass 2: Extract variables and functions (they may reference interfaces from pass 1)
	for _, path := range declarationFiles {
		tc.extractVariablesFromFile(path)
	}
}

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
	interfaceContext := ""
	interfaceDepth := 0
	hasCallSignature := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Track declare module/namespace blocks
		if strings.HasPrefix(trimmed, "declare module") || strings.HasPrefix(trimmed, "declare namespace") {
			inDeclareBlock = true
			blockDepth = 0
		}

		// Track interface declarations to detect call signatures
		if strings.HasPrefix(trimmed, "interface ") || strings.HasPrefix(trimmed, "export interface ") {
			parts := strings.Fields(trimmed)
			for j, part := range parts {
				if part == "interface" && j+1 < len(parts) {
					interfaceName := parts[j+1]
					// Clean interface name
					interfaceName = strings.TrimSuffix(interfaceName, "{")
					interfaceName = strings.TrimSpace(interfaceName)
					if idx := strings.IndexAny(interfaceName, "<{"); idx != -1 {
						interfaceName = interfaceName[:idx]
					}
					interfaceContext = interfaceName
					interfaceDepth = 0
					hasCallSignature = false
					break
				}
			}
		}

		// Detect call signatures in interfaces: (args): returnType;
		// Call signatures can be indented and may span multiple lines
		if interfaceContext != "" {
			// Check if line contains a call signature pattern
			// Pattern 1: (args): ReturnType;
			// Pattern 2: <TElement>(args): ReturnType;
			if strings.Contains(trimmed, "(") && (strings.Contains(trimmed, "):") || strings.Contains(trimmed, "): ")) {
				// Check if it's a call signature (starts with ( or <generics>()
				if strings.HasPrefix(trimmed, "(") ||
					(strings.Contains(trimmed, "<") && strings.Index(trimmed, "<") < strings.Index(trimmed, "(")) {
					hasCallSignature = true
				}
			}
			// Pattern 3: Just opening paren at start (multi-line signature)
			if strings.HasPrefix(trimmed, "(") && !strings.Contains(trimmed, ":") {
				// Might be start of a multi-line call signature
				hasCallSignature = true
			}
		}

		// Count braces
		openBraces := strings.Count(line, "{")
		closeBraces := strings.Count(line, "}")
		blockDepth += openBraces - closeBraces

		if interfaceContext != "" {
			interfaceDepth += openBraces - closeBraces
			if interfaceDepth <= 0 {
				// End of interface - register symbol if it has call signature
				if hasCallSignature && isValidIdentifier(interfaceContext) {
					symbol := tc.symbolTable.DefineSymbol(interfaceContext, symbols.InterfaceSymbol, nil, false)
					symbol.IsFunction = true
					symbol.FromDTS = true // Mark as coming from .d.ts
				}
				interfaceContext = ""
				hasCallSignature = false
			}
		}

		if inDeclareBlock && blockDepth <= 0 {
			inDeclareBlock = false
		}

		// Process type aliases outside of declare module blocks
		if !inDeclareBlock {
			tc.extractTypeAliasFromLine(trimmed)
		}
	}
}

// extractVariablesUsingPatterns extracts variable and function declarations (Pass 2)
func (tc *TypeChecker) extractVariablesUsingPatterns(text string) {
	lines := strings.Split(text, "\n")

	// Track context
	inDeclareBlock := false
	blockDepth := 0

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Extract global namespaces FIRST (before inDeclareBlock check)
		// Pattern: declare namespace NAME { ... }
		// This is how Intl and other global namespaces are defined
		if strings.HasPrefix(trimmed, "declare namespace ") {
			parts := strings.Fields(trimmed)
			if len(parts) >= 3 {
				name := parts[2]
				// Remove { if present
				name = strings.TrimSuffix(name, "{")
				name = strings.TrimSpace(name)

				if name != "" && isValidIdentifier(name) {
					// Register the namespace as a global object
					tc.globalEnv.Objects[name] = types.Any

					// Also add to symbol table
					symbol := tc.symbolTable.DefineSymbol(name, symbols.VariableSymbol, nil, false)
					symbol.FromDTS = true

					if os.Getenv("DEBUG_LIB_LOADING") == "1" {
						fmt.Fprintf(os.Stderr, "Extracted namespace: %s\n", name)
					}
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
			tc.extractGlobalDeclarationFromLine(trimmed, i, lines)
		}
	}
}

// extractTypeAliasFromLine extracts type alias declarations
func (tc *TypeChecker) extractTypeAliasFromLine(line string) {
	// Pattern: type NAME = ...
	if strings.HasPrefix(line, "type ") || strings.HasPrefix(line, "export type ") {
		parts := strings.Fields(line)
		for i, part := range parts {
			if part == "type" && i+1 < len(parts) {
				name := parts[i+1]
				if idx := strings.Index(name, "="); idx != -1 {
					name = name[:idx]
				}
				name = strings.TrimSpace(name)
				if idx := strings.IndexAny(name, "<{"); idx != -1 {
					name = name[:idx]
				}
				if name != "" && isValidIdentifier(name) {
					tc.symbolTable.DefineSymbol(name, symbols.TypeAliasSymbol, nil, false)
				}
				break
			}
		}
	}
}

// extractGlobalDeclarationFromLine extracts a global symbol from a single line
func (tc *TypeChecker) extractGlobalDeclarationFromLine(line string, lineIdx int, allLines []string) {
	// Pattern: declare const NAME: TYPE;
	// Pattern: declare var NAME: TYPE;
	// Pattern: declare let NAME: TYPE;
	if strings.HasPrefix(line, "declare const ") ||
		strings.HasPrefix(line, "declare var ") ||
		strings.HasPrefix(line, "declare let ") {

		parts := strings.Fields(line)
		if len(parts) >= 3 {
			name := parts[2]
			// Remove : and everything after it
			if idx := strings.Index(name, ":"); idx != -1 {
				name = name[:idx]
			}
			name = strings.TrimSuffix(name, ";")

			if name != "" && isValidIdentifier(name) {
				symbol := tc.symbolTable.DefineSymbol(name, symbols.VariableSymbol, nil, false)
				symbol.FromDTS = true // Mark as coming from .d.ts
				// Check if the type suggests it's callable
				typeStr := tc.extractTypeFromDeclaration(line)
				if typeStr != "" {
					// Check if the type is a known callable interface
					if tc.isTypeCallable(typeStr) {
						symbol.IsFunction = true
					} else {
						// Look ahead in the file to see if this type becomes callable
						tc.checkIfTypeIsCallable(symbol, typeStr, lineIdx, allLines)
					}
				}

				// Also add to global environment so it can be found during type checking
				tc.globalEnv.Objects[name] = types.Any
			}
		}
	}

	// Pattern: declare function NAME(...): TYPE;
	if strings.HasPrefix(line, "declare function ") {
		parts := strings.Fields(line)
		if len(parts) >= 3 {
			name := parts[2]
			if idx := strings.Index(name, "("); idx != -1 {
				name = name[:idx]
			}

			if name != "" && isValidIdentifier(name) {
				symbol := tc.symbolTable.DefineSymbol(name, symbols.FunctionSymbol, nil, false)
				symbol.IsFunction = true
				symbol.FromDTS = true // Mark as coming from .d.ts

				// Also add to global environment
				tc.globalEnv.Objects[name] = types.Any
			}
		}
	}

	// Pattern: declare namespace NAME { ... }
	// This is how Intl and other global namespaces are defined
	if strings.HasPrefix(line, "declare namespace ") {
		parts := strings.Fields(line)
		if len(parts) >= 3 {
			name := parts[2]
			// Remove { if present
			name = strings.TrimSuffix(name, "{")
			name = strings.TrimSpace(name)

			if name != "" && isValidIdentifier(name) {
				// Register the namespace as a global object
				tc.globalEnv.Objects[name] = types.Any

				// Also add to symbol table
				symbol := tc.symbolTable.DefineSymbol(name, symbols.VariableSymbol, nil, false)
				symbol.FromDTS = true

				if os.Getenv("DEBUG_LIB_LOADING") == "1" {
					fmt.Fprintf(os.Stderr, "Extracted namespace: %s\n", name)
				}
			}
		}
	}

	// Pattern: export = NAME; (CommonJS export)
	if strings.HasPrefix(line, "export =") || strings.HasPrefix(line, "export=") {
		exportedName := strings.TrimPrefix(line, "export=")
		exportedName = strings.TrimPrefix(exportedName, "export =")
		exportedName = strings.TrimSpace(exportedName)
		exportedName = strings.TrimSuffix(exportedName, ";")

		if exportedName != "" && isValidIdentifier(exportedName) {
			// The exported name might be defined elsewhere, just ensure it exists
			if existing, ok := tc.symbolTable.ResolveSymbol(exportedName); ok && existing != nil {
				// Create an alias or ensure it's accessible
				tc.symbolTable.DefineSymbol(exportedName, existing.Type, nil, false)
			}
		}
	}
}

// extractTypeFromDeclaration extracts the type annotation from a declaration line
func (tc *TypeChecker) extractTypeFromDeclaration(line string) string {
	if idx := strings.Index(line, ":"); idx != -1 {
		typeStr := line[idx+1:]
		typeStr = strings.TrimSuffix(typeStr, ";")
		typeStr = strings.TrimSpace(typeStr)
		return typeStr
	}
	return ""
}

// isTypeCallable checks if a type name refers to a callable interface already registered
func (tc *TypeChecker) isTypeCallable(typeName string) bool {
	// Clean up type name (remove generics, etc)
	if idx := strings.Index(typeName, "<"); idx != -1 {
		typeName = typeName[:idx]
	}
	typeName = strings.TrimSpace(typeName)

	// Look up the symbol
	if sym, ok := tc.symbolTable.ResolveSymbol(typeName); ok && sym != nil {
		return sym.IsFunction
	}
	return false
}

// checkIfTypeIsCallable checks if a type name suggests the symbol should be callable
// This is called when we find a variable declaration with a type that might be callable
func (tc *TypeChecker) checkIfTypeIsCallable(symbol *symbols.Symbol, typeName string, lineIdx int, allLines []string) {
	// Clean type name
	if idx := strings.Index(typeName, "<"); idx != -1 {
		typeName = typeName[:idx]
	}
	typeName = strings.TrimSpace(typeName)

	// Look for the interface definition in the current file
	for i := 0; i < len(allLines); i++ {
		line := strings.TrimSpace(allLines[i])
		// Check if this line defines the interface/type
		if strings.Contains(line, "interface "+typeName) || strings.Contains(line, "type "+typeName) {
			// Look ahead for call signature
			depth := 0
			for j := i; j < len(allLines) && j < i+100; j++ {
				checkLine := strings.TrimSpace(allLines[j])
				depth += strings.Count(allLines[j], "{") - strings.Count(allLines[j], "}")

				// Check for call signature patterns
				// Pattern 1: (args): returnType;
				if strings.HasPrefix(checkLine, "(") && (strings.Contains(checkLine, "):") || strings.Contains(checkLine, "): ")) {
					symbol.IsFunction = true
					return
				}
				// Pattern 2: generic call signature <T>(args): ReturnType;
				if strings.Contains(checkLine, "(") && (strings.Contains(checkLine, "):") || strings.Contains(checkLine, "): ")) {
					if strings.Contains(checkLine, "<") && strings.Index(checkLine, "<") < strings.Index(checkLine, "(") {
						symbol.IsFunction = true
						return
					}
				}

				if depth <= 0 && j > i {
					break
				}
			}
		}
	}
}

// loadBuiltinTypes loads essential TypeScript utility types with full parsing
// This ensures types like NonNullable, Partial, etc. work correctly
func (tc *TypeChecker) loadBuiltinTypes() {
	// Define only the most essential utility types that are commonly used
	// We use parentheses around union types in extends clauses for better parsing
	builtinTypes := `
type NonNullable<T> = T extends (null | undefined) ? never : T;
type Partial<T> = { [P in keyof T]?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Record<K extends keyof any, T> = { [P in K]: T };
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
`

	// Parse the builtin types
	file, err := parser.ParseCode(builtinTypes, "builtins.d.ts")
	if err != nil {
		// If parsing fails, log but don't crash - the optimized loader will provide fallbacks
		fmt.Fprintf(os.Stderr, "Warning: Failed to parse builtin types: %v\n", err)
		return
	}

	// Register each type alias
	for _, stmt := range file.Body {
		if typeAlias, ok := stmt.(*ast.TypeAliasDeclaration); ok {
			if os.Getenv("TSCHECK_DEBUG") == "1" {
				fmt.Fprintf(os.Stderr, "DEBUG: Registering builtin type: %s\n", typeAlias.ID.Name)
			}
			// Register the type alias - this will add it to the symbol table with the AST node
			tc.checkTypeAliasDeclaration(typeAlias, "builtins.d.ts")
		}
	}
}
