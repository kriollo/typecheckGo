package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// TSConfig represents a TypeScript configuration file
type TSConfig struct {
	CompilerOptions CompilerOptions       `json:"compilerOptions"`
	Include         []string              `json:"include"`
	Exclude         []string              `json:"exclude"`
	Files           []string              `json:"files"`
	Extends         string                `json:"extends"`
}

// CompilerOptions represents the compiler options in tsconfig.json
type CompilerOptions struct {
	// Module resolution
	BaseUrl           string              `json:"baseUrl"`
	Paths             map[string][]string `json:"paths"`
	RootDir           string              `json:"rootDir"`
	TypeRoots         []string            `json:"typeRoots"`
	Types             []string            `json:"types"`
	ModuleResolution  string              `json:"moduleResolution"`

	// Type checking - Strict mode flags
	Strict                     bool `json:"strict"`
	NoImplicitAny              bool `json:"noImplicitAny"`
	StrictNullChecks           bool `json:"strictNullChecks"`
	StrictFunctionTypes        bool `json:"strictFunctionTypes"`
	StrictBindCallApply        bool `json:"strictBindCallApply"`
	StrictPropertyInitialization bool `json:"strictPropertyInitialization"`
	NoImplicitThis             bool `json:"noImplicitThis"`
	AlwaysStrict               bool `json:"alwaysStrict"`

	// Additional type checking
	NoUnusedLocals             bool `json:"noUnusedLocals"`
	NoUnusedParameters         bool `json:"noUnusedParameters"`
	NoImplicitReturns          bool `json:"noImplicitReturns"`
	NoFallthroughCasesInSwitch bool `json:"noFallthroughCasesInSwitch"`
	NoUncheckedIndexedAccess   bool `json:"noUncheckedIndexedAccess"`
	NoImplicitOverride         bool `json:"noImplicitOverride"`
	NoPropertyAccessFromIndexSignature bool `json:"noPropertyAccessFromIndexSignature"`
	AllowUnusedLabels          bool `json:"allowUnusedLabels"`
	AllowUnreachableCode       bool `json:"allowUnreachableCode"`
	ExactOptionalPropertyTypes bool `json:"exactOptionalPropertyTypes"`

	// Module & Resolution
	Module               string   `json:"module"`
	ModuleSuffixes       []string `json:"moduleSuffixes"`
	ResolveJsonModule    bool     `json:"resolveJsonModule"`
	NoResolve            bool     `json:"noResolve"`
	AllowArbitraryExtensions bool `json:"allowArbitraryExtensions"`

	// JavaScript support
	AllowJs              bool `json:"allowJs"`
	CheckJs              bool `json:"checkJs"`
	MaxNodeModuleJsDepth int  `json:"maxNodeModuleJsDepth"`

	// Emit
	Declaration              bool   `json:"declaration"`
	DeclarationMap           bool   `json:"declarationMap"`
	EmitDeclarationOnly      bool   `json:"emitDeclarationOnly"`
	SourceMap                bool   `json:"sourceMap"`
	OutFile                  string `json:"outFile"`
	OutDir                   string `json:"outDir"`
	RemoveComments           bool   `json:"removeComments"`
	NoEmit                   bool   `json:"noEmit"`
	ImportHelpers            bool   `json:"importHelpers"`
	DownlevelIteration       bool   `json:"downlevelIteration"`
	InlineSourceMap          bool   `json:"inlineSourceMap"`
	InlineSources            bool   `json:"inlineSources"`
	NewLine                  string `json:"newLine"`
	StripInternal            bool   `json:"stripInternal"`
	NoEmitHelpers            bool   `json:"noEmitHelpers"`
	NoEmitOnError            bool   `json:"noEmitOnError"`
	PreserveConstEnums       bool   `json:"preserveConstEnums"`
	DeclarationDir           string `json:"declarationDir"`

	// Interop constraints
	IsolatedModules          bool `json:"isolatedModules"`
	AllowSyntheticDefaultImports bool `json:"allowSyntheticDefaultImports"`
	EsModuleInterop          bool `json:"esModuleInterop"`
	PreserveSymlinks         bool `json:"preserveSymlinks"`
	ForceConsistentCasingInFileNames bool `json:"forceConsistentCasingInFileNames"`

	// Language and environment
	Target                   string   `json:"target"`
	Lib                      []string `json:"lib"`
	JSX                      string   `json:"jsx"`
	ExperimentalDecorators   bool     `json:"experimentalDecorators"`
	EmitDecoratorMetadata    bool     `json:"emitDecoratorMetadata"`
	JSXFactory               string   `json:"jsxFactory"`
	JSXFragmentFactory       string   `json:"jsxFragmentFactory"`
	JSXImportSource          string   `json:"jsxImportSource"`
	ReactNamespace           string   `json:"reactNamespace"`
	NoLib                    bool     `json:"noLib"`
	UseDefineForClassFields  bool     `json:"useDefineForClassFields"`
	ModuleDetection          string   `json:"moduleDetection"`

	// Completeness
	SkipDefaultLibCheck      bool `json:"skipDefaultLibCheck"`
	SkipLibCheck             bool `json:"skipLibCheck"`

	// Advanced
	Charset                  string `json:"charset"`
	KeyofStringsOnly         bool   `json:"keyofStringsOnly"`
	NoStrictGenericChecks    bool   `json:"noStrictGenericChecks"`
	SuppressExcessPropertyErrors bool `json:"suppressExcessPropertyErrors"`
	SuppressImplicitAnyIndexErrors bool `json:"suppressImplicitAnyIndexErrors"`
	NoErrorTruncation        bool   `json:"noErrorTruncation"`
	PreserveWatchOutput      bool   `json:"preserveWatchOutput"`
	AssumeChangesOnlyAffectDirectDependencies bool `json:"assumeChangesOnlyAffectDirectDependencies"`

	// Output formatting
	Pretty                   bool `json:"pretty"`

	// Watch options (not used in type checking but part of config)
	RootDirs                 []string `json:"rootDirs"`
}

