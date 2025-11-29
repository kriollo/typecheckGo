package checker

import (
	"fmt"
	"os"
	"path/filepath"
)

// ensureGlobalLoaded checks if a global symbol needs to be lazy loaded and loads it
func (tc *TypeChecker) ensureGlobalLoaded(name string) {
	if libFile, ok := tc.lazyLibMap[name]; ok && tc.typescriptLibPath != "" {
		// Check if we already loaded this lib file
		fullPath := filepath.Join(tc.typescriptLibPath, libFile)
		if !tc.loadedLibFiles[fullPath] {
			if debugLibLoadingEnabled {
				fmt.Fprintf(os.Stderr, "Lazy loading lib for symbol '%s': %s\n", name, libFile)
			}
			tc.loadLibFile(fullPath)
		}
	}
}
