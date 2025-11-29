package checker

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// LoadTypeScriptLibsWithSnapshot loads TypeScript libs using binary snapshots for performance
// This is a wrapper around the original loadTypeScriptLibs that adds snapshot support
func (tc *TypeChecker) LoadTypeScriptLibsWithSnapshot(libs []string) {
	// Start profiling if enabled
	if tc.profiler.IsEnabled() {
		tc.profiler.StartPhase("TypeScript Libs Loading")
		defer tc.profiler.EndPhase("TypeScript Libs Loading")
	}

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
			// No TypeScript libs found, fall back to original method
			tc.loadTypeScriptLibs(libs)
			return
		}
	}

	// Store the path for lazy loading
	tc.typescriptLibPath = typescriptLibPath

	// Try to load from binary snapshot first
	snapshotMgr := NewSnapshotManager()
	snapshotPath := snapshotMgr.GetSnapshotPath(libs, typescriptLibPath)

	if snapshotMgr.SnapshotExists(snapshotPath) {
		// Load from snapshot (fast path - should be ~50-100ms)
		if tc.profiler.IsEnabled() {
			tc.profiler.StartSubPhase("TypeScript Libs Loading", "Load from Snapshot")
		}

		if loadErr := snapshotMgr.LoadSnapshot(tc, snapshotPath); loadErr == nil {
			if tc.profiler.IsEnabled() {
				tc.profiler.EndSubPhase("TypeScript Libs Loading", "Load from Snapshot")
				tc.profiler.RecordCacheHit("TypeScript Libs Loading")
			}
			if debugLibLoadingEnabled {
				fmt.Fprintf(os.Stderr, "✓ Loaded TypeScript libs from snapshot cache\n")
			}
			return
		} else {
			// If snapshot loading fails, fall through to normal loading
			if tc.profiler.IsEnabled() {
				tc.profiler.EndSubPhase("TypeScript Libs Loading", "Load from Snapshot")
				tc.profiler.RecordCacheMiss("TypeScript Libs Loading")
			}
			if os.Getenv("DEBUG_LIB_LOADING") == "1" {
				fmt.Fprintf(os.Stderr, "⚠ Snapshot loading failed: %v, falling back to normal loading\n", loadErr)
			}
		}
	} else {
		if tc.profiler.IsEnabled() {
			tc.profiler.RecordCacheMiss("TypeScript Libs Loading")
		}
	}

	// Snapshot doesn't exist or failed to load - do normal loading
	if os.Getenv("DEBUG_LIB_LOADING") == "1" {
		fmt.Fprintf(os.Stderr, "→ No snapshot found, loading libs normally...\n")
	}

	// Use optimized loader by default (reads files once, uses fast string ops instead of regex)
	// This is 5-7x faster than the old regex-based approach
	useOptimized := os.Getenv("TSCHECK_DISABLE_OPTIMIZED") != "1"

	if useOptimized {
		// OPTIMIZED PATH: Single-pass loading with fast string operations
		if tc.profiler.IsEnabled() {
			tc.profiler.StartSubPhase("TypeScript Libs Loading", "Optimized Load")
		}

		optimizedLoader := NewOptimizedLibLoader(tc)
		if err := optimizedLoader.LoadTypeScriptLibsOptimized(libs, typescriptLibPath); err != nil {
			// Fall back to old method if optimized fails
			if os.Getenv("DEBUG_LIB_LOADING") == "1" {
				fmt.Fprintf(os.Stderr, "⚠ Optimized loading failed: %v, falling back to sequential\n", err)
			}
			tc.loadTypeScriptLibs(libs)
		}

		if tc.profiler.IsEnabled() {
			tc.profiler.EndSubPhase("TypeScript Libs Loading", "Optimized Load")
		}
	} else {
		// Use the original sequential method
		if tc.profiler.IsEnabled() {
			tc.profiler.StartSubPhase("TypeScript Libs Loading", "Sequential Load")
		}

		tc.loadTypeScriptLibs(libs)

		if tc.profiler.IsEnabled() {
			tc.profiler.EndSubPhase("TypeScript Libs Loading", "Sequential Load")
		}
	}

	// Save snapshot for next time (in background to not slow down current run)
	go func() {
		if err := snapshotMgr.SaveSnapshot(tc, libs, snapshotPath); err != nil {
			// Don't fail if snapshot save fails, just log it
			if os.Getenv("DEBUG_LIB_LOADING") == "1" {
				fmt.Fprintf(os.Stderr, "⚠ Failed to save snapshot: %v\n", err)
			}
		} else {
			if os.Getenv("DEBUG_LIB_LOADING") == "1" {
				fmt.Fprintf(os.Stderr, "✓ Snapshot saved for next run\n")
			}
		}
	}()
}

// Helper function to check if snapshot feature is enabled
func (tc *TypeChecker) shouldUseSnapshots() bool {
	// Check if snapshots are disabled via environment variable
	if os.Getenv("TSCHECK_DISABLE_SNAPSHOTS") == "1" {
		return false
	}
	return true
}

// ClearSnapshotCache removes all cached snapshots
// Useful for debugging or when TypeScript version changes
func ClearSnapshotCache() error {
	snapshotMgr := NewSnapshotManager()
	entries, err := os.ReadDir(snapshotMgr.cacheDir)
	if err != nil {
		return err
	}

	removed := 0
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name(), ".snapshot") {
			path := filepath.Join(snapshotMgr.cacheDir, entry.Name())
			if err := os.Remove(path); err == nil {
				removed++
			}
		}
	}

	fmt.Printf("Removed %d snapshot cache file(s)\n", removed)
	return nil
}
