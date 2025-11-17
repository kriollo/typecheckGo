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
	BaseUrl           string            `json:"baseUrl"`
	Paths             map[string][]string `json:"paths"`
	RootDir           string            `json:"rootDir"`
	TypeRoots         []string          `json:"typeRoots"`
	Types             []string          `json:"types"`
	ModuleResolution  string            `json:"moduleResolution"`

	// Type checking
	Strict            bool              `json:"strict"`
	NoImplicitAny     bool              `json:"noImplicitAny"`
	StrictNullChecks  bool              `json:"strictNullChecks"`
	StrictFunctionTypes bool            `json:"strictFunctionTypes"`
	NoUnusedLocals    bool              `json:"noUnusedLocals"`
	NoUnusedParameters bool             `json:"noUnusedParameters"`
	NoImplicitReturns bool              `json:"noImplicitReturns"`

	// Output
	OutDir            string            `json:"outDir"`
	RootDirs          []string          `json:"rootDirs"`

	// Other
	Target            string            `json:"target"`
	Module            string            `json:"module"`
	Lib               []string          `json:"lib"`
	AllowJs           bool              `json:"allowJs"`
	CheckJs           bool              `json:"checkJs"`
	SkipLibCheck      bool              `json:"skipLibCheck"`
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
