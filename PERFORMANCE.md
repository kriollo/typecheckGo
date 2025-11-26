# Performance Profiling and Optimization Guide

This document explains how to use the performance profiling system to identify and optimize initialization bottlenecks in the TypeScript type checker.

## Quick Start

### Enable Performance Profiling

Set the `TSCHECK_PROFILE` environment variable to generate a detailed performance report:

```powershell
# PowerShell
$env:TSCHECK_PROFILE="1"
.\tscheck.exe check src
```

```bash
# Bash
TSCHECK_PROFILE=1 ./tscheck check src
```

### Enable Parallel Loading (Experimental)

For faster first-run performance, enable parallel loading of TypeScript libs and node_modules:

```powershell
# PowerShell
$env:TSCHECK_PARALLEL_LOAD="1"
$env:TSCHECK_PROFILE="1"
.\tscheck.exe check src
```

```bash
# Bash
TSCHECK_PARALLEL_LOAD=1 TSCHECK_PROFILE=1 ./tscheck check src
```

## Understanding the Performance Report

When `TSCHECK_PROFILE=1` is set, you'll see a detailed report like this:

```
╔════════════════════════════════════════════════════════════════════════╗
║           TYPECHECKER PERFORMANCE PROFILE REPORT                       ║
╚════════════════════════════════════════════════════════════════════════╝

Total Initialization Time: 2450ms

┌─ INITIALIZATION PHASES ────────────────────────────────────────────────┐
│ Node Modules Loading                        1200ms ( 49.0%) │
│   Files: 245 | Bytes: 12.5 MB | Cache: 0 hits / 245 misses            │
│   ├─ @types Packages                         800ms ( 66.7%) │
│   ├─ Bundled Types                           400ms ( 33.3%) │
│                                                                        │
│ TypeScript Libs Loading                      950ms ( 38.8%) │
│   Files: 15 | Bytes: 3.2 MB | Cache: 0 hits / 15 misses               │
│   ├─ Sequential Load                         950ms (100.0%) │
│                                                                        │
│ Type Roots Loading                           300ms ( 12.2%) │
│   Files: 8 | Bytes: 450 KB | Cache: 0 hits / 8 misses                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌─ TOP 10 SLOWEST FILES ─────────────────────────────────────────────────┐
│  1. ...node_modules/typescript/lib/lib.dom.d.ts            350ms │
│     Phase: TypeScript Libs Loading         Size:    1.2 MB │
│  2. ...node_modules/@types/react/index.d.ts                280ms │
│     Phase: Node Modules Loading             Size:  850.0 KB │
│  3. ...node_modules/typescript/lib/lib.es2020.d.ts         220ms │
│     Phase: TypeScript Libs Loading         Size:  650.0 KB │
│  4. ...node_modules/@types/node/index.d.ts                 180ms │
│     Phase: Node Modules Loading             Size:  720.0 KB │
│  5. ...node_modules/@types/vue/index.d.ts                  150ms │
│     Phase: Node Modules Loading             Size:  520.0 KB │
└────────────────────────────────────────────────────────────────────────┘

┌─ OPTIMIZATION SUGGESTIONS ─────────────────────────────────────────────┐
│ ⚠ 'Node Modules Loading' takes 49.0% of init time (1200ms).           │
│    Consider parallel loading.                                          │
│ 💡 'TypeScript Libs Loading' has 15 cache misses. Implement caching   │
│    for better performance.                                             │
│ 💡 'Node Modules Loading' loads 245 files. Consider batch processing  │
│    or lazy loading.                                                    │
│ 💡 Multiple phases detected. Consider parallelizing independent        │
│    phases.                                                             │
└────────────────────────────────────────────────────────────────────────┘
```

## Performance Report Sections

### 1. Initialization Phases

Shows the breakdown of time spent in each major initialization phase:

- **Node Modules Loading**: Time spent loading `node_modules/@types` and bundled types
- **TypeScript Libs Loading**: Time spent loading TypeScript standard library files (lib.dom.d.ts, lib.es2020.d.ts, etc.)
- **Type Roots Loading**: Time spent loading custom type roots from tsconfig.json

Each phase shows:
- **Duration**: Time in milliseconds
- **Percentage**: Percentage of total initialization time
- **Files**: Number of files loaded
- **Bytes**: Total bytes read
- **Cache**: Cache hit/miss statistics

