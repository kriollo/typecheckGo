package checker

import (
	"fmt"
	"os"
	"sort"
	"sync"
	"time"
)

// PerformanceProfiler tracks detailed timing information for initialization phases
type PerformanceProfiler struct {
	mu          sync.Mutex
	phases      map[string]*PhaseMetrics
	startTime   time.Time
	totalTime   time.Duration
	enabled     bool
	fileMetrics map[string]*FileLoadMetrics
}

// PhaseMetrics tracks metrics for a specific initialization phase
type PhaseMetrics struct {
	Name        string
	StartTime   time.Time
	Duration    time.Duration
	SubPhases   map[string]*PhaseMetrics
	FileCount   int
	BytesRead   int64
	CacheHits   int
	CacheMisses int
	ParentPhase *PhaseMetrics
	Order       int // Track order of execution
}

// FileLoadMetrics tracks metrics for individual file loads
type FileLoadMetrics struct {
	FilePath     string
	Duration     time.Duration
	BytesRead    int64
	Phase        string
	FromCache    bool
	ErrorMessage string
}

// NewPerformanceProfiler creates a new performance profiler
func NewPerformanceProfiler() *PerformanceProfiler {
	enabled := os.Getenv("TSCHECK_PROFILE") == "1"

	return &PerformanceProfiler{
		phases:      make(map[string]*PhaseMetrics),
		fileMetrics: make(map[string]*FileLoadMetrics),
		enabled:     enabled,
	}
}

// IsEnabled returns whether profiling is enabled
func (pp *PerformanceProfiler) IsEnabled() bool {
	return pp.enabled
}

// Start begins profiling
func (pp *PerformanceProfiler) Start() {
	if !pp.enabled {
		return
	}
	pp.startTime = time.Now()
}

// StartPhase begins tracking a phase
func (pp *PerformanceProfiler) StartPhase(name string) {
	if !pp.enabled {
		return
	}

	pp.mu.Lock()
	defer pp.mu.Unlock()

	phase := &PhaseMetrics{
		Name:      name,
		StartTime: time.Now(),
		SubPhases: make(map[string]*PhaseMetrics),
		Order:     len(pp.phases),
	}
	pp.phases[name] = phase
}

// StartSubPhase begins tracking a sub-phase within a parent phase
func (pp *PerformanceProfiler) StartSubPhase(parentName, subName string) {
	if !pp.enabled {
		return
	}

	pp.mu.Lock()
	defer pp.mu.Unlock()

	parent, exists := pp.phases[parentName]
	if !exists {
		// Create parent if it doesn't exist
		parent = &PhaseMetrics{
			Name:      parentName,
			StartTime: time.Now(),
			SubPhases: make(map[string]*PhaseMetrics),
			Order:     len(pp.phases),
		}
		pp.phases[parentName] = parent
	}

	subPhase := &PhaseMetrics{
		Name:        subName,
		StartTime:   time.Now(),
		SubPhases:   make(map[string]*PhaseMetrics),
		ParentPhase: parent,
		Order:       len(parent.SubPhases),
	}
	parent.SubPhases[subName] = subPhase
}

// EndPhase completes tracking a phase
func (pp *PerformanceProfiler) EndPhase(name string) {
	if !pp.enabled {
		return
	}

	pp.mu.Lock()
	defer pp.mu.Unlock()

	if phase, exists := pp.phases[name]; exists {
		phase.Duration = time.Since(phase.StartTime)
	}
}

// EndSubPhase completes tracking a sub-phase
func (pp *PerformanceProfiler) EndSubPhase(parentName, subName string) {
	if !pp.enabled {
		return
	}

	pp.mu.Lock()
	defer pp.mu.Unlock()

	if parent, exists := pp.phases[parentName]; exists {
		if subPhase, exists := parent.SubPhases[subName]; exists {
			subPhase.Duration = time.Since(subPhase.StartTime)
		}
	}
}

// RecordFileLoad records metrics for a file load operation
func (pp *PerformanceProfiler) RecordFileLoad(filePath, phase string, duration time.Duration, bytesRead int64, fromCache bool, err error) {
	if !pp.enabled {
		return
	}

	pp.mu.Lock()
	defer pp.mu.Unlock()

	metrics := &FileLoadMetrics{
		FilePath:  filePath,
		Duration:  duration,
		BytesRead: bytesRead,
		Phase:     phase,
		FromCache: fromCache,
	}

	if err != nil {
		metrics.ErrorMessage = err.Error()
	}

	pp.fileMetrics[filePath] = metrics

	// Update phase metrics
	if phase, exists := pp.phases[phase]; exists {
		phase.FileCount++
		phase.BytesRead += bytesRead
		if fromCache {
			phase.CacheHits++
		} else {
			phase.CacheMisses++
		}
	}
}