// LoadTSConfig loads and parses a tsconfig.json file
func LoadTSConfig(path string) (*TSConfig, error) {
	// If path is a directory, look for tsconfig.json in it
	info, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("cannot access path: %w", err)
	}

	configPath := path
	if info.IsDir() {
		configPath = filepath.Join(path, "tsconfig.json")
	}

	// Check if file exists
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// No tsconfig.json found, return default config
		return GetDefaultConfig(), nil
	}

	// Read file
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read tsconfig.json: %w", err)
	}

	// Parse JSON
	var config TSConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse tsconfig.json: %w", err)
	}

	// Handle extends
	if config.Extends != "" {
		baseConfigPath := filepath.Join(filepath.Dir(configPath), config.Extends)
		baseConfig, err := LoadTSConfig(baseConfigPath)
		if err != nil {
			return nil, fmt.Errorf("failed to load extended config: %w", err)
		}

		// Merge configs (current config overrides base)
		config = mergeConfigs(baseConfig, &config)
	}

	// Apply defaults for unset values
	applyDefaults(&config)

	return &config, nil
}

// GetDefaultConfig returns a default TypeScript configuration
func GetDefaultConfig() *TSConfig {
	return &TSConfig{
		CompilerOptions: CompilerOptions{
			Target:           "ES2015",
			Module:           "commonjs",
			ModuleResolution: "node",
			Strict:           false,
			NoImplicitAny:    false,
			StrictNullChecks: false,
			AllowJs:          false,
			CheckJs:          false,
			SkipLibCheck:     true,
		},
		Include: []string{"**/*"},
		Exclude: []string{"node_modules", "**/*.spec.ts"},
	}
}

// mergeConfigs merges two configs, with the second one taking precedence
func mergeConfigs(base, override *TSConfig) TSConfig {
	result := *base

	// Merge compiler options
	if override.CompilerOptions.BaseUrl != "" {
		result.CompilerOptions.BaseUrl = override.CompilerOptions.BaseUrl
	}
	if override.CompilerOptions.Paths != nil {
		result.CompilerOptions.Paths = override.CompilerOptions.Paths
	}
	if override.CompilerOptions.RootDir != "" {
		result.CompilerOptions.RootDir = override.CompilerOptions.RootDir
	}
	if override.CompilerOptions.TypeRoots != nil {
		result.CompilerOptions.TypeRoots = override.CompilerOptions.TypeRoots
	}
	if override.CompilerOptions.Types != nil {
		result.CompilerOptions.Types = override.CompilerOptions.Types
	}
	if override.CompilerOptions.ModuleResolution != "" {
		result.CompilerOptions.ModuleResolution = override.CompilerOptions.ModuleResolution
	}

	// Merge type checking options (explicit values override)
	result.CompilerOptions.Strict = override.CompilerOptions.Strict || base.CompilerOptions.Strict
	result.CompilerOptions.NoImplicitAny = override.CompilerOptions.NoImplicitAny || base.CompilerOptions.NoImplicitAny
	result.CompilerOptions.StrictNullChecks = override.CompilerOptions.StrictNullChecks || base.CompilerOptions.StrictNullChecks

	// Merge arrays
	if len(override.Include) > 0 {
		result.Include = override.Include
	}
	if len(override.Exclude) > 0 {
		result.Exclude = override.Exclude
	}
	if len(override.Files) > 0 {
		result.Files = override.Files
	}

	return result
}

