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
				if name := extractVarName(trimmed); name != "" {
					symbol := oll.tc.symbolTable.DefineSymbol(name, symbols.VariableSymbol, nil, false)
					symbol.FromDTS = true
					oll.tc.globalEnv.Objects[name] = types.Any
				}
			}

			// Track interfaces with call signatures
			if strings.HasPrefix(trimmed, "interface ") || strings.HasPrefix(trimmed, "export interface ") {
				interfaceName = extractInterfaceName(trimmed)
				if interfaceName != "" {
					inInterfaceBlock = true
					hasCallSignature = false
					oll.globalInterfaces[interfaceName] = true
				}
			}

			if inInterfaceBlock {
				// Detect call signatures: (args): ReturnType or <T>(args): ReturnType
				if (strings.HasPrefix(trimmed, "(") || (strings.Contains(trimmed, "<") && strings.Index(trimmed, "<") < strings.Index(trimmed, "("))) &&
					(strings.Contains(trimmed, "):") || strings.Contains(trimmed, "): ")) {
					hasCallSignature = true
				}

				// End of interface
				if blockDepth <= 0 && interfaceName != "" {
					if hasCallSignature {
						symbol := oll.tc.symbolTable.DefineSymbol(interfaceName, symbols.InterfaceSymbol, nil, false)
						symbol.IsFunction = true
						symbol.FromDTS = true
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

func extractVarName(line string) string {
	// Extract from: declare const/var/let NAME: TYPE
	parts := strings.Fields(line)
	if len(parts) >= 3 {
		name := parts[2]
		if idx := strings.Index(name, ":"); idx != -1 {
			name = name[:idx]
		}
		name = strings.TrimSuffix(name, ";")
		if isValidIdentifier(name) {
			return name
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

	return nil
}