// IncrementFileCount increments the file count for a phase
func (pp *PerformanceProfiler) IncrementFileCount(phaseName string) {
	if !pp.enabled {
		return
	}

	pp.mu.Lock()
	defer pp.mu.Unlock()

	if phase, exists := pp.phases[phaseName]; exists {
		phase.FileCount++
	}
}

// AddBytesRead adds bytes read to a phase
func (pp *PerformanceProfiler) AddBytesRead(phaseName string, bytes int64) {
	if !pp.enabled {
		return
	}

	pp.mu.Lock()
	defer pp.mu.Unlock()

	if phase, exists := pp.phases[phaseName]; exists {
		phase.BytesRead += bytes
	}
}

// RecordCacheHit records a cache hit for a phase
func (pp *PerformanceProfiler) RecordCacheHit(phaseName string) {
	if !pp.enabled {
		return
	}

	pp.mu.Lock()
	defer pp.mu.Unlock()

	if phase, exists := pp.phases[phaseName]; exists {
		phase.CacheHits++
	}
}

// RecordCacheMiss records a cache miss for a phase
func (pp *PerformanceProfiler) RecordCacheMiss(phaseName string) {
	if !pp.enabled {
		return
	}

	pp.mu.Lock()
	defer pp.mu.Unlock()

	if phase, exists := pp.phases[phaseName]; exists {
		phase.CacheMisses++
	}
}

// Finish completes profiling and calculates total time
func (pp *PerformanceProfiler) Finish() {
	if !pp.enabled {
		return
	}
	pp.totalTime = time.Since(pp.startTime)
}

// GenerateReport generates a detailed performance report
func (pp *PerformanceProfiler) GenerateReport() string {
	if !pp.enabled {
		return ""
	}

	pp.mu.Lock()
	defer pp.mu.Unlock()

	report := "\n"
	report += "╔════════════════════════════════════════════════════════════════════════╗\n"
	report += "║           TYPECHECKER PERFORMANCE PROFILE REPORT                       ║\n"
	report += "╚════════════════════════════════════════════════════════════════════════╝\n\n"

	report += fmt.Sprintf("Total Initialization Time: %dms\n\n", pp.totalTime.Milliseconds())

	// Sort phases by order
	type phaseWithOrder struct {
		name  string
		phase *PhaseMetrics
	}
	var sortedPhases []phaseWithOrder
	for name, phase := range pp.phases {
		sortedPhases = append(sortedPhases, phaseWithOrder{name, phase})
	}
	sort.Slice(sortedPhases, func(i, j int) bool {
		return sortedPhases[i].phase.Order < sortedPhases[j].phase.Order
	})

	// Phase breakdown
	report += "┌─ INITIALIZATION PHASES ────────────────────────────────────────────────┐\n"
	for _, pw := range sortedPhases {
		name := pw.name
		phase := pw.phase
		percentage := float64(phase.Duration.Milliseconds()) / float64(pp.totalTime.Milliseconds()) * 100

		report += fmt.Sprintf("│ %-40s %6dms (%5.1f%%) │\n", name, phase.Duration.Milliseconds(), percentage)

		if phase.FileCount > 0 || phase.BytesRead > 0 {
			report += fmt.Sprintf("│   Files: %d | Bytes: %s | Cache: %d hits / %d misses%s│\n",
				phase.FileCount,
				formatBytes(phase.BytesRead),
				phase.CacheHits,
				phase.CacheMisses,
				getSpacing(phase.FileCount, phase.BytesRead, phase.CacheHits, phase.CacheMisses))
		}

		// Show sub-phases
		if len(phase.SubPhases) > 0 {
			var sortedSubPhases []phaseWithOrder
			for subName, subPhase := range phase.SubPhases {
				sortedSubPhases = append(sortedSubPhases, phaseWithOrder{subName, subPhase})
			}
			sort.Slice(sortedSubPhases, func(i, j int) bool {
				return sortedSubPhases[i].phase.Order < sortedSubPhases[j].phase.Order
			})

			for _, spw := range sortedSubPhases {
				subName := spw.name
				subPhase := spw.phase
				subPercentage := float64(subPhase.Duration.Milliseconds()) / float64(phase.Duration.Milliseconds()) * 100
				report += fmt.Sprintf("│   ├─ %-35s %6dms (%5.1f%%) │\n", subName, subPhase.Duration.Milliseconds(), subPercentage)
			}
		}
		report += "│                                                                        │\n"
	}
	report += "└────────────────────────────────────────────────────────────────────────┘\n\n"

	// Top slowest files
	report += pp.generateSlowestFilesReport()

	// Optimization suggestions
	report += pp.generateOptimizationSuggestions()

	return report
}

