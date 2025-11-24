package checker

import (
	"crypto/sha256"
	"encoding/gob"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

// LibSnapshot represents a serialized snapshot of TypeScript library definitions
type LibSnapshot struct {
	Version       string                 // Snapshot format version
	LibFiles      []string               // List of lib files included
	LibFilesHash  string                 // Hash of lib files for cache invalidation
	GlobalObjects map[string]*types.Type // Global environment objects
	GlobalTypes   map[string]*types.Type // Global environment types
	Symbols       map[string]*SymbolData // Flattened symbol table
	CreatedAt     time.Time              // When snapshot was created
}

// SymbolData represents a serializable symbol
type SymbolData struct {
	Name       string
	Type       symbols.SymbolType
	Mutable    bool
	IsFunction bool
	Params     []string
	FromDTS    bool
}

// SnapshotManager handles creation and loading of binary snapshots
type SnapshotManager struct {
	cacheDir string
}

// NewSnapshotManager creates a new snapshot manager
func NewSnapshotManager() *SnapshotManager {
	// Use user's cache directory
	cacheDir := filepath.Join(os.TempDir(), "tscheck-cache")
	os.MkdirAll(cacheDir, 0755)

	return &SnapshotManager{
		cacheDir: cacheDir,
	}
}

// GetSnapshotPath returns the path to the snapshot file for given libs
func (sm *SnapshotManager) GetSnapshotPath(libs []string, typescriptLibPath string) string {
	// Create a hash of the libs configuration and typescript version
	hash := sm.computeLibsHash(libs, typescriptLibPath)
	return filepath.Join(sm.cacheDir, fmt.Sprintf("libs-%s.snapshot", hash))
}

// computeLibsHash computes a hash of the libs configuration
func (sm *SnapshotManager) computeLibsHash(libs []string, typescriptLibPath string) string {
	h := sha256.New()

	// Include libs configuration
	for _, lib := range libs {
		h.Write([]byte(lib))
	}

	// Include TypeScript lib path (version indicator)
	h.Write([]byte(typescriptLibPath))

	// Check modification time of key lib files to detect updates
	keyFiles := []string{"lib.es5.d.ts", "lib.dom.d.ts"}
	for _, file := range keyFiles {
		fullPath := filepath.Join(typescriptLibPath, file)
		if info, err := os.Stat(fullPath); err == nil {
			h.Write([]byte(info.ModTime().String()))
		}
	}

	return fmt.Sprintf("%x", h.Sum(nil))[:16]
}

// SaveSnapshot saves the current state to a binary snapshot
func (sm *SnapshotManager) SaveSnapshot(tc *TypeChecker, libs []string, snapshotPath string) error {
	snapshot := &LibSnapshot{
		Version:       "1.0",
		LibFiles:      libs,
		GlobalObjects: make(map[string]*types.Type),
		GlobalTypes:   make(map[string]*types.Type),
		Symbols:       make(map[string]*SymbolData),
		CreatedAt:     time.Now(),
	}

	// Copy global environment
	for name, typ := range tc.globalEnv.Objects {
		snapshot.GlobalObjects[name] = typ
	}
	for name, typ := range tc.globalEnv.Types {
		snapshot.GlobalTypes[name] = typ
	}

	// Flatten symbol table (only global scope)
	if tc.symbolTable != nil && tc.symbolTable.Global != nil {
		for name, sym := range tc.symbolTable.Global.Symbols {
			snapshot.Symbols[name] = &SymbolData{
				Name:       sym.Name,
				Type:       sym.Type,
				Mutable:    sym.Mutable,
				IsFunction: sym.IsFunction,
				Params:     sym.Params,
				FromDTS:    sym.FromDTS,
			}
		}
	}

	// Write to file
	file, err := os.Create(snapshotPath)
	if err != nil {
		return fmt.Errorf("failed to create snapshot file: %w", err)
	}
	defer file.Close()

	encoder := gob.NewEncoder(file)
	if err := encoder.Encode(snapshot); err != nil {
		return fmt.Errorf("failed to encode snapshot: %w", err)
	}

	if os.Getenv("DEBUG_LIB_LOADING") == "1" {
		fmt.Fprintf(os.Stderr, "Saved snapshot to %s (%d objects, %d types, %d symbols)\n",
			snapshotPath, len(snapshot.GlobalObjects), len(snapshot.GlobalTypes), len(snapshot.Symbols))
	}

	return nil
}

// LoadSnapshot loads a binary snapshot into the type checker
func (sm *SnapshotManager) LoadSnapshot(tc *TypeChecker, snapshotPath string) error {
	file, err := os.Open(snapshotPath)
	if err != nil {
		return fmt.Errorf("failed to open snapshot file: %w", err)
	}
	defer file.Close()

	decoder := gob.NewDecoder(file)
	snapshot := &LibSnapshot{}

	if err := decoder.Decode(snapshot); err != nil {
		if err == io.EOF {
			return fmt.Errorf("snapshot file is empty or corrupted")
		}
		return fmt.Errorf("failed to decode snapshot: %w", err)
	}

	// Restore global environment
	for name, typ := range snapshot.GlobalObjects {
		tc.globalEnv.Objects[name] = typ
	}
	for name, typ := range snapshot.GlobalTypes {
		tc.globalEnv.Types[name] = typ
	}

	// Restore symbols to global scope
	if tc.symbolTable != nil && tc.symbolTable.Global != nil {
		for name, symData := range snapshot.Symbols {
			sym := &symbols.Symbol{
				Name:       symData.Name,
				Type:       symData.Type,
				Mutable:    symData.Mutable,
				IsFunction: symData.IsFunction,
				Params:     symData.Params,
				FromDTS:    symData.FromDTS,
				Scope:      tc.symbolTable.Global,
			}
			tc.symbolTable.Global.Symbols[name] = sym
		}
	}

	if os.Getenv("DEBUG_LIB_LOADING") == "1" {
		fmt.Fprintf(os.Stderr, "Loaded snapshot from %s (%d objects, %d types, %d symbols)\n",
			snapshotPath, len(snapshot.GlobalObjects), len(snapshot.GlobalTypes), len(snapshot.Symbols))
	}

	return nil
}

// SnapshotExists checks if a valid snapshot exists
func (sm *SnapshotManager) SnapshotExists(snapshotPath string) bool {
	info, err := os.Stat(snapshotPath)
	if err != nil {
		return false
	}

	// Check if snapshot is not too old (invalidate after 7 days)
	if time.Since(info.ModTime()) > 7*24*time.Hour {
		return false
	}

	return true
}
