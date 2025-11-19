package checker

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"tstypechecker/pkg/types"
)

// TypeCacheEntry represents a cached type definition
type TypeCacheEntry struct {
	PackageName  string                 `json:"package_name"`
	Version      string                 `json:"version"`
	ModTime      time.Time              `json:"mod_time"`
	Types        map[string]*types.Type `json:"types"`
	Interfaces   map[string]*types.Type `json:"interfaces"`
	CachedAt     time.Time              `json:"cached_at"`
	FileChecksum string                 `json:"file_checksum"`
}

// TypeCache manages cached type definitions
type TypeCache struct {
	cacheDir string
	entries  map[string]*TypeCacheEntry
}

// NewTypeCache creates a new type cache
func NewTypeCache(rootDir string) *TypeCache {
	cacheDir := filepath.Join(rootDir, ".tscheck_cache")
	os.MkdirAll(cacheDir, 0755)

	return &TypeCache{
		cacheDir: cacheDir,
		entries:  make(map[string]*TypeCacheEntry),
	}
}

// GetCacheKey generates a cache key for a package
func (tc *TypeCache) GetCacheKey(packagePath string) string {
	hash := sha256.Sum256([]byte(packagePath))
	return fmt.Sprintf("%x", hash[:8])
}

// Load loads cached types for a package
func (tc *TypeCache) Load(packagePath string) (*TypeCacheEntry, error) {
	cacheKey := tc.GetCacheKey(packagePath)
	cacheFile := filepath.Join(tc.cacheDir, cacheKey+".json")

	// Check if cache file exists
	if _, err := os.Stat(cacheFile); os.IsNotExist(err) {
		return nil, fmt.Errorf("cache not found")
	}

	// Read cache file
	data, err := os.ReadFile(cacheFile)
	if err != nil {
		return nil, err
	}

	var entry TypeCacheEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		return nil, err
	}

	// Verify cache validity by checking file modification time
	fileInfo, err := os.Stat(packagePath)
	if err == nil {
		if fileInfo.ModTime().After(entry.ModTime) {
			return nil, fmt.Errorf("cache expired")
		}
	}

	tc.entries[packagePath] = &entry
	return &entry, nil
}

// Save saves types to cache
func (tc *TypeCache) Save(packagePath string, types map[string]*types.Type, interfaces map[string]*types.Type) error {
	cacheKey := tc.GetCacheKey(packagePath)
	cacheFile := filepath.Join(tc.cacheDir, cacheKey+".json")

	// Get file modification time
	fileInfo, err := os.Stat(packagePath)
	var modTime time.Time
	if err == nil {
		modTime = fileInfo.ModTime()
	} else {
		modTime = time.Now()
	}

	entry := TypeCacheEntry{
		PackageName:  filepath.Base(packagePath),
		ModTime:      modTime,
		Types:        types,
		Interfaces:   interfaces,
		CachedAt:     time.Now(),
		FileChecksum: tc.calculateChecksum(packagePath),
	}

	data, err := json.Marshal(entry)
	if err != nil {
		return err
	}

	return os.WriteFile(cacheFile, data, 0644)
}

// calculateChecksum calculates a checksum for a file
func (tc *TypeCache) calculateChecksum(filePath string) string {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return ""
	}
	hash := sha256.Sum256(data)
	return fmt.Sprintf("%x", hash)
}

// Clear clears the cache
func (tc *TypeCache) Clear() error {
	return os.RemoveAll(tc.cacheDir)
}

// LoadStats represents loading statistics
type LoadStats struct {
	StartTime          time.Time
	NodeModulesTime    time.Duration
	TypeScriptLibsTime time.Duration
	TypeRootsTime      time.Duration
	TotalTime          time.Duration
	CachedPackages     int
	LoadedPackages     int
	SkippedPackages    int
}

// NewLoadStats creates a new LoadStats
func NewLoadStats() *LoadStats {
	return &LoadStats{
		StartTime: time.Now(),
	}
}

// Finish finalizes the stats
func (ls *LoadStats) Finish() {
	ls.TotalTime = time.Since(ls.StartTime)
}

// String returns a string representation of the stats
func (ls *LoadStats) String() string {
	return fmt.Sprintf(
		"Type loading stats:\n"+
			"  node_modules/@types: %v (%d cached, %d loaded, %d skipped)\n"+
			"  TypeScript libs: %v\n"+
			"  typeRoots: %v\n"+
			"  Total: %v",
		ls.NodeModulesTime, ls.CachedPackages, ls.LoadedPackages, ls.SkippedPackages,
		ls.TypeScriptLibsTime,
		ls.TypeRootsTime,
		ls.TotalTime,
	)
}