// generateSlowestFilesReport generates a report of the slowest files to load
func (pp *PerformanceProfiler) generateSlowestFilesReport() string {
	if len(pp.fileMetrics) == 0 {
		return ""
	}

	// Sort files by duration
	type fileWithMetrics struct {
		path    string
		metrics *FileLoadMetrics
	}
	var sortedFiles []fileWithMetrics
	for path, metrics := range pp.fileMetrics {
		sortedFiles = append(sortedFiles, fileWithMetrics{path, metrics})
	}
	sort.Slice(sortedFiles, func(i, j int) bool {
		return sortedFiles[i].metrics.Duration > sortedFiles[j].metrics.Duration
	})

	report := "┌─ TOP 10 SLOWEST FILES ─────────────────────────────────────────────────┐\n"
	count := 10
	if len(sortedFiles) < count {
		count = len(sortedFiles)
	}

	for i := 0; i < count; i++ {
		fw := sortedFiles[i]
		cacheStatus := ""
		if fw.metrics.FromCache {
			cacheStatus = " [CACHED]"
		}
		report += fmt.Sprintf("│ %2d. %-50s %6dms%s │\n",
			i+1,
			truncateFilePath(fw.path, 50),
			fw.metrics.Duration.Milliseconds(),
			cacheStatus)
		report += fmt.Sprintf("│     Phase: %-30s Size: %10s │\n",
			fw.metrics.Phase,
			formatBytes(fw.metrics.BytesRead))
	}
	report += "└────────────────────────────────────────────────────────────────────────┘\n\n"

	return report
}

// generateOptimizationSuggestions generates optimization suggestions based on profiling data
func (pp *PerformanceProfiler) generateOptimizationSuggestions() string {
	report := "┌─ OPTIMIZATION SUGGESTIONS ─────────────────────────────────────────────┐\n"

	suggestions := []string{}

	// Check for slow phases
	for name, phase := range pp.phases {
		percentage := float64(phase.Duration.Milliseconds()) / float64(pp.totalTime.Milliseconds()) * 100

		if percentage > 40 {
			suggestions = append(suggestions, fmt.Sprintf(
				"⚠ '%s' takes %.1f%% of init time (%dms). Consider parallel loading.",
				name, percentage, phase.Duration.Milliseconds()))
		}

		if phase.CacheMisses > 50 && phase.CacheHits == 0 {
			suggestions = append(suggestions, fmt.Sprintf(
				"💡 '%s' has %d cache misses. Implement caching for better performance.",
				name, phase.CacheMisses))
		}

		if phase.FileCount > 100 {
			suggestions = append(suggestions, fmt.Sprintf(
				"💡 '%s' loads %d files. Consider batch processing or lazy loading.",
				name, phase.FileCount))
		}
	}

	// Check for sequential loading opportunities
	if len(pp.phases) > 3 {
		suggestions = append(suggestions, "💡 Multiple phases detected. Consider parallelizing independent phases.")
	}

	// Check cache effectiveness
	totalHits := 0
	totalMisses := 0
	for _, phase := range pp.phases {
		totalHits += phase.CacheHits
		totalMisses += phase.CacheMisses
	}

	if totalMisses > 0 {
		hitRate := float64(totalHits) / float64(totalHits+totalMisses) * 100
		if hitRate < 50 {
			suggestions = append(suggestions, fmt.Sprintf(
				"⚠ Cache hit rate is only %.1f%%. Consider improving caching strategy.",
				hitRate))
		}
	}

	if len(suggestions) == 0 {
		report += "│ ✓ No major performance issues detected.                               │\n"
	} else {
		for _, suggestion := range suggestions {
			lines := wrapText(suggestion, 68)
			for _, line := range lines {
				report += fmt.Sprintf("│ %-70s │\n", line)
			}
		}
	}

	report += "└────────────────────────────────────────────────────────────────────────┘\n"

	return report
}

// Helper functions

func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func truncateFilePath(path string, maxLen int) string {
	if len(path) <= maxLen {
		return path
	}
	// Show end of path (filename)
	return "..." + path[len(path)-maxLen+3:]
}

func wrapText(text string, width int) []string {
	var lines []string
	for len(text) > width {
		// Find last space before width
		breakPoint := width
		for i := width; i > 0; i-- {
			if text[i] == ' ' {
				breakPoint = i
				break
			}
		}
		lines = append(lines, text[:breakPoint])
		text = text[breakPoint+1:]
	}
	if len(text) > 0 {
		lines = append(lines, text)
	}
	return lines
}

func getSpacing(fileCount int, bytesRead int64, cacheHits, cacheMisses int) string {
	// Calculate the length of the info string
	info := fmt.Sprintf("Files: %d | Bytes: %s | Cache: %d hits / %d misses",
		fileCount, formatBytes(bytesRead), cacheHits, cacheMisses)

	// Target width is 70 characters (to align with the box)
	targetWidth := 70
	currentWidth := len(info) + 3 // +3 for "│   "

	if currentWidth < targetWidth {
		return fmt.Sprintf("%*s", targetWidth-currentWidth, "")
	}
	return " "
}