// applyDefaults applies default values to unset config options
func applyDefaults(config *TSConfig) {
	if config.CompilerOptions.Target == "" {
		config.CompilerOptions.Target = "ES2015"
	}
	if config.CompilerOptions.Module == "" {
		config.CompilerOptions.Module = "commonjs"
	}
	if config.CompilerOptions.ModuleResolution == "" {
		config.CompilerOptions.ModuleResolution = "node"
	}
	if len(config.Include) == 0 {
		config.Include = []string{"**/*"}
	}
	if len(config.Exclude) == 0 {
		config.Exclude = []string{"node_modules"}
	}

	// Apply strict mode implications
	// When strict is true, it enables all strict type checking options
	if config.CompilerOptions.Strict {
		config.CompilerOptions.NoImplicitAny = true
		config.CompilerOptions.StrictNullChecks = true
		config.CompilerOptions.StrictFunctionTypes = true
		config.CompilerOptions.StrictBindCallApply = true
		config.CompilerOptions.StrictPropertyInitialization = true
		config.CompilerOptions.NoImplicitThis = true
		config.CompilerOptions.AlwaysStrict = true
	}
}

// ResolvePathAlias resolves a path using the paths configuration
func (c *TSConfig) ResolvePathAlias(importPath string) []string {
	if c.CompilerOptions.Paths == nil {
		return nil
	}

	var results []string
	baseUrl := c.CompilerOptions.BaseUrl
	if baseUrl == "" {
		baseUrl = "."
	}

	// Check each path mapping
	for pattern, replacements := range c.CompilerOptions.Paths {
		// Simple wildcard matching (e.g., "@/*" matches "@/utils")
		if pattern[len(pattern)-1] == '*' {
			prefix := pattern[:len(pattern)-1]
			if len(importPath) >= len(prefix) && importPath[:len(prefix)] == prefix {
				// Match found
				suffix := importPath[len(prefix):]
				for _, replacement := range replacements {
					// Replace * with the matched suffix
					if replacement[len(replacement)-1] == '*' {
						resolved := replacement[:len(replacement)-1] + suffix
						results = append(results, filepath.Join(baseUrl, resolved))
					} else {
						results = append(results, filepath.Join(baseUrl, replacement))
					}
				}
			}
		} else if pattern == importPath {
			// Exact match
			for _, replacement := range replacements {
				results = append(results, filepath.Join(baseUrl, replacement))
			}
		}
	}

	return results
}

// GetTypeRoots returns the directories to search for type definitions
func (c *TSConfig) GetTypeRoots() []string {
	if len(c.CompilerOptions.TypeRoots) > 0 {
		return c.CompilerOptions.TypeRoots
	}

	// Default type roots
	return []string{"node_modules/@types"}
}

// ShouldCheckFile determines if a file should be type checked based on include/exclude patterns
func (c *TSConfig) ShouldCheckFile(filePath string) bool {
	// Check exclude patterns first
	for _, pattern := range c.Exclude {
		if matchPattern(filePath, pattern) {
			return false
		}
	}

	// If files array is specified, only check those files
	if len(c.Files) > 0 {
		for _, file := range c.Files {
			if filePath == file {
				return true
			}
		}
		return false
	}

	// Check include patterns
	for _, pattern := range c.Include {
		if matchPattern(filePath, pattern) {
			return true
		}
	}

	return false
}

// matchPattern performs simple glob pattern matching
func matchPattern(path, pattern string) bool {
	// Normalize paths
	path = filepath.ToSlash(path)
	pattern = filepath.ToSlash(pattern)

	// Simple implementation - just check for ** and * wildcards
	if pattern == "**/*" || pattern == "**" {
		return true
	}

	// Check if pattern starts with a directory
	if len(pattern) > 3 && pattern[len(pattern)-3:] == "/**" {
		// test/** pattern - match anything under test/
		prefix := pattern[:len(pattern)-3]
		return len(path) >= len(prefix) && path[:len(prefix)] == prefix
	}

	if len(pattern) > 5 && pattern[len(pattern)-5:] == "/**/*" {
		// test/**/* pattern - match anything under test/
		prefix := pattern[:len(pattern)-5]
		return len(path) >= len(prefix) && path[:len(prefix)] == prefix
	}

	// Check if pattern contains wildcards at the start
	if len(pattern) > 2 && pattern[0] == '*' && pattern[1] == '*' {
		// **/*.ts pattern
		suffix := pattern[3:] // Skip **/
		if suffix[0] == '*' {
			// **/* - match all
			return true
		}
		// Check extension
		return filepath.Ext(path) == filepath.Ext(suffix)
	}

	// Exact match
	return path == pattern
}

