package checker

import (
	"fmt"
	"os"
	"strings"
	"time"

	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/modules"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

// TypeChecker coordinates type checking operations
type TypeChecker struct {
	symbolTable        *symbols.SymbolTable
	errors             []TypeError
	moduleResolver     *modules.ModuleResolver
	currentFile        string
	globalEnv          *types.GlobalEnvironment
	typeCache          map[ast.Node]*types.Type
	varTypeCache       map[string]*types.Type // Cache types by variable name
	typeAliasCache     map[string]*types.Type // Cache for resolved type aliases
	inferencer         *types.TypeInferencer
	destructuringInfer *DestructuringInferencer // Inferencer for destructured parameters
	currentFunction    *ast.FunctionDeclaration // Track current function for return type checking
	config             *CompilerConfig          // Compiler configuration
	typeGuards         map[string]bool          // Track variables under type guards (instanceof Function)
	loadedLibFiles     map[string]bool          // Track loaded lib files to avoid duplicates
	pkgTypeCache       *TypeCache               // Cache for package types
	loadStats          *LoadStats               // Statistics for type loading
	lazyLibMap         map[string]string        // Map of global symbol name -> lib file name
	typescriptLibPath  string                   // Path to TypeScript lib directory
	profiler           *PerformanceProfiler     // Performance profiler for initialization
	conversionStack    map[ast.TypeNode]bool    // Track types being converted to prevent infinite recursion
}

// CompilerConfig holds the compiler options for type checking
type CompilerConfig struct {
	NoImplicitAny                bool
	StrictNullChecks             bool
	StrictFunctionTypes          bool
	NoUnusedLocals               bool
	NoUnusedParameters           bool
	NoImplicitReturns            bool
	NoImplicitThis               bool
	StrictBindCallApply          bool
	StrictPropertyInitialization bool
	AlwaysStrict                 bool
	AllowUnreachableCode         bool
	AllowUnusedLabels            bool
	NoFallthroughCasesInSwitch   bool
	NoUncheckedIndexedAccess     bool
}

// TypeError represents a type checking error
type TypeError struct {
	File     string
	Line     int
	Column   int
	Message  string
	Code     string
	Severity string
}

func (e TypeError) Error() string {
	return fmt.Sprintf("%s:%d:%d - %s (%s)", e.File, e.Line, e.Column, e.Message, e.Code)
}

// New creates a new type checker
func New() *TypeChecker {
	globalEnv := types.NewGlobalEnvironment()
	typeCache := make(map[ast.Node]*types.Type)
	varTypeCache := make(map[string]*types.Type)
	inferencer := types.NewTypeInferencer(globalEnv)
	inferencer.SetTypeCache(typeCache)
	inferencer.SetVarTypeCache(varTypeCache)
	destructuringInfer := NewDestructuringInferencer(globalEnv)

	tc := &TypeChecker{
		symbolTable:        symbols.NewSymbolTable(),
		errors:             []TypeError{},
		globalEnv:          globalEnv,
		typeCache:          typeCache,
		varTypeCache:       varTypeCache,
		typeAliasCache:     make(map[string]*types.Type),
		inferencer:         inferencer,
		destructuringInfer: destructuringInfer,
		config:             getDefaultConfig(),
		typeGuards:         make(map[string]bool),
		loadedLibFiles:     make(map[string]bool),
		loadStats:          &LoadStats{},
		lazyLibMap:         getCommonGlobalMap(),
		profiler:           NewPerformanceProfiler(),
		conversionStack:    make(map[ast.TypeNode]bool),
	}

	return tc
}

// getDefaultConfig returns default compiler configuration
func getDefaultConfig() *CompilerConfig {
	return &CompilerConfig{
		NoImplicitAny:                false,
		StrictNullChecks:             false,
		StrictFunctionTypes:          false,
		NoUnusedLocals:               false,
		NoUnusedParameters:           false,
		NoImplicitReturns:            false,
		NoImplicitThis:               false,
		StrictBindCallApply:          false,
		StrictPropertyInitialization: false,
		AlwaysStrict:                 false,
		AllowUnreachableCode:         true,
		AllowUnusedLabels:            true,
		NoFallthroughCasesInSwitch:   false,
		NoUncheckedIndexedAccess:     false,
	}
}

// NewWithModuleResolver creates a new type checker with module resolution support
func NewWithModuleResolver(rootDir string) *TypeChecker {
	symbolTable := symbols.NewSymbolTable()
	moduleResolver := modules.NewModuleResolver(rootDir, symbolTable)
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
		moduleResolver:     moduleResolver,
		globalEnv:          globalEnv,
		typeCache:          typeCache,
		config:             getDefaultConfig(),
		varTypeCache:       varTypeCache,
		typeAliasCache:     make(map[string]*types.Type),
		inferencer:         inferencer,
		destructuringInfer: destructuringInfer,
		typeGuards:         make(map[string]bool),
		pkgTypeCache:       NewTypeCache(rootDir),
		loadStats:          NewLoadStats(),
		lazyLibMap:         getCommonGlobalMap(),
		profiler:           NewPerformanceProfiler(),
		conversionStack:    make(map[ast.TypeNode]bool),
	}

	// Start profiling if enabled
	if tc.profiler.IsEnabled() {
		tc.profiler.Start()
	}

	// Load types in priority order:
	// 1. node_modules/@types (highest priority - installed type definitions)
	// 2. TypeScript lib files will be loaded when SetLibs is called
	// 3. typeRoots will be loaded when SetTypeRoots is called

	// Load types in priority order:
	// 1. node_modules/@types (highest priority - installed type definitions)
	// 2. TypeScript lib files will be loaded when SetLibs is called
	// 3. typeRoots will be loaded when SetTypeRoots is called

	// Use sequential loading (parallel has race conditions with symbol table)
	if tc.profiler.IsEnabled() {
		tc.profiler.StartPhase("Node Modules Loading")
	}

	tc.loadNodeModulesTypes(rootDir)

	if tc.profiler.IsEnabled() {
		tc.profiler.EndPhase("Node Modules Loading")
	}

	return tc
}

