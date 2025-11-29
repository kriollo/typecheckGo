package checker

import (
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/modules"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

// NewForWorker creates a new type checker for a worker with an existing module resolver and symbol table
func NewForWorker(resolver *modules.ModuleResolver, symbolTable *symbols.SymbolTable) *TypeChecker {
	globalEnv := types.NewGlobalEnvironment()
	typeCache := make(map[ast.Node]*types.Type)
	varTypeCache := make(map[string]*types.Type)
	inferencer := types.NewTypeInferencer(globalEnv)
	inferencer.SetTypeCache(typeCache)
	inferencer.SetVarTypeCache(varTypeCache)
	destructuringInfer := NewDestructuringInferencer(globalEnv)

	tc := &TypeChecker{
		symbolTable:        symbolTable,
		errors:             []TypeError{},
		moduleResolver:     resolver,
		globalEnv:          globalEnv,
		typeCache:          typeCache,
		config:             getDefaultConfig(),
		varTypeCache:       varTypeCache,
		typeAliasCache:     make(map[string]*types.Type),
		exprCache:          NewTypeExpressionCache(),
		inferencer:         inferencer,
		destructuringInfer: destructuringInfer,
		typeGuards:         make(map[string]bool),
		pkgTypeCache:       NewTypeCache(resolver.GetRootDir()),
		loadStats:          NewLoadStats(),
		loadedLibFiles:     make(map[string]bool),
		profiler:           NewPerformanceProfiler(),
		conversionStack:    make(map[ast.TypeNode]bool),
	}

	// Note: Types are NOT loaded here to avoid redundant I/O in worker threads.
	// Call CopyGlobalTypesFrom() to share types from the main checker.

	return tc
}
