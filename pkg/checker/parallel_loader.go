package checker

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

// ParallelLibLoader handles parallel loading of TypeScript library files
type ParallelLibLoader struct {
	tc       *TypeChecker
	profiler *PerformanceProfiler
}

// NewParallelLibLoader creates a new parallel lib loader
func NewParallelLibLoader(tc *TypeChecker) *ParallelLibLoader {
	return &ParallelLibLoader{
		tc:       tc,
		profiler: tc.profiler,
	}
}

// LoadTypeScriptLibsParallel loads TypeScript libs using parallel processing
func (pll *ParallelLibLoader) LoadTypeScriptLibsParallel(libs []string, typescriptLibPath string) {
	if pll.profiler.IsEnabled() {
		pll.profiler.StartPhase("TypeScript Libs (Parallel)")
		defer pll.profiler.EndPhase("TypeScript Libs (Parallel)")
	}

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

	// Collect files to load
	var filesToLoad []string
	for _, lib := range libs {
		libLower := strings.ToLower(lib)
		if fileName, ok := libFileMap[libLower]; ok {
			libFilePath := filepath.Join(typescriptLibPath, fileName)
			if _, err := os.Stat(libFilePath); err == nil {
				filesToLoad = append(filesToLoad, libFilePath)
			}
		}
	}

	if len(filesToLoad) == 0 {
		return
	}

	// Phase 1: Load all lib references (must be sequential to track dependencies)
	if pll.profiler.IsEnabled() {
		pll.profiler.StartSubPhase("TypeScript Libs (Parallel)", "Load References")
	}

	for _, filePath := range filesToLoad {
		pll.tc.loadLibReferences(filePath)
	}

	if pll.profiler.IsEnabled() {
		pll.profiler.EndSubPhase("TypeScript Libs (Parallel)", "Load References")
	}

	// Phase 2: Extract interfaces in parallel (read-only, can be parallelized)
	if pll.profiler.IsEnabled() {
		pll.profiler.StartSubPhase("TypeScript Libs (Parallel)", "Extract Interfaces")
	}

	pll.extractInterfacesParallel(filesToLoad)

	if pll.profiler.IsEnabled() {
		pll.profiler.EndSubPhase("TypeScript Libs (Parallel)", "Extract Interfaces")
	}

	// Phase 3: Extract variables in parallel (writes to global env, needs synchronization)
	if pll.profiler.IsEnabled() {
		pll.profiler.StartSubPhase("TypeScript Libs (Parallel)", "Extract Variables")
	}

	pll.extractVariablesParallel(filesToLoad)

	if pll.profiler.IsEnabled() {
		pll.profiler.EndSubPhase("TypeScript Libs (Parallel)", "Extract Variables")
	}
}

// extractInterfacesParallel extracts interfaces from multiple files in parallel
func (pll *ParallelLibLoader) extractInterfacesParallel(files []string) {
	var wg sync.WaitGroup
	var mu sync.Mutex              // Protect writes to global environment
	numWorkers := runtime.NumCPU() // Use all available CPU cores

	jobs := make(chan string, len(files))

	// Start workers
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for filePath := range jobs {
				startTime := time.Now()

				content, err := os.ReadFile(filePath)
				if err != nil {
					if pll.profiler.IsEnabled() {
						pll.profiler.RecordFileLoad(filePath, "TypeScript Libs (Parallel)", time.Since(startTime), 0, false, err)
					}
					continue
				}

				// Parse content (CPU intensive, done in parallel)
				interfaces := parseInterfacesFromText(string(content))

				// Write to global environment (fast, protected by mutex)
				mu.Lock()
				for _, iface := range interfaces {
					// Add to global types
					pll.tc.globalEnv.Types[iface.Name] = iface.Type

					// Register symbol
					symbol := pll.tc.symbolTable.DefineSymbol(iface.Name, symbols.InterfaceSymbol, nil, false)
					symbol.FromDTS = true
				}
				mu.Unlock()

				if pll.profiler.IsEnabled() {
					pll.profiler.RecordFileLoad(filePath, "TypeScript Libs (Parallel)", time.Since(startTime), int64(len(content)), false, nil)
				}
			}
		}()
	}

	// Send jobs
	for _, file := range files {
		jobs <- file
	}
	close(jobs)

	// Wait for completion
	wg.Wait()
}

// extractVariablesParallel extracts variables from multiple files in parallel
func (pll *ParallelLibLoader) extractVariablesParallel(files []string) {
	var wg sync.WaitGroup
	var mu sync.Mutex // Protect writes to global environment

	numWorkers := runtime.NumCPU()
	jobs := make(chan string, len(files))

	// Start workers
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for filePath := range jobs {
				startTime := time.Now()

				content, err := os.ReadFile(filePath)
				if err != nil {
					if pll.profiler.IsEnabled() {
						pll.profiler.RecordFileLoad(filePath, "TypeScript Libs (Parallel)", time.Since(startTime), 0, false, err)
					}
					continue
				}

				// Parse content (CPU intensive, done in parallel)
				globals := parseGlobalsFromText(string(content))

				// Write to global environment (fast, protected by mutex)
				mu.Lock()
				for _, global := range globals {
					if global.IsNamespace {
						pll.tc.globalEnv.Objects[global.Name] = types.Any
						symbol := pll.tc.symbolTable.DefineSymbol(global.Name, symbols.VariableSymbol, nil, false)
						symbol.FromDTS = true
						if os.Getenv("DEBUG_LIB_LOADING") == "1" {
							fmt.Fprintf(os.Stderr, "Extracted namespace: %s\n", global.Name)
						}
					} else if global.IsFunction {
						pll.tc.globalEnv.Objects[global.Name] = types.Any
						symbol := pll.tc.symbolTable.DefineSymbol(global.Name, symbols.FunctionSymbol, nil, false)
						symbol.IsFunction = true
						symbol.FromDTS = true
					} else {
						// Variable
						pll.tc.globalEnv.Objects[global.Name] = types.Any
						symbol := pll.tc.symbolTable.DefineSymbol(global.Name, symbols.VariableSymbol, nil, false)
						symbol.FromDTS = true
					}
				}
				mu.Unlock()

				if pll.profiler.IsEnabled() {
					pll.profiler.RecordFileLoad(filePath, "TypeScript Libs (Parallel)", time.Since(startTime), int64(len(content)), false, nil)
				}
			}
		}()
	}

	// Send jobs
	for _, file := range files {
		jobs <- file
	}
	close(jobs)

	// Wait for completion
	wg.Wait()
}