// IsStrictMode returns true if strict mode is enabled
func (c *CompilerOptions) IsStrictMode() bool {
	return c.Strict
}

// ShouldCheckImplicitAny returns true if implicit any should be reported as error
func (c *CompilerOptions) ShouldCheckImplicitAny() bool {
	return c.NoImplicitAny || c.Strict
}

// ShouldCheckNullability returns true if null/undefined checks are enabled
func (c *CompilerOptions) ShouldCheckNullability() bool {
	return c.StrictNullChecks || c.Strict
}

// ShouldCheckFunctionTypes returns true if strict function type checks are enabled
func (c *CompilerOptions) ShouldCheckFunctionTypes() bool {
	return c.StrictFunctionTypes || c.Strict
}

// ShouldCheckUnusedLocals returns true if unused local variables should be reported
func (c *CompilerOptions) ShouldCheckUnusedLocals() bool {
	return c.NoUnusedLocals
}

// ShouldCheckUnusedParameters returns true if unused parameters should be reported
func (c *CompilerOptions) ShouldCheckUnusedParameters() bool {
	return c.NoUnusedParameters
}

// ShouldCheckImplicitReturns returns true if functions must explicitly return
func (c *CompilerOptions) ShouldCheckImplicitReturns() bool {
	return c.NoImplicitReturns
}

// ShouldCheckImplicitThis returns true if 'this' must be explicitly typed
func (c *CompilerOptions) ShouldCheckImplicitThis() bool {
	return c.NoImplicitThis || c.Strict
}

// ShouldAllowUnreachableCode returns true if unreachable code is allowed
func (c *CompilerOptions) ShouldAllowUnreachableCode() bool {
	return c.AllowUnreachableCode
}

// ShouldAllowUnusedLabels returns true if unused labels are allowed
func (c *CompilerOptions) ShouldAllowUnusedLabels() bool {
	return c.AllowUnusedLabels
}

// GetTarget returns the ECMAScript target version
func (c *CompilerOptions) GetTarget() string {
	if c.Target == "" {
		return "ES2015"
	}
	return c.Target
}

// GetModule returns the module system
func (c *CompilerOptions) GetModule() string {
	if c.Module == "" {
		return "commonjs"
	}
	return c.Module
}

// GetLib returns the library files to include
func (c *CompilerOptions) GetLib() []string {
	if len(c.Lib) == 0 {
		// Default libs based on target
		target := c.GetTarget()
		switch target {
		case "ES3":
			return []string{"lib.es3.d.ts"}
		case "ES5":
			return []string{"lib.es5.d.ts"}
		case "ES6", "ES2015":
			return []string{"lib.es2015.d.ts"}
		case "ES2016":
			return []string{"lib.es2016.d.ts"}
		case "ES2017":
			return []string{"lib.es2017.d.ts"}
		case "ES2018":
			return []string{"lib.es2018.d.ts"}
		case "ES2019":
			return []string{"lib.es2019.d.ts"}
		case "ES2020":
			return []string{"lib.es2020.d.ts"}
		case "ES2021":
			return []string{"lib.es2021.d.ts"}
		case "ES2022":
			return []string{"lib.es2022.d.ts"}
		case "ESNext":
			return []string{"lib.esnext.d.ts"}
		default:
			return []string{"lib.es2015.d.ts"}
		}
	}
	return c.Lib
}

// ShouldCheckJS returns true if JavaScript files should be type checked
func (c *CompilerOptions) ShouldCheckJS() bool {
	return c.CheckJs
}

// ShouldAllowJS returns true if JavaScript files are allowed
func (c *CompilerOptions) ShouldAllowJS() bool {
	return c.AllowJs
}

// GetModuleResolution returns the module resolution strategy
func (c *CompilerOptions) GetModuleResolution() string {
	if c.ModuleResolution == "" {
		return "node"
	}
	return c.ModuleResolution
}
