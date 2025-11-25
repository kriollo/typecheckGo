package checker

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

// OptimizedLibLoader provides highly optimized loading of TypeScript library files
type OptimizedLibLoader struct {
	tc               *TypeChecker
	loadedFiles      map[string]bool
	mu               sync.Mutex
	globalNamespaces map[string]bool
	globalInterfaces map[string]bool
	globalFunctions  map[string]bool
}

// NewOptimizedLibLoader creates a new optimized lib loader
func NewOptimizedLibLoader(tc *TypeChecker) *OptimizedLibLoader {
	return &OptimizedLibLoader{
		tc:               tc,
		loadedFiles:      make(map[string]bool),
		globalNamespaces: make(map[string]bool),
		globalInterfaces: make(map[string]bool),
		globalFunctions:  make(map[string]bool),
	}
}

// LoadLibFileOptimized loads a lib file with aggressive optimizations
// This reads the file ONCE and extracts everything in a single pass
func (oll *OptimizedLibLoader) LoadLibFileOptimized(filePath string) error {
	// Check if already loaded
	oll.mu.Lock()
	if oll.loadedFiles[filePath] {
		oll.mu.Unlock()
		return nil
	}
	oll.loadedFiles[filePath] = true
	oll.mu.Unlock()

	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	// Increase buffer size for large lines in .d.ts files
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024) // 1MB max line size

	var (
		inDeclareBlock   bool
		inInterfaceBlock bool
		blockDepth       int
		interfaceName    string
		hasCallSignature bool
		lineNum          int
		referencedLibs   []string
	)

	// Single-pass extraction
	for scanner.Scan() {
		lineNum++
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)

		// Skip empty lines and comments (except /// references)
		if trimmed == "" || (strings.HasPrefix(trimmed, "//") && !strings.HasPrefix(trimmed, "///")) {
			continue
		}

		// Extract /// <reference lib="..." /> directives (only in first 50 lines)
		if lineNum <= 50 && strings.HasPrefix(trimmed, "///") && strings.Contains(trimmed, "<reference") && strings.Contains(trimmed, "lib=") {
			if libName := extractLibName(trimmed); libName != "" {
				referencedLibs = append(referencedLibs, libName)
			}
			continue
		}

		// Track declare blocks
		if strings.HasPrefix(trimmed, "declare module") || strings.HasPrefix(trimmed, "declare namespace") {
			inDeclareBlock = true
			blockDepth = 0
		}

		// Count braces
		openBraces := strings.Count(line, "{")
		closeBraces := strings.Count(line, "}")
		blockDepth += openBraces - closeBraces

		if inDeclareBlock && blockDepth <= 0 {
			inDeclareBlock = false
		}

		// Only process global declarations (not inside declare module blocks)
		if !inDeclareBlock {
			// Fast path: Extract global namespaces
			if strings.HasPrefix(trimmed, "declare namespace ") {
				if name := extractNamespaceName(trimmed); name != "" && !oll.globalNamespaces[name] {
					oll.globalNamespaces[name] = true
					oll.tc.globalEnv.Objects[name] = types.Any
					symbol := oll.tc.symbolTable.DefineSymbol(name, symbols.VariableSymbol, nil, false)
					symbol.FromDTS = true
				}
			}

			// Fast path: Extract global functions
			if strings.HasPrefix(trimmed, "declare function ") {
				if name := extractFunctionName(trimmed); name != "" && !oll.globalFunctions[name] {
					oll.globalFunctions[name] = true
					symbol := oll.tc.symbolTable.DefineSymbol(name, symbols.FunctionSymbol, nil, false)
					symbol.IsFunction = true
					symbol.FromDTS = true
					oll.tc.globalEnv.Objects[name] = types.Any
				}
			}

			// Fast path: Extract global variables
			if strings.HasPrefix(trimmed, "declare const ") || strings.HasPrefix(trimmed, "declare var ") || strings.HasPrefix(trimmed, "declare let ") {
				if name, typeName := extractVarName(trimmed); name != "" {
					symbol := oll.tc.symbolTable.DefineSymbol(name, symbols.VariableSymbol, nil, false)
					symbol.FromDTS = true

					// If it's a constructor (e.g. Number: NumberConstructor), mark as function/callable
					if strings.HasSuffix(typeName, "Constructor") {
						symbol.IsFunction = true
						// Also assign Any to ensure it's treated as callable by checkCallExpression
						symbol.ResolvedType = types.Any
					}

					oll.tc.globalEnv.Objects[name] = types.Any
				}
			}

			// Fast path: Extract type aliases
			if strings.HasPrefix(trimmed, "type ") || strings.HasPrefix(trimmed, "export type ") {
				if name := extractTypeAliasName(trimmed); name != "" {
					symbol := oll.tc.symbolTable.DefineSymbol(name, symbols.TypeAliasSymbol, nil, false)
					symbol.FromDTS = true
					// Assign Any to avoid false positives with utility types like Partial, Pick, etc.
					oll.tc.globalEnv.Types[name] = types.Any
					symbol.ResolvedType = types.Any
				}
			}

			// Track interfaces with call signatures and members
			if strings.HasPrefix(trimmed, "interface ") || strings.HasPrefix(trimmed, "export interface ") {
				interfaceName = extractInterfaceName(trimmed)
				if interfaceName != "" {
					inInterfaceBlock = true
					hasCallSignature = false
					// Create a new object type for this interface if it doesn't exist
					if _, exists := oll.tc.globalEnv.Types[interfaceName]; !exists {
						oll.tc.globalEnv.Types[interfaceName] = types.NewObjectType(interfaceName, make(map[string]*types.Type))
					}
					oll.globalInterfaces[interfaceName] = true
				}
			}

			if inInterfaceBlock {
				// Detect call signatures: (args): ReturnType or <T>(args): ReturnType
				if (strings.HasPrefix(trimmed, "(") || (strings.Contains(trimmed, "<") && strings.Index(trimmed, "<") < strings.Index(trimmed, "("))) &&
					(strings.Contains(trimmed, "):") || strings.Contains(trimmed, "): ")) {
					hasCallSignature = true
				}

				// Extract methods: name(...): Type
				if methodName, isMethod := extractMethodName(trimmed); isMethod {
					if typ, exists := oll.tc.globalEnv.Types[interfaceName]; exists && typ.Properties != nil {
						// For now, just assign Any type to methods to avoid false positives
						// In a full implementation, we would parse the return type
						typ.Properties[methodName] = types.Any
					}
				}

				// Extract properties: name: Type
				if propName, isProp := extractPropertyName(trimmed); isProp {
					if typ, exists := oll.tc.globalEnv.Types[interfaceName]; exists && typ.Properties != nil {
						typ.Properties[propName] = types.Any
					}
				}

				// End of interface
				if blockDepth <= 0 && interfaceName != "" {
					symbol := oll.tc.symbolTable.DefineSymbol(interfaceName, symbols.InterfaceSymbol, nil, false)
					symbol.FromDTS = true

					if hasCallSignature {
						symbol.IsFunction = true
					}

					// Link the symbol to the type
					if typ, exists := oll.tc.globalEnv.Types[interfaceName]; exists {
						symbol.ResolvedType = typ
					}

					inInterfaceBlock = false
					interfaceName = ""
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error scanning file: %w", err)
	}

	// Mark file as loaded in the TypeChecker's loadedLibFiles map
	if oll.tc.loadedLibFiles != nil {
		oll.tc.loadedLibFiles[filePath] = true
	}

	// Load referenced libs recursively
	libDir := filepath.Dir(filePath)
	for _, libName := range referencedLibs {
		libFileName := fmt.Sprintf("lib.%s.d.ts", libName)
		referencedPath := filepath.Join(libDir, libFileName)
		if _, err := os.Stat(referencedPath); err == nil {
			oll.LoadLibFileOptimized(referencedPath)
		}
	}

	return nil
}

// Fast extraction functions using simple string operations

func extractLibName(line string) string {
	// Extract from: /// <reference lib="es2019" />
	start := strings.Index(line, "lib=\"")
	if start == -1 {
		start = strings.Index(line, "lib='")
	}
	if start == -1 {
		return ""
	}
	start += 5
	end := strings.IndexAny(line[start:], "\"'")
	if end == -1 {
		return ""
	}
	return line[start : start+end]
}

func extractNamespaceName(line string) string {
	// Extract from: declare namespace NAME {
	parts := strings.Fields(line)
	if len(parts) >= 3 && parts[0] == "declare" && parts[1] == "namespace" {
		name := parts[2]
		name = strings.TrimSuffix(name, "{")
		name = strings.TrimSpace(name)
		if isValidIdentifier(name) {
			return name
		}
	}
	return ""
}

func extractFunctionName(line string) string {
	// Extract from: declare function NAME(...
	parts := strings.Fields(line)
	if len(parts) >= 3 && parts[0] == "declare" && parts[1] == "function" {
		name := parts[2]
		if idx := strings.Index(name, "("); idx != -1 {
			name = name[:idx]
		}
		if isValidIdentifier(name) {
			return name
		}
	}
	return ""
}

func extractVarName(line string) (string, string) {
	// Extract from: declare const/var/let NAME: TYPE;
	parts := strings.Fields(line)
	if len(parts) >= 3 {
		// Find the name part (usually index 2)
		namePartIdx := 2

		// Handle "declare var name" vs "declare var name: type"
		name := parts[namePartIdx]
		typeName := ""

		// Check for colon in name part
		if idx := strings.Index(name, ":"); idx != -1 {
			if idx < len(name)-1 {
				typeName = name[idx+1:]
			} else if namePartIdx+1 < len(parts) {
				typeName = parts[namePartIdx+1]
			}
			name = name[:idx]
		} else if namePartIdx+1 < len(parts) && parts[namePartIdx+1] == ":" {
			// name : type
			if namePartIdx+2 < len(parts) {
				typeName = parts[namePartIdx+2]
			}
		} else if namePartIdx+1 < len(parts) && strings.HasPrefix(parts[namePartIdx+1], ":") {
			// name :type
			typeName = parts[namePartIdx+1][1:]
		}

		name = strings.TrimSuffix(name, ";")
		typeName = strings.TrimSuffix(typeName, ";")

		if isValidIdentifier(name) {
			return name, typeName
		}
	}
	return "", ""
}

func extractTypeAliasName(line string) string {
	// Extract from: type NAME = ... or export type NAME = ...
	parts := strings.Fields(line)
	for i, part := range parts {
		if part == "type" && i+1 < len(parts) {
			name := parts[i+1]
			// Handle generics: type Name<T> = ...
			if idx := strings.Index(name, "<"); idx != -1 {
				name = name[:idx]
			}
			// Handle assignment: type Name = ...
			if idx := strings.Index(name, "="); idx != -1 {
				name = name[:idx]
			}
			name = strings.TrimSpace(name)
			if isValidIdentifier(name) {
				return name
			}
		}
	}
	return ""
}

func extractInterfaceName(line string) string {
	// Extract from: interface NAME { or export interface NAME {
	parts := strings.Fields(line)
	for i, part := range parts {
		if part == "interface" && i+1 < len(parts) {
			name := parts[i+1]
			name = strings.TrimSuffix(name, "{")
			name = strings.TrimSpace(name)
			if idx := strings.IndexAny(name, "<{"); idx != -1 {
				name = name[:idx]
			}
			if isValidIdentifier(name) {
				return name
			}
		}
	}
	return ""
}

func extractMethodName(line string) (string, bool) {
	// Extract from: methodName(args): Type;
	// Ignore if it starts with special chars or keywords
	if strings.HasPrefix(line, "//") || strings.HasPrefix(line, "/*") {
		return "", false
	}

	idx := strings.Index(line, "(")
	if idx == -1 {
		// Check for generic methods: method<T>(...)
		idx = strings.Index(line, "<")
	}

	if idx != -1 {
		name := strings.TrimSpace(line[:idx])
		// Handle optional methods: method?()
		name = strings.TrimSuffix(name, "?")

		if isValidIdentifier(name) {
			return name, true
		}
	}
	return "", false
}

func extractPropertyName(line string) (string, bool) {
	// Extract from: propName: Type;
	// Ignore methods (handled above) and index signatures [key: type]
	if strings.Contains(line, "(") || strings.HasPrefix(line, "[") {
		return "", false
	}

	idx := strings.Index(line, ":")
	if idx != -1 {
		name := strings.TrimSpace(line[:idx])
		// Handle optional properties: prop?: Type
		name = strings.TrimSuffix(name, "?")

		if isValidIdentifier(name) {
			return name, true
		}
	}
	return "", false
}

// LoadTypeScriptLibsOptimized loads TypeScript libs with maximum optimization
func (oll *OptimizedLibLoader) LoadTypeScriptLibsOptimized(libs []string, typescriptLibPath string) error {
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

	for _, lib := range libs {
		libLower := strings.ToLower(lib)
		if fileName, ok := libFileMap[libLower]; ok {
			libFilePath := filepath.Join(typescriptLibPath, fileName)
			if _, err := os.Stat(libFilePath); err == nil {
				if os.Getenv("DEBUG_LIB_LOADING") == "1" {
					fmt.Fprintf(os.Stderr, "Loading lib file (optimized): %s from %s\n", lib, libFilePath)
				}
				if err := oll.LoadLibFileOptimized(libFilePath); err != nil {
					return err
				}
			}
		}
	}

	// Safety net: Ensure common globals are defined if missed
	commonGlobals := []string{"Intl", "console", "window", "document", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "process", "module", "require"}
	for _, name := range commonGlobals {
		if _, exists := oll.tc.globalEnv.Objects[name]; !exists {
			// Check if it exists in symbol table but not in Objects (e.g. namespace)
			if sym, ok := oll.tc.symbolTable.ResolveSymbol(name); !ok || sym == nil {
				symbol := oll.tc.symbolTable.DefineSymbol(name, symbols.VariableSymbol, nil, false)
				symbol.FromDTS = true
				symbol.ResolvedType = types.Any
				oll.tc.globalEnv.Objects[name] = types.Any
			}
		}
	}

	return nil
}