// LoadNodeModulesTypesParallel loads node_modules types with parallel processing
func (pll *ParallelLibLoader) LoadNodeModulesTypesParallel(rootDir string) {
	if pll.profiler.IsEnabled() {
		pll.profiler.StartPhase("Node Modules (Parallel)")
		defer pll.profiler.EndPhase("Node Modules (Parallel)")
	}

	nodeModulesDir := filepath.Join(rootDir, "node_modules")
	if _, err := os.Stat(nodeModulesDir); os.IsNotExist(err) {
		return
	}

	// Priority 1: Load from @types packages
	if pll.profiler.IsEnabled() {
		pll.profiler.StartSubPhase("Node Modules (Parallel)", "@types Packages")
	}
	pll.loadTypesPackagesParallel(nodeModulesDir)
	if pll.profiler.IsEnabled() {
		pll.profiler.EndSubPhase("Node Modules (Parallel)", "@types Packages")
	}

	// Priority 2: Load from packages with bundled types
	if pll.profiler.IsEnabled() {
		pll.profiler.StartSubPhase("Node Modules (Parallel)", "Bundled Types")
	}
	pll.loadBundledTypesParallel(nodeModulesDir)
	if pll.profiler.IsEnabled() {
		pll.profiler.EndSubPhase("Node Modules (Parallel)", "Bundled Types")
	}
}

// loadTypesPackagesParallel loads @types packages in parallel
func (pll *ParallelLibLoader) loadTypesPackagesParallel(nodeModulesDir string) {
	typesDir := filepath.Join(nodeModulesDir, "@types")
	if _, err := os.Stat(typesDir); os.IsNotExist(err) {
		return
	}

	entries, err := os.ReadDir(typesDir)
	if err != nil {
		return
	}

	var wg sync.WaitGroup
	numWorkers := runtime.NumCPU()
	jobs := make(chan string, len(entries))

	// Start workers
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for pkgName := range jobs {
				pkgDir := filepath.Join(typesDir, pkgName)
				pll.tc.loadPackageWithCache(pkgDir, "@types/"+pkgName)
			}
		}()
	}

	// Send jobs
	for _, entry := range entries {
		if entry.IsDir() {
			jobs <- entry.Name()
		}
	}
	close(jobs)

	wg.Wait()
}

// loadBundledTypesParallel loads bundled types in parallel
func (pll *ParallelLibLoader) loadBundledTypesParallel(nodeModulesDir string) {
	entries, err := os.ReadDir(nodeModulesDir)
	if err != nil {
		return
	}

	var packagesToLoad []struct {
		dir  string
		name string
	}

	// Collect packages to load
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		pkgDir := filepath.Join(nodeModulesDir, entry.Name())

		// Handle scoped packages
		if strings.HasPrefix(entry.Name(), "@") {
			if entry.Name() == "@types" {
				continue // Already handled
			}

			scopeEntries, err := os.ReadDir(pkgDir)
			if err != nil {
				continue
			}

			for _, scopeEntry := range scopeEntries {
				if !scopeEntry.IsDir() {
					continue
				}

				scopedPkgDir := filepath.Join(pkgDir, scopeEntry.Name())
				packageJSONPath := filepath.Join(scopedPkgDir, "package.json")

				if typesFile := pll.tc.getPackageTypesFile(packageJSONPath); typesFile != "" {
					typesPath := filepath.Join(scopedPkgDir, typesFile)
					if _, err := os.Stat(typesPath); err == nil {
						packagesToLoad = append(packagesToLoad, struct {
							dir  string
							name string
						}{scopedPkgDir, entry.Name() + "/" + scopeEntry.Name()})
					}
				}
			}
		} else {
			// Regular package
			packageJSONPath := filepath.Join(pkgDir, "package.json")
			if typesFile := pll.tc.getPackageTypesFile(packageJSONPath); typesFile != "" {
				typesPath := filepath.Join(pkgDir, typesFile)
				if _, err := os.Stat(typesPath); err == nil {
					packagesToLoad = append(packagesToLoad, struct {
						dir  string
						name string
					}{pkgDir, entry.Name()})
				}
			}
		}
	}

	// Load packages in parallel
	var wg sync.WaitGroup
	numWorkers := runtime.NumCPU()
	jobs := make(chan struct {
		dir  string
		name string
	}, len(packagesToLoad))

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for pkg := range jobs {
				if os.Getenv("TSCHECK_DEBUG") == "1" {
					fmt.Fprintf(os.Stderr, "Loading package: %s (%s)\n", pkg.name, pkg.dir)
				}
				pll.tc.loadPackageWithCache(pkg.dir, pkg.name)
			}
		}()
	}

	for _, pkg := range packagesToLoad {
		jobs <- pkg
	}
	close(jobs)

	wg.Wait()
}