### 2. Top Slowest Files

Lists the 10 slowest files to load, helping you identify specific bottlenecks.

### 3. Optimization Suggestions

Provides actionable recommendations based on the profiling data:

- **⚠ Warning**: Phases taking >40% of initialization time
- **💡 Tip**: Suggestions for caching, parallel loading, or lazy loading

## Optimization Strategies

### Strategy 1: Use Snapshots (Automatic)

The typechecker automatically creates binary snapshots of TypeScript libs after the first run. This reduces initialization time from ~2-3 seconds to ~50-100ms on subsequent runs.

**Location**: Snapshots are stored in `%TEMP%\tscheck-cache\` (Windows) or `/tmp/tscheck-cache/` (Linux/Mac)

**Clear cache** if you upgrade TypeScript:
```powershell
# PowerShell
Remove-Item $env:TEMP\tscheck-cache\*.snapshot
```

### Strategy 2: Enable Parallel Loading

Parallel loading uses multiple worker threads to load files concurrently:

```powershell
$env:TSCHECK_PARALLEL_LOAD="1"
```

**Expected improvement**: 30-50% faster first-run initialization

**Trade-offs**:
- Uses more CPU cores
- May use slightly more memory
- Experimental feature

### Strategy 3: Optimize tsconfig.json

Reduce the number of libs and typeRoots to minimize files loaded:

```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM"],  // Only include what you need
    "typeRoots": ["./typings"]  // Limit type roots
  }
}
```

### Strategy 4: Use Lazy Loading

The typechecker already implements lazy loading for rarely-used globals. If you see warnings about missing globals, they'll be loaded on-demand.

## Environment Variables Reference

| Variable | Values | Description |
|----------|--------|-------------|
| `TSCHECK_PROFILE` | `0` or `1` | Enable detailed performance profiling |
| `TSCHECK_PARALLEL_LOAD` | `0` or `1` | Enable parallel loading of libs and node_modules |
| `TSCHECK_VERBOSE` | `0` or `1` | Show basic load statistics |
| `DEBUG_LIB_LOADING` | `0` or `1` | Show detailed debug info about lib loading |
| `TSCHECK_DISABLE_SNAPSHOTS` | `0` or `1` | Disable snapshot caching (for debugging) |

## Benchmarking Example

Compare sequential vs parallel loading:

```powershell
# Sequential (default)
Measure-Command { .\tscheck.exe check src }

# Parallel
$env:TSCHECK_PARALLEL_LOAD="1"
Measure-Command { .\tscheck.exe check src }
```

## Troubleshooting

### Profiler shows no data

Make sure `TSCHECK_PROFILE=1` is set before running the command.

### Parallel loading causes errors

Parallel loading is experimental. If you encounter issues, disable it:
```powershell
$env:TSCHECK_PARALLEL_LOAD="0"
```

### Cache not working

Check if snapshots exist:
```powershell
# PowerShell
Get-ChildItem $env:TEMP\tscheck-cache\
```

If snapshots are old or corrupted, delete them:
```powershell
Remove-Item $env:TEMP\tscheck-cache\*.snapshot
```

## Performance Targets

| Metric | First Run | Cached Run |
|--------|-----------|------------|
| TypeScript Libs | 800-1200ms | 50-100ms |
| Node Modules | 500-1500ms | 100-300ms |
| Type Roots | 100-500ms | 50-150ms |
| **Total Init** | **1.5-3.5s** | **200-550ms** |

## Advanced: Custom Profiling

To add custom profiling to your own code:

```go
// Start a phase
tc.profiler.StartPhase("My Custom Phase")

// Do work...

// End the phase
tc.profiler.EndPhase("My Custom Phase")

// Record file load metrics
tc.profiler.RecordFileLoad(
    filePath,
    "My Custom Phase",
    duration,
    bytesRead,
    fromCache,
    err,
)
```

## Next Steps

1. Run with `TSCHECK_PROFILE=1` to identify your bottlenecks
2. Try `TSCHECK_PARALLEL_LOAD=1` for faster first-run performance
3. Optimize your `tsconfig.json` to reduce unnecessary file loads
4. Monitor cache effectiveness and clear old snapshots periodically

For more information, see the main README.md.
