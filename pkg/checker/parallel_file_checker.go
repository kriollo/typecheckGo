package checker

import (
	"runtime"
	"sync"

	"tstypechecker/pkg/ast"
)

// FileCheckJob represents a file to be type checked
type FileCheckJob struct {
	Filename string
	AST      *ast.File
}

// FileCheckResult represents the result of type checking a file
type FileCheckResult struct {
	Filename string
	Errors   []TypeError
}

// ParallelFileChecker manages parallel type checking of multiple files
type ParallelFileChecker struct {
	templateChecker *TypeChecker
	numWorkers      int
}

// NewParallelFileChecker creates a new parallel file checker
func NewParallelFileChecker(templateChecker *TypeChecker) *ParallelFileChecker {
	return &ParallelFileChecker{
		templateChecker: templateChecker,
		numWorkers:      runtime.NumCPU(),
	}
}

// CheckFiles checks multiple files in parallel
func (pfc *ParallelFileChecker) CheckFiles(jobs []FileCheckJob) []FileCheckResult {
	if len(jobs) == 0 {
		return nil
	}

	// For single file, use sequential checking (no overhead)
	if len(jobs) == 1 {
		errors := pfc.templateChecker.CheckFile(jobs[0].Filename, jobs[0].AST)
		return []FileCheckResult{{
			Filename: jobs[0].Filename,
			Errors:   errors,
		}}
	}

	// Create job and result channels
	jobChan := make(chan FileCheckJob, len(jobs))
	resultChan := make(chan FileCheckResult, len(jobs))

	// Start workers
	var wg sync.WaitGroup
	for i := 0; i < pfc.numWorkers; i++ {
		wg.Add(1)
		go pfc.worker(&wg, jobChan, resultChan)
	}

	// Send jobs
	for _, job := range jobs {
		jobChan <- job
	}
	close(jobChan)

	// Wait for workers to finish
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// Collect results
	results := make([]FileCheckResult, 0, len(jobs))
	for result := range resultChan {
		results = append(results, result)
	}

	return results
}

// worker processes files from the job channel
func (pfc *ParallelFileChecker) worker(wg *sync.WaitGroup, jobs <-chan FileCheckJob, results chan<- FileCheckResult) {
	defer wg.Done()

	// Create a worker-specific checker by cloning the template
	workerChecker := pfc.cloneChecker()

	for job := range jobs {
		errors := workerChecker.CheckFile(job.Filename, job.AST)
		results <- FileCheckResult{
			Filename: job.Filename,
			Errors:   errors,
		}
	}
}

// cloneChecker creates a new TypeChecker with shared global environment
func (pfc *ParallelFileChecker) cloneChecker() *TypeChecker {
	// Create new checker
	newChecker := New()

	// Copy global types from template (shared, read-only)
	newChecker.CopyGlobalTypesFrom(pfc.templateChecker)

	// Copy loaded lib files tracking
	newChecker.loadedLibFiles = pfc.templateChecker.loadedLibFiles
	newChecker.typescriptLibPath = pfc.templateChecker.typescriptLibPath

	// Copy module resolver (shared, read-only during checking)
	newChecker.moduleResolver = pfc.templateChecker.moduleResolver

	// Copy config
	newChecker.config = pfc.templateChecker.config

	// Each worker gets its own profiler (optional)
	// newChecker.profiler is already initialized in New()

	return newChecker
}