// NewWithSharedModuleResolver creates a new type checker with an existing module resolver
func NewWithSharedModuleResolver(resolver *modules.ModuleResolver) *TypeChecker {
	symbolTable := symbols.NewSymbolTable()
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

// CheckFile checks a single TypeScript file
func (tc *TypeChecker) CheckFile(filename string, file *ast.File) []TypeError {
	// Clear previous errors
	tc.errors = []TypeError{}
	tc.symbolTable.ClearErrors()
	tc.currentFile = filename

	// Check if file is a module (has imports or exports)
	isModule := false
	for _, stmt := range file.Body {
		if _, ok := stmt.(*ast.ImportDeclaration); ok {
			isModule = true
			break
		}
		if _, ok := stmt.(*ast.ExportDeclaration); ok {
			isModule = true
			break
		}
	}

	// If it is a module, create a new scope
	if isModule {
		tc.symbolTable.EnterScope(file)
		defer tc.symbolTable.ExitScope()
	}

	// Create a binder and bind symbols
	binder := symbols.NewBinder(tc.symbolTable)
	binder.SetParameterTypeInferencer(tc.destructuringInfer)
	binder.BindFile(file)

	// Load TypeScript lib files on first check (lazy loading)
	// This ensures standard JavaScript globals like Intl, Promise, etc. are available
	if tc.loadedLibFiles == nil || len(tc.loadedLibFiles) == 0 {
		tc.LoadTypeScriptLibsWithSnapshot([]string{"ES2020", "DOM"})
	}

	// Process imports and add imported symbols to the symbol table
	if tc.moduleResolver != nil {
		tc.processImports(file, filename)
	}

	// Perform additional type checking
	tc.checkFile(file, filename)

	return tc.errors
}

// checkFile performs type checking on a file
func (tc *TypeChecker) checkFile(file *ast.File, filename string) {
	for _, stmt := range file.Body {
		tc.checkStatement(stmt, filename)
	}
}

// Statement checking functions moved to checker_statements.go:
// - checkStatement

// Declaration checking functions moved to checker_declarations.go:
// - checkVariableDeclaration
// - checkFunctionDeclaration

// Statement checking functions moved to checker_statements.go:
// - checkBlockStatement
// - checkReturnStatement
// - checkIfStatement

func (tc *TypeChecker) checkExpression(expr ast.Expression, filename string) {
	if expr == nil {
		return
	}

	switch e := expr.(type) {
	case *ast.Identifier:
		tc.checkIdentifier(e, filename)
	case *ast.Literal:
		// Literals are always valid
		return
	case *ast.CallExpression:
		tc.checkCallExpression(e, filename)
	case *ast.MemberExpression:
		tc.checkMemberExpression(e, filename)
	case *ast.BinaryExpression:
		// Check both operands
		tc.checkExpression(e.Left, filename)
		tc.checkExpression(e.Right, filename)

		// For now, we don't do type checking on binary expressions
		// In a full implementation, we would check if the types are compatible
		// with the operator (e.g., can't add a string and a number without coercion)
	case *ast.ArrayExpression:
		// Check all elements
		for _, elem := range e.Elements {
			tc.checkExpression(elem, filename)
		}
	case *ast.ObjectExpression:
		// Check all property values
		for _, prop := range e.Properties {
			switch p := prop.(type) {
			case *ast.Property:
				tc.checkExpression(p.Value, filename)
			case *ast.SpreadElement:
				tc.checkExpression(p.Argument, filename)
			}
		}
	case *ast.ArrowFunctionExpression:
		tc.checkArrowFunction(e, filename)
	case *ast.FunctionExpression:
		tc.checkFunctionExpression(e, filename)
	case *ast.AssignmentExpression:
		tc.checkAssignmentExpression(e, filename)
	case *ast.UnaryExpression:
		tc.checkUnaryExpression(e, filename)
	case *ast.NewExpression:
		tc.checkNewExpression(e, filename)
	case *ast.ThisExpression:
		// 'this' is valid in class/function context
		return
	case *ast.SuperExpression:
		// 'super' is valid in derived class context
		return
	case *ast.YieldExpression:
		// 'yield' is valid in generator function context
		if e.Argument != nil {
			tc.checkExpression(e.Argument, filename)
		}
		return
	case *ast.ConditionalExpression:
		tc.checkConditionalExpression(e, filename)
	case *ast.SpreadElement:
		tc.checkExpression(e.Argument, filename)
	case *ast.ClassExpression:
		// Class expressions are valid (e.g., const MyClass = class { ... })
		// For now, we don't type-check the class body
		// In a full implementation, we would check class members
		return
	default:
		// Unknown expression type - just a warning, don't block compilation
		fmt.Fprintf(os.Stderr, "Warning: Unknown expression type: %T\n", expr)
	}
}

func (tc *TypeChecker) checkAssignmentExpression(assign *ast.AssignmentExpression, filename string) {
	// Check left side (must be an identifier or member expression)
	tc.checkExpression(assign.Left, filename)

	// Check right side
	tc.checkExpression(assign.Right, filename)

	// Type checking - verify that right is assignable to left (only for simple assignments)
	if assign.Operator == "=" {
		leftType := tc.getExpressionType(assign.Left)

		var rightType *types.Type
		if tc.needsLiteralType(leftType) {
			rightType = tc.inferLiteralType(assign.Right)
		} else {
			rightType = tc.inferencer.InferType(assign.Right)
		}

		// Special case: Allow assigning to new or flexible properties on object literals
		// This handles patterns like: const init = {}; init.body = data;
		if _, ok := assign.Left.(*ast.MemberExpression); ok {
			// If leftType is Any/null/undefined, it means the property doesn't exist yet or is flexible
			// In this case, we allow the assignment without strict type checking
			if leftType.Kind == types.AnyType || leftType.Kind == types.NullType || leftType.Kind == types.UndefinedType {
				return
			}
		}

		// Check if right is assignable to left
		if !tc.isAssignableTo(rightType, leftType) {
			// Build a more descriptive error message
			msg := fmt.Sprintf("Type '%s' is not assignable to type '%s'.", rightType.String(), leftType.String())

			// Add suggestions based on the types
			if leftType.Kind == types.StringType && rightType.Kind == types.NumberType {
				msg += "\n  Sugerencia: Considera convertir el número a string usando .toString() o String()"
			} else if leftType.Kind == types.NumberType && rightType.Kind == types.StringType {
				msg += "\n  Sugerencia: Considera convertir el string a número usando Number() o parseInt()"
			} else if leftType.Kind == types.BooleanType && (rightType.Kind == types.StringType || rightType.Kind == types.NumberType) {
				msg += "\n  Sugerencia: Los valores deben ser explícitamente booleanos (true/false)"
			}

			tc.addError(filename, assign.Right.Pos().Line, assign.Right.Pos().Column, msg, "TS2322", "error")
		}

		// Note: We don't update the type cache here because in TypeScript,
		// a variable's type is fixed at declaration and cannot be changed by assignment
	}
	// For compound assignments (+=, -=, etc.), we skip type checking for now
	// In a full implementation, we would check operator compatibility
}

func (tc *TypeChecker) checkUnaryExpression(unary *ast.UnaryExpression, filename string) {
	// Check the argument
	tc.checkExpression(unary.Argument, filename)

	// TODO: Type checking - verify operator is valid for the argument type
}

func (tc *TypeChecker) checkConditionalExpression(cond *ast.ConditionalExpression, filename string) {
	// Check the test expression (condition)
	if cond.Test != nil {
		tc.checkExpression(cond.Test, filename)
	}

	// Check the consequent expression (true branch)
	if cond.Consequent != nil {
		tc.checkExpression(cond.Consequent, filename)
	}

	// Check the alternate expression (false branch)
	if cond.Alternate != nil {
		tc.checkExpression(cond.Alternate, filename)
	}
}

func (tc *TypeChecker) checkIdentifier(id *ast.Identifier, filename string) {
	// Debug logging
	if os.Getenv("TSCHECK_DEBUG_SCOPE") == "1" && id.Name == "emit" {
		debugFile, err := os.OpenFile("debug_scope.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err == nil {
			fmt.Fprintf(debugFile, "DEBUG: Checking identifier 'emit' at line %d, Current scope level: %d\n",
				id.Pos().Line, tc.symbolTable.Current.Level)
			debugFile.Close()
		}
	}

	// Skip TypeScript keywords that are type-related and not runtime identifiers
	// These keywords are used for type assertions, type guards, etc.
	typeKeywords := []string{"as", "is", "keyof", "typeof", "infer", "readonly"}
	for _, keyword := range typeKeywords {
		if id.Name == keyword {
			return
		}
	}

	// Check if the identifier is defined in the symbol table
	_, exists := tc.symbolTable.ResolveSymbol(id.Name)
	if exists {
		return
	}

	// Debug: log scope information for debugging
	if os.Getenv("TSCHECK_DEBUG_SCOPE") == "1" {
		var symbolNames []string
		for name := range tc.symbolTable.Current.Symbols {
			symbolNames = append(symbolNames, name)
		}
		fmt.Fprintf(os.Stderr, "DEBUG: Cannot find '%s', Current scope level: %d, symbols in current scope: %v\n",
			id.Name, tc.symbolTable.Current.Level, symbolNames)
	}

	// Check if it's a global object or type
	if tc.globalEnv.HasGlobal(id.Name) {
		return
	}

	// Lazy load global symbols if they are known
	tc.ensureGlobalLoaded(id.Name)

	// Retry resolution after loading
	if _, exists := tc.symbolTable.ResolveSymbol(id.Name); exists {
		return
	}
	if tc.globalEnv.HasGlobal(id.Name) {
		return
	}

	// Not found anywhere
	msg := fmt.Sprintf("Cannot find name '%s'.", id.Name)

	// Try to find similar names for suggestions
	similarNames := tc.findSimilarNames(id.Name)
	if len(similarNames) > 0 {
		msg += "\n  Sugerencia: ¿Quisiste decir"
		if len(similarNames) == 1 {
			msg += fmt.Sprintf(" '%s'?", similarNames[0])
		} else {
			msg += " alguno de estos?"
			for i, name := range similarNames {
				if i < 3 { // Show max 3 suggestions
					msg += fmt.Sprintf("\n    • '%s'", name)
				}
			}
		}
	} else {
		msg += "\n  Sugerencia: Verifica que la variable esté declarada antes de usarla"
	}

	tc.addError(filename, id.Pos().Line, id.Pos().Column, msg, "TS2304", "error")
}

func (tc *TypeChecker) checkCallExpression(call *ast.CallExpression, filename string) {
	// Check the callee
	tc.checkExpression(call.Callee, filename)

	// Check all arguments
	for _, arg := range call.Arguments {
		tc.checkExpression(arg, filename)
	}

	// Check if it's a valid function call
	if id, ok := call.Callee.(*ast.Identifier); ok {
		// This check is already done in the symbol table, but we can add more
		// sophisticated type checking here
		if symbol, exists := tc.symbolTable.ResolveSymbol(id.Name); exists {
			// Skip callability check for imported symbols (from ImportDeclaration)
			// These are treated as 'any' type when the module has parse errors
			if importDecl, ok := symbol.Node.(*ast.ImportDeclaration); ok && importDecl != nil {
				// Symbol from import - allow call without validation
				// (module may have parse errors, so we treat exports as 'any')
				return
			}

			// Check if variable is under a type guard (instanceof Function)
			isUnderTypeGuard := tc.typeGuards[id.Name]

			// Skip callability check for parameters - they may have function types
			// that aren't fully inferred without complete type information
			if symbol.Type == symbols.ParameterSymbol {
				return
			}

			// Heuristic: Allow common callback names to be called even if not explicitly typed as functions
			if id.Name == "callback" || id.Name == "cb" || id.Name == "fn" || id.Name == "next" || id.Name == "done" {
				return
			}

			if !symbol.IsFunction && !isUnderTypeGuard {
				// Check if the inferred type is a function or any
				// This handles cases where IsFunction flag wasn't set but type inference knows it's callable
				// (e.g. result of .bind(), or variable with function type)
				symbolType := tc.getExpressionType(call.Callee)
				isCallable := symbolType.Kind == types.FunctionType ||
					symbolType.Kind == types.AnyType ||
					(symbolType.Kind == types.ObjectType && len(symbolType.CallSignatures) > 0)

				if !isCallable {
					msg := fmt.Sprintf("This expression is not callable. Type '%s' has no call signatures.", id.Name)
					msg += "\n  Sugerencia: Verifica que estés llamando a una función y no a una variable"
					tc.addError(filename, call.Pos().Line, call.Pos().Column, msg, "TS2349", "error")
				}
			} else {
				// Check parameter count
				// Skip validation for symbols from .d.ts files (they may have complex overloads)
				if len(symbol.Params) > 0 && !symbol.FromDTS {
					// Count required and total parameters from the AST node
					requiredCount := len(symbol.Params)
					totalCount := len(symbol.Params)
					hasRest := false

					// Try to get parameter info from the AST node
					if funcDecl, ok := symbol.Node.(*ast.FunctionDeclaration); ok && funcDecl != nil {
						requiredCount = 0
						totalCount = len(funcDecl.Params)
						for _, param := range funcDecl.Params {
							if param.Rest {
								hasRest = true
								break
							}
							if !param.Optional {
								requiredCount++
							}
						}
					} else if varDeclarator, ok := symbol.Node.(*ast.VariableDeclarator); ok && varDeclarator != nil {
						// Arrow function assigned to variable
						if arrowFunc, ok := varDeclarator.Init.(*ast.ArrowFunctionExpression); ok && arrowFunc != nil {
							requiredCount = 0
							totalCount = len(arrowFunc.Params)
							for _, param := range arrowFunc.Params {
								if param.Rest {
									hasRest = true
									break
								}
								if !param.Optional {
									requiredCount++
								}
							}
						}
					}

					actualCount := len(call.Arguments)

					// If has rest parameter, only check minimum required
					if hasRest {
						if actualCount < requiredCount {
							msg := fmt.Sprintf("Expected at least %d arguments, but got %d.", requiredCount, actualCount)
							msg += fmt.Sprintf("\n  Sugerencia: La función '%s' requiere al menos %d argumento(s)", id.Name, requiredCount)
							tc.addError(filename, call.Pos().Line, call.Pos().Column, msg, "TS2554", "error")
						}
					} else if actualCount < requiredCount || actualCount > totalCount {
						var msg string
						if actualCount < requiredCount {
							msg = fmt.Sprintf("Expected %d arguments, but got %d.", requiredCount, actualCount)
							msg += fmt.Sprintf("\n  Sugerencia: La función '%s' requiere %d argumento(s)", id.Name, requiredCount)
							if len(symbol.Params) > 0 {
								msg += "\n  Parámetros esperados:"
								for i, param := range symbol.Params {
									if i < 5 { // Show max 5 parameters
										msg += fmt.Sprintf("\n    %d. %s", i+1, param)
									}
								}
							}
						} else {
							msg = fmt.Sprintf("Expected %d arguments, but got %d.", totalCount, actualCount)
							msg += fmt.Sprintf("\n  Sugerencia: La función '%s' solo acepta %d argumento(s)", id.Name, totalCount)
						}
						tc.addError(filename, call.Pos().Line, call.Pos().Column, msg, "TS2554", "error")
					}
				}
			}
		}
	}
}

func (tc *TypeChecker) checkArrowFunction(arrow *ast.ArrowFunctionExpression, filename string) {
	// Check if async arrow function is used without Promise support
	if arrow.Async {
		if !tc.globalEnv.HasGlobal("Promise") {
			tc.addError(filename, arrow.Pos().Line, arrow.Pos().Column,
				"An async function or method in ES5 requires the 'Promise' constructor.  Make sure you have a declaration for the 'Promise' constructor or include 'ES2015' in your '--lib' option.",
				"TS2705", "error")
		}
	}

	// Store parameter types in varTypeCache so they can be resolved in the function body
	for _, param := range arrow.Params {
		if param.ID != nil && param.ParamType != nil {
			// Convert the TypeNode to a Type
			paramType := tc.convertTypeNode(param.ParamType)
			if paramType != nil {
				tc.varTypeCache[param.ID.Name] = paramType
				tc.typeCache[param.ID] = paramType
			}
		}
	}

	// Find the scope for the arrow function that was created by the binder
	arrowScope := tc.findScopeForNode(arrow)
	if arrowScope != nil {
		// Use existing scope - temporarily set it as current
		originalScope := tc.symbolTable.Current
		tc.symbolTable.Current = arrowScope

		// Check the body
		switch body := arrow.Body.(type) {
		case *ast.BlockStatement:
			tc.checkBlockStatement(body, filename)
		case ast.Expression:
			tc.checkExpression(body, filename)
		}

		// Restore original scope
		tc.symbolTable.Current = originalScope
	} else {
		// No scope found - just check the body with current scope
		// The binder should have created a scope, but if it didn't,
		// we can still check the body and rely on scope chain resolution
		switch body := arrow.Body.(type) {
		case *ast.BlockStatement:
			tc.checkBlockStatement(body, filename)
		case ast.Expression:
			tc.checkExpression(body, filename)
		}
	}
}

func (tc *TypeChecker) checkFunctionExpression(fn *ast.FunctionExpression, filename string) {
	// Check if async function is used without Promise support
	if fn.Async {
		if !tc.globalEnv.HasGlobal("Promise") {
			tc.addError(filename, fn.Pos().Line, fn.Pos().Column,
				"An async function or method in ES5 requires the 'Promise' constructor.  Make sure you have a declaration for the 'Promise' constructor or include 'ES2015' in your '--lib' option.",
				"TS2705", "error")
		}
	}

	// Find the scope for the function expression that was created by the binder
	fnScope := tc.findScopeForNode(fn)
	if fnScope != nil {
		// Use existing scope - temporarily set it as current
		originalScope := tc.symbolTable.Current
		tc.symbolTable.Current = fnScope

		// Check the body
		tc.checkBlockStatement(fn.Body, filename)

		// Restore original scope
		tc.symbolTable.Current = originalScope
	} else {
		// No scope found - just check the body with current scope
		tc.checkBlockStatement(fn.Body, filename)
	}
}

func (tc *TypeChecker) checkMemberExpression(member *ast.MemberExpression, filename string) {
	// Check the object
	tc.checkExpression(member.Object, filename)

	// Get the type of the object
	objectType := tc.getExpressionType(member.Object)

	// TODO: Check if trying to access property on unknown type
	// This is disabled for now because it requires proper type inference for:
	// - Promise unwrapping (await expressions)
	// - Function return types
	// - Call expressions
	// Without these, we get too many false positives
	/*
		if objectType.Kind == types.UnknownType {
			if !member.Computed {
				if objId, ok := member.Object.(*ast.Identifier); ok {
					// Check if this is a catch parameter by looking it up in symbol table
					if symbol, exists := tc.symbolTable.ResolveSymbol(objId.Name); exists {
						// Only report TS18046 if it's a variable (likely catch param) with unknown type
						if symbol.Type == symbols.VariableSymbol {
							tc.addError(filename, member.Object.Pos().Line, member.Object.Pos().Column,
								fmt.Sprintf("'%s' is of type 'unknown'.", tc.getObjectName(member.Object)),
								"TS18046", "error")
							return
						}
					}
				}
			}
		}
	*/

	// Check the property
	if !member.Computed {
		// Property is an identifier
		if id, ok := member.Property.(*ast.Identifier); ok {
			// In JavaScript/TypeScript, property names can be any identifier,
			// including reserved keywords (e.g., obj.get(), obj.set(), obj.class)
			// So we don't validate against reserved keywords here.
			// We only check basic identifier syntax (alphanumeric + _ + $)
			if !isValidPropertyName(id.Name) {
				tc.addError(filename, id.Pos().Line, id.Pos().Column,
					fmt.Sprintf("Invalid property name: '%s'", id.Name), "TS1003", "error")
			}

			// Check if property exists on the object type
			if objectType.Kind == types.ObjectType && objectType.Properties != nil {
				if _, exists := objectType.Properties[id.Name]; !exists {
					// Property doesn't exist on this type
					// Only report if the object type is not Any or Unknown
					if objectType.Kind != types.AnyType && objectType.Kind != types.UnknownType {
						tc.addError(filename, id.Pos().Line, id.Pos().Column,
							fmt.Sprintf("Property '%s' does not exist on type '%s'.", id.Name, objectType.String()),
							"TS2339", "error")
					}
				}
			}
		}
	} else {
		// Property is a computed expression
		tc.checkExpression(member.Property, filename)
	}
}

// getObjectName returns a readable name for an expression (for error messages)
// getObjectName recursively constructs the name of an object from an expression.
// This is useful for generating descriptive error messages.
// Currently used in commented code for TS18046 errors, kept for future enhancements.
func (tc *TypeChecker) getObjectName(expr ast.Expression) string {
	switch e := expr.(type) {
	case *ast.Identifier:
		return e.Name
	case *ast.MemberExpression:
		return tc.getObjectName(e.Object) + "." + tc.getObjectName(e.Property)
	default:
		return "object"
	}
}

// findSimilarNames finds variable names similar to the given name
func (tc *TypeChecker) findSimilarNames(name string) []string {
	// Optimization: Don't search for similar names if we already have too many errors
	// This prevents performance degradation when checking files with many errors
	if len(tc.errors) > 50 {
		return nil
	}

	var similar []string

	// Get all symbols in current scope
	if tc.symbolTable.Current != nil {
		for symbolName := range tc.symbolTable.Current.Symbols {
			if levenshteinDistance(name, symbolName) <= 2 {
				similar = append(similar, symbolName)
			}
		}
	}

	// Also check global scope
	if tc.symbolTable.Global != nil && tc.symbolTable.Global != tc.symbolTable.Current {
		for symbolName := range tc.symbolTable.Global.Symbols {
			if levenshteinDistance(name, symbolName) <= 2 {
				// Avoid duplicates
				found := false
				for _, s := range similar {
					if s == symbolName {
						found = true
						break
					}
				}
				if !found {
					similar = append(similar, symbolName)
				}
			}
		}
	}

	return similar
}

// levenshteinDistance calculates the edit distance between two strings
// Optimized to use O(min(len(s1), len(s2))) space
func levenshteinDistance(s1, s2 string) int {
	if len(s1) == 0 {
		return len(s2)
	}
	if len(s2) == 0 {
		return len(s1)
	}

	// Swap to ensure s1 is the shorter string to minimize memory usage
	if len(s1) > len(s2) {
		s1, s2 = s2, s1
	}

	// We only need two rows: current and previous
	// This reduces space complexity from O(M*N) to O(min(M,N))
	v0 := make([]int, len(s2)+1)
	v1 := make([]int, len(s2)+1)

	// Initialize v0
	for i := 0; i <= len(s2); i++ {
		v0[i] = i
	}

	for i := 0; i < len(s1); i++ {
		// Calculate v1 (current row) from v0 (previous row)
		v1[0] = i + 1

		for j := 0; j < len(s2); j++ {
			cost := 1
			if s1[i] == s2[j] {
				cost = 0
			}

			// min(deletion, insertion, substitution)
			min := v1[j] + 1
			if v0[j+1]+1 < min {
				min = v0[j+1] + 1
			}
			if v0[j]+cost < min {
				min = v0[j] + cost
			}

			v1[j+1] = min
		}

		// Copy v1 to v0 for next iteration
		copy(v0, v1)
	}

	return v0[len(s2)]
}

// Helper functions
func (tc *TypeChecker) addError(file string, line, column int, message, code, severity string) {
	err := TypeError{
		File:     file,
		Line:     line,
		Column:   column,
		Message:  message,
		Code:     code,
		Severity: severity,
	}
	tc.errors = append(tc.errors, err)
}

func (tc *TypeChecker) GetErrors() []TypeError {
	return tc.errors
}

func (tc *TypeChecker) GetErrorCount() int {
	return len(tc.errors)
}

func (tc *TypeChecker) HasErrors() bool {
	return len(tc.errors) > 0
}

// GetSymbolTable returns the symbol table for inspection
func (tc *TypeChecker) GetSymbolTable() *symbols.SymbolTable {
	return tc.symbolTable
}

// GetModuleResolver returns the module resolver
func (tc *TypeChecker) GetModuleResolver() *modules.ModuleResolver {
	return tc.moduleResolver
}

// CopyGlobalTypesFrom copies global types and symbols from another TypeChecker.
// This is used to share pre-loaded node_modules types with worker threads
// without re-parsing files.
func (tc *TypeChecker) CopyGlobalTypesFrom(source *TypeChecker) {
	// Copy global environment types (primitives, utility types, etc.)
	for name, typ := range source.globalEnv.Types {
		tc.globalEnv.Types[name] = typ
	}

	// Copy global environment objects (console, Math, Array, etc.)
	for name, obj := range source.globalEnv.Objects {
		tc.globalEnv.Objects[name] = obj
	}

	// Copy global symbols from node_modules and lib files
	// We only copy global scope symbols, not file-specific ones
	if source.symbolTable.Global != nil && tc.symbolTable.Global != nil {
		for name, symbol := range source.symbolTable.Global.Symbols {
			tc.symbolTable.Global.Symbols[name] = symbol
		}
	}

	// Copy loaded lib files tracking
	for path, loaded := range source.loadedLibFiles {
		tc.loadedLibFiles[path] = loaded
	}
}

// Clear releases memory by clearing internal caches.
// Call this after processing a file to prevent memory leaks in long-running processes.
func (tc *TypeChecker) Clear() {
	// Clear type caches
	for k := range tc.typeCache {
		delete(tc.typeCache, k)
	}
	for k := range tc.varTypeCache {
		delete(tc.varTypeCache, k)
	}
	for k := range tc.typeAliasCache {
		delete(tc.typeAliasCache, k)
	}
	for k := range tc.typeGuards {
		delete(tc.typeGuards, k)
	}
	for k := range tc.loadedLibFiles {
		delete(tc.loadedLibFiles, k)
	}
	// Clear errors
	tc.errors = tc.errors[:0]
	// Clear symbol table would require more careful consideration
	// as it may be shared, so we don't clear it here
}

// ClearFileCache clears file-specific caches but preserves loaded libraries.
// This is more efficient when checking multiple files in a batch.
func (tc *TypeChecker) ClearFileCache() {
	// Clear type caches (file-specific)
	for k := range tc.typeCache {
		delete(tc.typeCache, k)
	}
	for k := range tc.varTypeCache {
		delete(tc.varTypeCache, k)
	}
	for k := range tc.typeAliasCache {
		delete(tc.typeAliasCache, k)
	}
	for k := range tc.typeGuards {
		delete(tc.typeGuards, k)
	}
	// Don't clear loadedLibFiles - these can be reused across files
	// Clear errors
	tc.errors = tc.errors[:0]
	// Reset symbol table to clear file-specific scopes
	tc.symbolTable.ResetFileScope()
}

// GetLoadStats returns the type loading statistics
func (tc *TypeChecker) GetLoadStats() *LoadStats {
	if tc.loadStats != nil {
		tc.loadStats.Finish()
	}
	return tc.loadStats
}

// PrintLoadStats prints the type loading statistics if verbose mode is enabled
func (tc *TypeChecker) PrintLoadStats() {
	if tc.loadStats != nil {
		tc.loadStats.Finish()
		fmt.Fprintln(os.Stderr, tc.loadStats.String())
	}
}

// PrintProfileReport prints the detailed performance profile report
func (tc *TypeChecker) PrintProfileReport() {
	if tc.profiler != nil && tc.profiler.IsEnabled() {
		tc.profiler.Finish()
		report := tc.profiler.GenerateReport()
		if report != "" {
			fmt.Fprint(os.Stderr, report)
		}
	}
}

// findScopeForNode finds the scope associated with a given AST node
func (tc *TypeChecker) findScopeForNode(node ast.Node) *symbols.Scope {
	return tc.findScopeInSubtree(tc.symbolTable.Global, node)
}

// findScopeInSubtree recursively searches for a scope associated with the given node
func (tc *TypeChecker) findScopeInSubtree(scope *symbols.Scope, targetNode ast.Node) *symbols.Scope {
	// Check if this scope is associated with the target node
	if scope.Node == targetNode {
		return scope
	}

	// Search in child scopes
	for _, child := range scope.Children {
		if result := tc.findScopeInSubtree(child, targetNode); result != nil {
			return result
		}
	}

	return nil
}

// resolveSymbolFromGlobal searches for a symbol starting from the global scope
// and recursively through all child scopes. This is more robust than relying
// on the Current scope pointer being correctly positioned.
// Note: Currently not used but kept for potential future features requiring exhaustive
// symbol searches (e.g., code completion, refactoring tools, or debugging utilities).
func (tc *TypeChecker) resolveSymbolFromGlobal(name string) (*symbols.Symbol, bool) {
	return tc.resolveSymbolInScopeTree(tc.symbolTable.Global, name)
}

// resolveSymbolInScopeTree recursively searches for a symbol in a scope and its children.
// Unlike ResolveSymbol which searches upward through parent scopes, this searches downward
// through child scopes, making it useful for exhaustive searches.
// Note: Currently not used but kept for future tooling needs.
func (tc *TypeChecker) resolveSymbolInScopeTree(scope *symbols.Scope, name string) (*symbols.Symbol, bool) {
	// Check in current scope
	if symbol, exists := scope.Symbols[name]; exists {
		return symbol, true
	}

	// Search in child scopes
	for _, child := range scope.Children {
		if symbol, exists := tc.resolveSymbolInScopeTree(child, name); exists {
			return symbol, true
		}
	}

	return nil, false
}

// DumpSymbolTable returns a string representation of the symbol table
func (tc *TypeChecker) DumpSymbolTable() string {
	return tc.symbolTable.Dump()
}

// isValidIdentifier checks if a string is a valid JavaScript/TypeScript identifier
func isValidIdentifier(name string) bool {
	if name == "" {
		return false
	}

	// Check if it starts with a letter, underscore, or dollar sign
	firstChar := name[0]
	if !((firstChar >= 'a' && firstChar <= 'z') ||
		(firstChar >= 'A' && firstChar <= 'Z') ||
		firstChar == '_' || firstChar == '$' || firstChar > 127) {
		return false
	}

	// Check remaining characters
	for i := 1; i < len(name); i++ {
		char := name[i]
		if !((char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') ||
			char == '_' || char == '$' || char > 127) {
			return false
		}
	}

	// Check if it's a reserved keyword
	return !isReservedKeyword(name)
}

func isValidPropertyName(name string) bool {
	if name == "" {
		return false
	}

	// Property names can be any valid identifier, including reserved keywords
	// (e.g., obj.get(), obj.set(), obj.class, obj.if are all valid)
	// We only check basic syntax
	firstChar := name[0]
	if !((firstChar >= 'a' && firstChar <= 'z') ||
		(firstChar >= 'A' && firstChar <= 'Z') ||
		firstChar == '_' || firstChar == '$' || firstChar > 127) {
		return false
	}

	// Check remaining characters
	for i := 1; i < len(name); i++ {
		char := name[i]
		if !((char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') ||
			char == '_' || char == '$' || char > 127) {
			return false
		}
	}

	// Don't check against reserved keywords for property names
	return true
}

// isReservedKeyword checks if a string is a JavaScript/TypeScript reserved keyword
func isReservedKeyword(name string) bool {
	// Only include keywords that are ALWAYS reserved, not contextual keywords
	// Contextual keywords like 'from', 'of', 'get', 'set', 'async', 'await' are valid as variable names
	keywords := []string{
		"break", "case", "catch", "class", "const", "continue", "debugger",
		"default", "delete", "do", "else", "export", "extends", "finally",
		"for", "function", "if", "import", "in", "instanceof", "let",
		"new", "return", "super", "switch", "this", "throw", "try",
		"typeof", "var", "void", "while", "with", "yield", "enum",
		"implements", "interface", "package", "private", "protected",
		"public", "static",
	}

	for _, keyword := range keywords {
		if name == keyword {
			return true
		}
	}

	return false
}

// FormatErrors formats errors for output
func (tc *TypeChecker) FormatErrors(format string) string {
	if len(tc.errors) == 0 {
		return "No errors found"
	}

	var result strings.Builder

	switch format {
	case "json":
		result.WriteString("[\n")
		for i, err := range tc.errors {
			if i > 0 {
				result.WriteString(",\n")
			}
			result.WriteString("  {\n")
			fmt.Fprintf(&result, "    \"file\": \"%s\",\n", err.File)
			fmt.Fprintf(&result, "    \"line\": %d,\n", err.Line)
			fmt.Fprintf(&result, "    \"column\": %d,\n", err.Column)
			fmt.Fprintf(&result, "    \"message\": \"%s\",\n", err.Message)
			fmt.Fprintf(&result, "    \"code\": \"%s\",\n", err.Code)
			fmt.Fprintf(&result, "    \"severity\": \"%s\"\n", err.Severity)
			result.WriteString("  }")
		}
		result.WriteString("\n]\n")

	case "toon":
		result.WriteString("diags[" + fmt.Sprintf("%d", len(tc.errors)) + "]{file,line,col,msg,code,severity}:\n")
		for _, err := range tc.errors {
			result.WriteString(fmt.Sprintf("  %s,%d,%d,%s,%s,%s\n",
				err.File, err.Line, err.Column, err.Message, err.Code, err.Severity))
		}

	default: // text
		for _, err := range tc.errors {
			result.WriteString(fmt.Sprintf("%s\n", err.Error()))
		}
	}

	return result.String()
}

// processImports processes all imports in a file and adds imported symbols to the symbol table
func (tc *TypeChecker) processImports(file *ast.File, filename string) {
	// Optimization: Load the current module once instead of for each import
	// This avoids re-parsing the same file multiple times
	var currentModule *modules.ResolvedModule
	var moduleErr error

	// Only load if we have imports to process
	hasImports := false
	for _, stmt := range file.Body {
		if _, ok := stmt.(*ast.ImportDeclaration); ok {
			hasImports = true
			break
		}
	}

	if !hasImports {
		return
	}

	// Load current module once (with caching)
	currentModule, moduleErr = tc.moduleResolver.LoadModule(filename, filename)
	if moduleErr != nil {
		// If we can't load the current module, skip all imports
		return
	}

	// Process each import using the cached current module
	for _, stmt := range file.Body {
		if importDecl, ok := stmt.(*ast.ImportDeclaration); ok {
			tc.processImportWithModule(importDecl, filename, currentModule)
		}
	}
}

// processImportWithModule processes a single import declaration with a pre-loaded current module
func (tc *TypeChecker) processImportWithModule(importDecl *ast.ImportDeclaration, filename string, currentModule *modules.ResolvedModule) {
	if importDecl.Source == nil {
		return
	}

	sourceStr, ok := importDecl.Source.Value.(string)
	if !ok || sourceStr == "" {
		return
	}

	// Use the pre-loaded current module instead of loading it again
	// This is a critical optimization that prevents re-parsing the same file multiple times

	importResolver := modules.NewImportResolver(tc.moduleResolver, currentModule)
	importedSymbols, err := importResolver.ResolveImport(importDecl)
	if err != nil {
		// Error will be reported during checkImportDeclaration
		return
	}

	// Add imported symbols to the current scope
	for name, symbol := range importedSymbols {
		// Define the imported symbol in the current scope
		newSymbol := tc.symbolTable.DefineSymbol(name, symbol.Type, symbol.Node, false)
		newSymbol.IsFunction = symbol.IsFunction
		newSymbol.Params = symbol.Params

		// If this is a type alias or interface, resolve its definition and cache it
		if (symbol.Type == symbols.TypeAliasSymbol || symbol.Type == symbols.InterfaceSymbol) && symbol.Node != nil {
			if symbol.ResolvedType != nil {
				tc.typeAliasCache[name] = symbol.ResolvedType
			} else {
				if typeAliasDecl, ok := symbol.Node.(*ast.TypeAliasDeclaration); ok {
					// Resolve the type annotation
					resolvedType := tc.convertTypeNode(typeAliasDecl.TypeAnnotation)
					// Cache the resolved type so it can be found when referenced
					tc.typeAliasCache[name] = resolvedType
					if symbol.UpdateCache != nil {
						symbol.UpdateCache(resolvedType)
					}
				} else if _, ok := symbol.Node.(*ast.InterfaceDeclaration); ok {
					// For interfaces, create an object type placeholder
					// In a full implementation, we would parse the interface body
					objType := types.NewObjectType(name, nil)
					tc.typeAliasCache[name] = objType
					if symbol.UpdateCache != nil {
						symbol.UpdateCache(objType)
					}
				}
			}
		}

		// If this is a variable (could be a function), infer its type and cache it
		if symbol.Type == symbols.VariableSymbol && symbol.Node != nil {
			if symbol.ResolvedType != nil {
				tc.varTypeCache[name] = symbol.ResolvedType
			} else {
				// The node might be a VariableDeclaration (export const useXlsx = ...)
				// We need to find the specific VariableDeclarator for this name
				if varDecl, ok := symbol.Node.(*ast.VariableDeclaration); ok {
					// Find the declarator with the matching name
					for _, declarator := range varDecl.Decls {
						if declarator.ID != nil && declarator.ID.Name == name {
							// Found the right declarator, infer its type
							if declarator.Init != nil {
								inferredType := tc.inferencer.InferType(declarator.Init)
								// Store in varTypeCache so it can be used when calling the function
								tc.varTypeCache[name] = inferredType
								if symbol.UpdateCache != nil {
									symbol.UpdateCache(inferredType)
								}
							}
							break
						}
					}
				}
			}
		}
	}
}

// processImport processes a single import declaration (legacy method, kept for compatibility)
// This method loads the current module each time, which is less efficient.
// Use processImportWithModule when possible.
func (tc *TypeChecker) processImport(importDecl *ast.ImportDeclaration, filename string) {
	if importDecl.Source == nil {
		return
	}

	sourceStr, ok := importDecl.Source.Value.(string)
	if !ok || sourceStr == "" {
		return
	}

	// Load the current module (the file being checked)
	currentModule, err := tc.moduleResolver.LoadModule(filename, filename)
	if err != nil {
		// If we can't load the current module, skip
		return
	}

	// Delegate to the optimized version
	tc.processImportWithModule(importDecl, filename, currentModule)
}

// Statement checking functions moved to checker_statements.go:
// - checkForStatement
// - checkWhileStatement
// - checkSwitchStatement
// - checkTryStatement
// - checkThrowStatement
// - checkBreakStatement
// - checkContinueStatement

// Declaration checking functions moved to checker_declarations.go:
// - checkImportDeclaration

// getExpressionType gets the type of an expression
func (tc *TypeChecker) getExpressionType(expr ast.Expression) *types.Type {
	// For identifiers, look up by name first
	if id, ok := expr.(*ast.Identifier); ok {
		// Check the variable type cache first
		if cachedType, ok := tc.varTypeCache[id.Name]; ok {
			return cachedType
		}

		// Check if it's a global
		if globalType, exists := tc.globalEnv.GetObject(id.Name); exists {
			return globalType
		}

		// If not in cache, try to infer from the symbol table
		if symbol, exists := tc.symbolTable.ResolveSymbol(id.Name); exists {
			// Check if we have a cached type for the symbol's declaration
			if symbol.Node != nil {
				// Try to get the type from the declarator
				if declarator, ok := symbol.Node.(*ast.VariableDeclarator); ok {
					// If the declarator has an initializer, infer from it
					if declarator.Init != nil {
						inferredType := tc.inferencer.InferType(declarator.Init)
						if inferredType.Kind == types.ConditionalType {
							inferredType = tc.evaluateConditionalType(inferredType)
						}
						tc.typeCache[declarator] = inferredType
						tc.typeCache[declarator.ID] = inferredType
						tc.varTypeCache[id.Name] = inferredType
						return inferredType
					}
				}
			}
		}
		// If we couldn't find a type, return any (to avoid false positives)
		return types.Any
	}

	// For member expressions, resolve the property type
	if member, ok := expr.(*ast.MemberExpression); ok {
		objectType := tc.getExpressionType(member.Object)

		// If object is an ObjectType, try to get the property type
		if objectType.Kind == types.ObjectType && objectType.Properties != nil {
			if !member.Computed {
				if propId, ok := member.Property.(*ast.Identifier); ok {
					if propType, exists := objectType.Properties[propId.Name]; exists {
						return propType
					}
				}
			} else {
				// For computed properties, return Any for now
				return types.Any
			}
		}

		// If we can't resolve it, return Any (to avoid false positives)
		return types.Any
	}

	// Check if we have a cached type for this expression
	if cachedType, ok := tc.typeCache[expr]; ok {
		return cachedType
	}

	// Otherwise, infer the type
	inferredType := tc.inferencer.InferType(expr)
	if inferredType.Kind == types.ConditionalType {
		inferredType = tc.evaluateConditionalType(inferredType)
	}
	tc.typeCache[expr] = inferredType
	return inferredType
}

// isAssignableTo checks if sourceType can be assigned to targetType
func (tc *TypeChecker) isAssignableTo(sourceType, targetType *types.Type) bool {
	// Any is assignable to and from anything
	if targetType.Kind == types.AnyType || sourceType.Kind == types.AnyType {
		return true
	}

	// Unknown is the top type: anything is assignable TO unknown
	if targetType.Kind == types.UnknownType {
		return true
	}

	// IntersectionType: source debe ser asignable a todos los miembros
	if targetType.Kind == types.IntersectionType {
		for _, member := range targetType.Types {
			// Si ambos son objetos, usar comprobación estructural
			if sourceType.Kind == types.ObjectType && member.Kind == types.ObjectType {
				if !tc.isObjectAssignable(sourceType, member) {
					return false
				}
			} else {
				if !tc.isAssignableTo(sourceType, member) {
					return false
				}
			}
		}
		return true
	}

	// Unknown is assignable to anything except never
	if sourceType.Kind == types.UnknownType {
		return targetType.Kind != types.NeverType
	}

	// Nothing is assignable to never except never itself
	if targetType.Kind == types.NeverType {
		return sourceType.Kind == types.NeverType
	}

	// Special case: if target is an unresolved named object type (imported type without properties),
	// accept any object type as compatible
	if targetType.Kind == types.ObjectType && targetType.Name != "" {
		// If target has no properties defined, it's likely an unresolved imported type
		// Accept any object type (including arrays and functions) as compatible
		if len(targetType.Properties) == 0 && len(targetType.CallSignatures) == 0 {
			if sourceType.Kind == types.ObjectType || sourceType.Kind == types.ArrayType || sourceType.Kind == types.FunctionType {
				return true
			}
		}
	}

	// Exact type match
	if sourceType.Kind == targetType.Kind {
		// For object types, check structural compatibility
		if sourceType.Kind == types.ObjectType {
			return tc.isObjectAssignable(sourceType, targetType)
		}
		// Para tuplas, comparar elemento a elemento
		if sourceType.Kind == types.TupleType {
			if len(sourceType.Types) != len(targetType.Types) {
				return false
			}
			for i := range sourceType.Types {
				if !tc.isAssignableTo(sourceType.Types[i], targetType.Types[i]) {
					return false
				}
			}
			return true
		}
		return true
	}

	// Undefined and null are assignable to each other (in non-strict mode)
	if (sourceType.Kind == types.UndefinedType && targetType.Kind == types.NullType) ||
		(sourceType.Kind == types.NullType && targetType.Kind == types.UndefinedType) {
		return true
	}

	// Check if tuple is assignable to array
	// A tuple [T1, T2, ...] is assignable to U[] if all Ti are assignable to U
	if sourceType.Kind == types.TupleType && targetType.Kind == types.ArrayType {
		if targetType.ElementType != nil && len(sourceType.Types) > 0 {
			for _, elemType := range sourceType.Types {
				if !tc.isAssignableTo(elemType, targetType.ElementType) {
					return false
				}
			}
			return true
		}
	}

	// Check if function is assignable to interface with call signature
	// Example: (x: number) => string is assignable to interface Callable { (x: number): string }
	if sourceType.Kind == types.FunctionType && targetType.Kind == types.ObjectType {
		if len(targetType.CallSignatures) > 0 {
			// The target is a callable interface (has call signatures)
			// A function is assignable to any callable interface
			// In a full implementation, we would check parameter and return type compatibility
			return true
		}
	}

	// Check array types
	if sourceType.Kind == types.ArrayType && targetType.Kind == types.ArrayType {
		if sourceType.ElementType != nil && targetType.ElementType != nil {
			return tc.isAssignableTo(sourceType.ElementType, targetType.ElementType)
		}
	}

	// Check function types
	if sourceType.Kind == types.FunctionType && targetType.Kind == types.FunctionType {
		// Simplified function compatibility check
		// In a full implementation, we would check parameter and return types
		return true
	}

	// Check union types - source can be assigned to union if it matches any member
	if targetType.Kind == types.UnionType {
		for _, member := range targetType.Types {
			if tc.isAssignableTo(sourceType, member) {
				return true
			}
		}
		return false
	}

	// Check literal types
	if sourceType.Kind == types.LiteralType && targetType.Kind == types.LiteralType {
		// Literal types are equal if their values are equal
		return sourceType.Value == targetType.Value
	}

	// Literal type can be assigned to its base type (e.g., "hello" to string, 42 to number)
	if sourceType.Kind == types.LiteralType {
		switch sourceType.Value.(type) {
		case string:
			// Check for BigInt literal (e.g., "100n")
			if str, ok := sourceType.Value.(string); ok && strings.HasSuffix(str, "n") {
				// Verify it contains only digits before 'n'
				isBigInt := true
				for _, ch := range str[:len(str)-1] {
					if ch < '0' || ch > '9' {
						isBigInt = false
						break
					}
				}
				if isBigInt {
					return targetType.Kind == types.BigIntType
				}
			}
			return targetType.Kind == types.StringType
		case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
			return targetType.Kind == types.NumberType
		case bool:
			return targetType.Kind == types.BooleanType
		}
	}

	return false
}

// needsLiteralType checks if a target type expects literal types (e.g., union of literals)
func (tc *TypeChecker) needsLiteralType(targetType *types.Type) bool {
	if targetType.Kind == types.LiteralType {
		return true
	}
	if targetType.Kind == types.UnionType {
		// Check if any member is a literal type
		for _, member := range targetType.Types {
			if member.Kind == types.LiteralType {
				return true
			}
		}
	}
	return false
}

// inferLiteralType infers a literal type from an expression if it's a literal
func (tc *TypeChecker) inferLiteralType(expr ast.Expression) *types.Type {
	if lit, ok := expr.(*ast.Literal); ok {
		if lit.Value != nil {
			return types.NewLiteralType(lit.Value)
		}
	}
	// If not a literal, fall back to normal inference
	return tc.inferencer.InferType(expr)
}

// isPropertyOptional checks if a property type is optional (i.e., a union with undefined)
func (tc *TypeChecker) isPropertyOptional(propType *types.Type) bool {
	if propType.Kind == types.UnionType {
		// Check if undefined is one of the union members
		for _, member := range propType.Types {
			if member.Kind == types.UndefinedType {
				return true
			}
		}
	}
	return false
}

// isObjectAssignable checks if a source object type is assignable to a target object type
// This implements structural typing for objects
func (tc *TypeChecker) isObjectAssignable(sourceType, targetType *types.Type) bool {

	// If target has no properties defined (e.g., it's a named type without resolution),
	// we accept any object type as compatible
	if len(targetType.Properties) == 0 {
		return sourceType.Kind == types.ObjectType
	}

	// If source has no properties, it can't satisfy a target with required properties
	if len(sourceType.Properties) == 0 {
		return len(targetType.Properties) == 0
	}

	// Check that source has all required properties of target
	for propName, targetPropType := range targetType.Properties {
		sourcePropType, exists := sourceType.Properties[propName]
		if !exists {
			// Check if the target property is optional (union with undefined)
			if tc.isPropertyOptional(targetPropType) {
				// Optional property can be omitted
				continue
			}
			// Required property missing in source
			return false
		}

		// Check if the property types are compatible
		if !tc.isAssignableTo(sourcePropType, targetPropType) {
			return false
		}
	}

	// All required properties are present and compatible
	return true
}

// Declaration checking functions moved to checker_declarations.go:
// - checkExportDeclaration
// - checkTypeAliasDeclaration
// - checkInterfaceDeclaration
// - checkClassDeclaration
// - checkEnumDeclaration

// SetConfig configures the type checker with compiler options
func (tc *TypeChecker) SetConfig(config *CompilerConfig) {
	tc.config = config
}

// SetConfigFromTSConfig configures the type checker from a tsconfig.json structure
func (tc *TypeChecker) SetConfigFromTSConfig(tsconfig interface{}) {
	// This method accepts interface{} to avoid circular imports
	// The actual TSConfig struct should be passed from the caller
	// For now, we'll use reflection or type assertion if needed
	tc.config = getDefaultConfig()
}

// SetLibs reconfigures the global environment based on library configuration
func (tc *TypeChecker) SetLibs(libs []string) {
	tc.globalEnv = types.NewGlobalEnvironmentWithLibs(libs)
	// Update inferencer with new global environment
	tc.inferencer = types.NewTypeInferencer(tc.globalEnv)
	tc.inferencer.SetTypeCache(tc.typeCache)
	tc.inferencer.SetVarTypeCache(tc.varTypeCache)

	// Load TypeScript lib files (lib.dom.d.ts, lib.es2020.d.ts, etc.)
	startTime := time.Now()
	tc.LoadTypeScriptLibsWithSnapshot(libs)
	tc.loadStats.TypeScriptLibsTime = time.Since(startTime)
}

// Functions moved to checker_libs.go:
// - loadTypeScriptLibs
// - loadLibFile
// - loadLibReferences

// SetPathAliases configures path aliases from tsconfig for module resolution
// Functions moved to checker_libs.go:
// - SetPathAliases
// - SetTypeRoots
// - loadNodeModulesTypes
// - loadTypesPackages
// - loadBundledTypes

// loadScopedPackages loads packages from a scoped directory like @vue, @angular
// Functions moved to checker_libs.go:
// - loadScopedPackages
// - getPackageTypesFile
// - loadPackageWithCache
// - loadGlobalTypesFromRoots
// - loadDeclarationFiles
// - loadPackageTypes

// extractInterfacesFromFile extracts interface and type declarations from a .d.ts file (Pass 1)
// Functions moved to checker_libs.go:
// - extractInterfacesFromFile
// - extractVariablesFromFile
// - extractInterfacesUsingPatterns
// - extractVariablesUsingPatterns
// - extractTypeAliasFromLine
// - extractGlobalDeclarationFromLine
// - extractTypeFromDeclaration
// - isTypeCallable
// - checkIfTypeIsCallable

// GetConfig returns the current compiler configuration
func (tc *TypeChecker) GetConfig() *CompilerConfig {
	if tc.config == nil {
		tc.config = getDefaultConfig()
	}
	return tc.config
}

func (tc *TypeChecker) checkNewExpression(expr *ast.NewExpression, filename string) {
	// Check the constructor (callee)
	tc.checkExpression(expr.Callee, filename)

	// Check all arguments
	for _, arg := range expr.Arguments {
		tc.checkExpression(arg, filename)
	}

	// TODO: Verify that the callee is actually a class/constructor
	// TODO: Check argument types against constructor signature
}

// convertTypeNode converts an AST TypeNode to a types.Type
func (tc *TypeChecker) convertTypeNode(typeNode ast.TypeNode) *types.Type {
	if typeNode == nil {
		return types.Unknown
	}

	// Prevent infinite recursion for recursive types
	if tc.conversionStack[typeNode] {
		// We're already converting this type node, return a placeholder
		// This handles recursive types like: type JSONValue = ... | JSONValue[]
		return types.Any
	}

	// Mark this type as being converted
	tc.conversionStack[typeNode] = true
	defer func() {
		// Clean up after conversion
		delete(tc.conversionStack, typeNode)
	}()

	switch t := typeNode.(type) {
	case *ast.TupleType:
		// Convierte cada elemento en su tipo correspondiente
		elementTypes := make([]*types.Type, len(t.Elements))
		for i, elem := range t.Elements {
			elementTypes[i] = tc.convertTypeNode(elem)
		}
		return &types.Type{Kind: types.TupleType, Types: elementTypes}
	case *ast.TypeReference:
		// Handle array types: Breadcrumb[] is parsed as TypeReference{Name: "(array)", TypeArguments: [Breadcrumb]}
		if t.Name == "(array)" && len(t.TypeArguments) == 1 {
			elementType := tc.convertTypeNode(t.TypeArguments[0])
			return types.NewArrayType(elementType)
		}

		// Handle keyof operator (parsed as TypeReference with name starting with "keyof ")
		if strings.HasPrefix(t.Name, "keyof ") {
			typeName := strings.TrimPrefix(t.Name, "keyof ")
			if symbol, exists := tc.symbolTable.ResolveSymbol(typeName); exists {
				if symbol.Type == symbols.InterfaceSymbol && symbol.Node != nil {
					if interfaceDecl, ok := symbol.Node.(*ast.InterfaceDeclaration); ok {
						// Create a union of string literals for each property key
						var unionTypes []*types.Type
						for _, member := range interfaceDecl.Members {
							if prop, ok := member.(ast.InterfaceProperty); ok {
								unionTypes = append(unionTypes, types.NewLiteralType(prop.Key.Name))
							}
						}
						if len(unionTypes) > 0 {
							return types.NewUnionType(unionTypes)
						}
					}
				}
			}
			// Fallback if resolution fails
			return types.String
		}

		// First, check if we have this type cached (for imported types)
		// Only use cache for non-generic references (no type arguments)
		if len(t.TypeArguments) == 0 {
			if resolvedType, ok := tc.typeAliasCache[t.Name]; ok {
				return resolvedType
			}

			// Handle basic type references
			switch t.Name {
			case "string":
				return types.String
			case "number":
				return types.Number
			case "boolean":
				return types.Boolean
			case "bigint":
				return types.BigInt
			case "any":
				return types.Any
			case "unknown":
				return types.Unknown
			case "void":
				return types.Void
			case "never":
				return types.Never
			case "null":
				return types.Null
			case "undefined":
				return types.Undefined
			case "Array":
				// Handle Array<T> generic type
				if len(t.TypeArguments) == 1 {
					elementType := tc.convertTypeNode(t.TypeArguments[0])
					return types.NewArrayType(elementType)
				}
				// Array without type argument defaults to any[]
				return types.NewArrayType(types.Any)
			}
		}

		// Lazy load if needed
		tc.ensureGlobalLoaded(t.Name)

		// Handle generic type alias instantiation (when TypeArguments are present)
		if len(t.TypeArguments) > 0 {
			if symbol, exists := tc.symbolTable.ResolveSymbol(t.Name); exists {
				if symbol.Type == symbols.TypeAliasSymbol {
					if symbol.Node == nil {
						return types.Any
					}
					aliasDecl := symbol.Node.(*ast.TypeAliasDeclaration)

					// Create substitution map
					substitutions := make(map[string]*types.Type)
					for i, param := range aliasDecl.TypeParameters {
						if i < len(t.TypeArguments) {
							argType := tc.convertTypeNode(t.TypeArguments[i])
							if typeParam, ok := param.(*ast.TypeParameter); ok {
								substitutions[typeParam.Name.Name] = argType
							} else if typeRef, ok := param.(*ast.TypeReference); ok {
								substitutions[typeRef.Name] = argType
							}
						}
					}

					// Substitute in the alias's type annotation
					annotationType := tc.convertTypeNode(aliasDecl.TypeAnnotation)
					resolvedType := tc.substituteType(annotationType, substitutions)

					// Preserve the alias name by wrapping in an ObjectType
					// This ensures "Tuple<[boolean]>" shows as "Tuple" not "tuple"
					if resolvedType.Kind == types.TupleType {
						// For tuple types, we need to preserve the name
						resolvedType.Name = t.Name
						return resolvedType
					}

					// Evaluate if it's a conditional type
					if resolvedType.Kind == types.ConditionalType {
						return tc.evaluateConditionalType(resolvedType)
					}
					return resolvedType
				} else if symbol.Type == symbols.InterfaceSymbol {
					if symbol.Node == nil {
						return types.Any
					}
					interfaceDecl := symbol.Node.(*ast.InterfaceDeclaration)

					// Convert interface members
					properties := make(map[string]*types.Type)
					var callSignatures []*types.Type

					for _, member := range interfaceDecl.Members {
						switch m := member.(type) {
						case ast.InterfaceProperty:
							propName := m.Key.Name
							propType := tc.convertTypeNode(m.Value)
							properties[propName] = propType
						case *ast.CallSignature:
							// Convert call signature to FunctionType
							params := make([]*types.Type, len(m.Parameters))
							for i := range m.Parameters {
								params[i] = types.Any
							}
							returnType := tc.convertTypeNode(m.ReturnType)
							callSignatures = append(callSignatures, types.NewFunctionType(params, returnType))
						}
					}

					objType := types.NewObjectType(t.Name, properties)
					objType.CallSignatures = callSignatures
					return objType
				}
			}
		}

		// For other type references without type arguments, check if it's an interface
		// and convert its members (including call signatures)
		if symbol, exists := tc.symbolTable.ResolveSymbol(t.Name); exists {
			if symbol.Type == symbols.InterfaceSymbol {
				if symbol.Node != nil {
					if interfaceDecl, ok := symbol.Node.(*ast.InterfaceDeclaration); ok {

						// Convert interface members
						properties := make(map[string]*types.Type)
						var callSignatures []*types.Type

						for _, member := range interfaceDecl.Members {
							switch m := member.(type) {
							case ast.InterfaceProperty:
								propName := m.Key.Name
								propType := tc.convertTypeNode(m.Value)
								properties[propName] = propType
							case *ast.CallSignature:
								// Convert call signature to FunctionType
								params := make([]*types.Type, len(m.Parameters))
								for i := range m.Parameters {
									params[i] = types.Any
								}
								returnType := tc.convertTypeNode(m.ReturnType)
								callSignatures = append(callSignatures, types.NewFunctionType(params, returnType))
							}
						}

						objType := types.NewObjectType(t.Name, properties)
						objType.CallSignatures = callSignatures
						return objType
					}
				}
			}
		}

		// For other type references without type arguments, create a basic object type
		return types.NewObjectType(t.Name, nil)

	case *ast.ConditionalType:
		checkType := tc.convertTypeNode(t.CheckType)
		var extendsType *types.Type
		var inferredType *types.Type

		if t.InferredType != nil {
			// This is an infer conditional type: T extends infer U ? U : never
			inferredType = types.NewTypeParameter(t.InferredType.Name, nil, nil)
		} else {
			extendsType = tc.convertTypeNode(t.ExtendsType)
		}

		trueType := tc.convertTypeNode(t.TrueType)
		falseType := tc.convertTypeNode(t.FalseType)

		if t.InferredType != nil {
			return types.NewConditionalTypeWithInfer(checkType, inferredType, trueType, falseType)
		}
		return types.NewConditionalType(checkType, extendsType, trueType, falseType)

	case *ast.UnionType:
		var unionTypes []*types.Type
		for _, typ := range t.Types {
			unionTypes = append(unionTypes, tc.convertTypeNode(typ))
		}
		return types.NewUnionType(unionTypes)

	case *ast.IntersectionType:
		var intersectionTypes []*types.Type
		for _, typ := range t.Types {
			intersectionTypes = append(intersectionTypes, tc.convertTypeNode(typ))
		}
		return types.NewIntersectionType(intersectionTypes)

	case *ast.RestType:
		elemType := tc.convertTypeNode(t.TypeAnnotation)
		return types.NewRestType(elemType)

	case *ast.LiteralType:
		return types.NewLiteralType(t.Value)

	case *ast.TypeParameter:
		return types.NewTypeParameter(t.Name.Name, nil, nil)

	case *ast.ObjectTypeLiteral:
		// Convert object type literal to Type
		properties := make(map[string]*types.Type)
		for _, member := range t.Members {
			// TypeMember is an interface, need to type assert to InterfaceProperty
			if prop, ok := member.(ast.InterfaceProperty); ok {
				propType := tc.convertTypeNode(prop.Value)
				// If the member is optional, wrap it in a union with undefined
				if prop.Optional {
					propType = types.NewUnionType([]*types.Type{propType, types.Undefined})
				}
				properties[prop.Key.Name] = propType
			}
		}
		return types.NewObjectType("", properties)

	default:
		return types.Unknown
	}
}

// evaluateConditionalType evaluates a conditional type and returns the resolved type
func (tc *TypeChecker) evaluateConditionalType(condType *types.Type) *types.Type {
	if condType.Kind != types.ConditionalType {
		return condType
	}

	if condType.InferredType != nil {
		// T extends infer U ? X : Y
		var inferredType *types.Type

		// Handle T extends (infer U)[]
		if condType.CheckType.Kind == types.ArrayType {
			inferredType = condType.CheckType.ElementType
		} else if condType.CheckType.Kind == types.FunctionType { // Handle T extends (...args: any[]) => infer R
			inferredType = condType.CheckType.ReturnType
		}

		if inferredType != nil {
			// Substitute the inferred type into the true type
			substitutions := map[string]*types.Type{
				condType.InferredType.Name: inferredType,
			}
			return tc.substituteType(condType.TrueType, substitutions)
		}

		return condType.FalseType
	}

	// For regular conditional types: T extends U ? X : Y
	// Check if CheckType is assignable to ExtendsType
	if condType.CheckType.IsAssignableTo(condType.ExtendsType) {
		return condType.TrueType
	}
	return condType.FalseType
}

// substituteType recursively substitutes type parameters in a given type.
func (tc *TypeChecker) substituteType(t *types.Type, substitutions map[string]*types.Type) *types.Type {
	if t == nil {
		return nil
	}

	if t.Kind == types.TypeParameterType {
		if substitution, ok := substitutions[t.Name]; ok {
			return substitution
		}
	}

	// Handle ObjectType that might be a type parameter placeholder
	// convertTypeNode converts unresolved references to ObjectType with the name
	if t.Kind == types.ObjectType && len(t.Properties) == 0 {
		if substitution, ok := substitutions[t.Name]; ok {
			return substitution
		}
	}

	switch t.Kind {
	case types.ArrayType:
		return types.NewArrayType(tc.substituteType(t.ElementType, substitutions))
	case types.FunctionType:
		params := make([]*types.Type, len(t.Parameters))
		for i, p := range t.Parameters {
			params[i] = tc.substituteType(p, substitutions)
		}
		returnType := tc.substituteType(t.ReturnType, substitutions)
		return types.NewFunctionType(params, returnType)
	case types.UnionType:
		unionTypes := make([]*types.Type, len(t.Types))
		for i, ut := range t.Types {
			unionTypes[i] = tc.substituteType(ut, substitutions)
		}
		return types.NewUnionType(unionTypes)
	case types.IntersectionType:
		intersectionTypes := make([]*types.Type, len(t.Types))
		for i, it := range t.Types {
			intersectionTypes[i] = tc.substituteType(it, substitutions)
		}
		return types.NewIntersectionType(intersectionTypes)
	case types.TupleType:
		var newElements []*types.Type
		for _, elem := range t.Types {
			if elem.Kind == types.RestType {
				substitutedRest := tc.substituteType(elem.ElementType, substitutions)
				// Flatten tuple types inside rest
				if substitutedRest.Kind == types.TupleType {
					newElements = append(newElements, substitutedRest.Types...)
				} else {
					newElements = append(newElements, types.NewRestType(substitutedRest))
				}
			} else {
				newElements = append(newElements, tc.substituteType(elem, substitutions))
			}
		}
		return &types.Type{Kind: types.TupleType, Types: newElements}
	case types.RestType:
		return types.NewRestType(tc.substituteType(t.ElementType, substitutions))
	case types.ObjectType:
		// For object types, substitute type parameters in properties
		if t.Properties != nil {
			newProperties := make(map[string]*types.Type)
			for propName, propType := range t.Properties {
				newProperties[propName] = tc.substituteType(propType, substitutions)
			}
			return types.NewObjectType(t.Name, newProperties)
		}
		return t
	case types.ConditionalType:
		checkType := tc.substituteType(t.CheckType, substitutions)
		extendsType := tc.substituteType(t.ExtendsType, substitutions)
		trueType := tc.substituteType(t.TrueType, substitutions)
		falseType := tc.substituteType(t.FalseType, substitutions)
		if t.InferredType != nil {
			// We don't substitute the inferred type parameter itself
			return types.NewConditionalTypeWithInfer(checkType, t.InferredType, trueType, falseType)
		}
		return types.NewConditionalType(checkType, extendsType, trueType, falseType)

	default:
		return t
	}
}
