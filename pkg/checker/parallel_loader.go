package checker

import (
	"os"
	"sync"
)

// parallelFileLoader handles concurrent loading of .d.ts files
type parallelFileLoader struct {
	tc    *TypeChecker
	mutex sync.Mutex // Protects shared state (symbol table, global env)
}

// loadFilesInParallel loads multiple .d.ts files concurrently
func (tc *TypeChecker) loadFilesInParallel(files []string) {
	if len(files) == 0 {
		return
	}

	loader := &parallelFileLoader{tc: tc}

	// Read all files in parallel first (I/O bound)
	type fileContent struct {
		path    string
		content string
	}

	contentChan := make(chan fileContent, len(files))
	var wg sync.WaitGroup

	// Limit concurrent file reads to avoid overwhelming the file system
	semaphore := make(chan struct{}, 10)

	for _, filePath := range files {
		wg.Add(1)
		go func(path string) {
			defer wg.Done()
			semaphore <- struct{}{}        // Acquire
			defer func() { <-semaphore }() // Release

			content, err := os.ReadFile(path)
			if err == nil {
				contentChan <- fileContent{path: path, content: string(content)}
			}
		}(filePath)
	}

	// Close channel when all reads complete
	go func() {
		wg.Wait()
		close(contentChan)
	}()

	// Collect all contents
	var contents []fileContent
	for fc := range contentChan {
		contents = append(contents, fc)
	}

	// Pass 1: Extract interfaces and types (in parallel, then merge)
	interfaceResults := make(chan map[string]interface{}, len(contents))
	for _, fc := range contents {
		wg.Add(1)
		go func(content string) {
			defer wg.Done()
			// Each goroutine extracts to a local map, then we merge
			// This avoids lock contention during extraction
			result := loader.extractInterfacesParallel(content)
			interfaceResults <- result
		}(fc.content)
	}

	go func() {
		wg.Wait()
		close(interfaceResults)
	}()

	// Merge interface results (sequential, but fast)
	for result := range interfaceResults {
		loader.mergeInterfaceResults(result)
	}

	// Pass 2: Extract variables and functions (in parallel, then merge)
	variableResults := make(chan map[string]interface{}, len(contents))
	for _, fc := range contents {
		wg.Add(1)
		go func(content string) {
			defer wg.Done()
			result := loader.extractVariablesParallel(content)
			variableResults <- result
		}(fc.content)
	}

	go func() {
		wg.Wait()
		close(variableResults)
	}()

	// Merge variable results
	for result := range variableResults {
		loader.mergeVariableResults(result)
	}
}

// extractInterfacesParallel extracts interfaces without modifying shared state
func (pfl *parallelFileLoader) extractInterfacesParallel(content string) map[string]interface{} {
	// TODO: Parse and return interface definitions
	// For now, return empty map - this will be implemented
	return make(map[string]interface{})
}

// extractVariablesParallel extracts variables without modifying shared state
func (pfl *parallelFileLoader) extractVariablesParallel(content string) map[string]interface{} {
	// TODO: Parse and return variable definitions
	// For now, return empty map - this will be implemented
	return make(map[string]interface{})
}

// mergeInterfaceResults merges interface extraction results into shared state
func (pfl *parallelFileLoader) mergeInterfaceResults(result map[string]interface{}) {
	pfl.mutex.Lock()
	defer pfl.mutex.Unlock()
	// TODO: Merge into symbol table and global env
}

// mergeVariableResults merges variable extraction results into shared state
func (pfl *parallelFileLoader) mergeVariableResults(result map[string]interface{}) {
	pfl.mutex.Lock()
	defer pfl.mutex.Unlock()
	// TODO: Merge into symbol table and global env
}
