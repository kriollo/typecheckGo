package checker

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/modules"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

// TypeChecker coordinates type checking operations
type TypeChecker struct {
	symbolTable     *symbols.SymbolTable
	errors          []TypeError
	moduleResolver  *modules.ModuleResolver
	currentFile     string
	globalEnv       *types.GlobalEnvironment
	typeCache       map[ast.Node]*types.Type
	varTypeCache    map[string]*types.Type // Cache types by variable name
	typeAliasCache  map[string]*types.Type // Cache for resolved type aliases
	inferencer      *types.TypeInferencer
	currentFunction *ast.FunctionDeclaration // Track current function for return type checking
	config          *CompilerConfig          // Compiler configuration
	typeGuards      map[string]bool          // Track variables under type guards (instanceof Function)
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

	return &TypeChecker{
		symbolTable:    symbols.NewSymbolTable(),
		errors:         []TypeError{},
		globalEnv:      globalEnv,
		typeCache:      typeCache,
		varTypeCache:   varTypeCache,
		typeAliasCache: make(map[string]*types.Type),
		inferencer:     inferencer,
		config:         getDefaultConfig(),
		typeGuards:     make(map[string]bool),
	}
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

	tc := &TypeChecker{
		symbolTable:    symbolTable,
		errors:         []TypeError{},
		moduleResolver: moduleResolver,
		globalEnv:      globalEnv,
		typeCache:      typeCache,
		config:         getDefaultConfig(),
		varTypeCache:   varTypeCache,
		typeAliasCache: make(map[string]*types.Type),
		inferencer:     inferencer,
		typeGuards:     make(map[string]bool),
	}

	// Load global types from @types packages
	tc.loadGlobalTypes(rootDir)

	return tc
}

// CheckFile checks a single TypeScript file
func (tc *TypeChecker) CheckFile(filename string, ast *ast.File) []TypeError {
	// Clear previous errors
	tc.errors = []TypeError{}
	tc.symbolTable.ClearErrors()
	tc.currentFile = filename

	// Create a binder and bind symbols
	binder := symbols.NewBinder(tc.symbolTable)
	binder.BindFile(ast)

	// Process imports and add imported symbols to the symbol table
	if tc.moduleResolver != nil {
		tc.processImports(ast, filename)
	}

	// Perform additional type checking
	tc.checkFile(ast, filename)

	return tc.errors
}

// checkFile performs type checking on a file
func (tc *TypeChecker) checkFile(file *ast.File, filename string) {
	for _, stmt := range file.Body {
		tc.checkStatement(stmt, filename)
	}
}

func (tc *TypeChecker) checkStatement(stmt ast.Statement, filename string) {
	if stmt == nil {
		return
	}

	switch s := stmt.(type) {
	case *ast.VariableDeclaration:
		tc.checkVariableDeclaration(s, filename)
	case *ast.FunctionDeclaration:
		tc.checkFunctionDeclaration(s, filename)
	case *ast.BlockStatement:
		tc.checkBlockStatement(s, filename)
	case *ast.ReturnStatement:
		tc.checkReturnStatement(s, filename)
	case *ast.ExpressionStatement:
		tc.checkExpression(s.Expression, filename)
	case *ast.IfStatement:
		tc.checkIfStatement(s, filename)
	case *ast.ImportDeclaration:
		tc.checkImportDeclaration(s, filename)
	case *ast.ExportDeclaration:
		tc.checkExportDeclaration(s, filename)
	case *ast.ForStatement:
		tc.checkForStatement(s, filename)
	case *ast.WhileStatement:
		tc.checkWhileStatement(s, filename)
	case *ast.TypeAliasDeclaration:
		tc.checkTypeAliasDeclaration(s, filename)
	case *ast.InterfaceDeclaration:
		tc.checkInterfaceDeclaration(s, filename)
	case *ast.ClassDeclaration:
		tc.checkClassDeclaration(s, filename)
	case *ast.SwitchStatement:
		tc.checkSwitchStatement(s, filename)
	case *ast.TryStatement:
		tc.checkTryStatement(s, filename)
	case *ast.ThrowStatement:
		tc.checkThrowStatement(s, filename)
	case *ast.BreakStatement:
		tc.checkBreakStatement(s, filename)
	case *ast.ContinueStatement:
		tc.checkContinueStatement(s, filename)
	default:
		// Unknown statement type - just a warning, don't block compilation
		fmt.Fprintf(os.Stderr, "Warning: Unknown statement type: %T\n", stmt)
	}
}

func (tc *TypeChecker) checkVariableDeclaration(decl *ast.VariableDeclaration, filename string) {
	for _, declarator := range decl.Decls {
		if declarator.ID != nil {
			// Check if the identifier is valid
			if !isValidIdentifier(declarator.ID.Name) {
				tc.addError(filename, declarator.ID.Pos().Line, declarator.ID.Pos().Column,
					fmt.Sprintf("Invalid identifier: '%s'", declarator.ID.Name), "TS1003", "error")
			}

			// Check for implicit any
			if tc.GetConfig().NoImplicitAny {
				// If no type annotation and no initializer, it's implicit any
				if declarator.TypeAnnotation == nil && declarator.Init == nil {
					tc.addError(filename, declarator.ID.Pos().Line, declarator.ID.Pos().Column,
						fmt.Sprintf("Variable '%s' implicitly has an 'any' type.", declarator.ID.Name),
						"TS7005", "error")
				}
			}

			// Determine the declared type from type annotation
			var declaredType *types.Type
			if declarator.TypeAnnotation != nil {
				declaredType = tc.convertTypeNode(declarator.TypeAnnotation)
			}

			// Infer type from initializer if present
			if declarator.Init != nil {
				tc.checkExpression(declarator.Init, filename)

				// Infer the type of the initializer
				inferredType := tc.inferencer.InferType(declarator.Init)

				// Check if inferred type is 'any' and noImplicitAny is enabled
				if tc.GetConfig().NoImplicitAny && inferredType.Kind == types.AnyType {
					// Only report if there's no explicit type annotation
					if declarator.TypeAnnotation == nil {
						tc.addError(filename, declarator.ID.Pos().Line, declarator.ID.Pos().Column,
							fmt.Sprintf("Variable '%s' implicitly has an 'any' type.", declarator.ID.Name),
							"TS7005", "error")
					}
				}

				// If there's a type annotation, check compatibility with initializer type
				if declaredType != nil {
					if !tc.isAssignableTo(inferredType, declaredType) {
						tc.addError(filename, declarator.Init.Pos().Line, declarator.Init.Pos().Column,
							fmt.Sprintf("Type '%s' is not assignable to type '%s'.", inferredType.String(), declaredType.String()),
							"TS2322", "error")
					}
					// Store the declared type (not the inferred type) in the cache
					tc.typeCache[declarator] = declaredType
					tc.typeCache[declarator.ID] = declaredType
					tc.varTypeCache[declarator.ID.Name] = declaredType
				} else {
					// No type annotation, store the inferred type
					tc.typeCache[declarator] = inferredType
					tc.typeCache[declarator.ID] = inferredType
					tc.varTypeCache[declarator.ID.Name] = inferredType
				}
			} else if declarator.TypeAnnotation != nil {
				// No initializer but has type annotation
				tc.typeCache[declarator.ID] = declaredType
				tc.varTypeCache[declarator.ID.Name] = declaredType
			} else {
				// No initializer and no type annotation - implicit any
				tc.typeCache[declarator.ID] = types.Any
				tc.varTypeCache[declarator.ID.Name] = types.Any
			}
		}
	}
}

func (tc *TypeChecker) checkFunctionDeclaration(decl *ast.FunctionDeclaration, filename string) {
	// Check if the function name is valid
	if !isValidIdentifier(decl.ID.Name) {
		tc.addError(filename, decl.ID.Pos().Line, decl.ID.Pos().Column,
			fmt.Sprintf("Invalid function name: '%s'", decl.ID.Name), "TS1003", "error")
	}

	// Check if async function is used without Promise support
	if decl.Async {
		if !tc.globalEnv.HasGlobal("Promise") {
			tc.addError(filename, decl.Pos().Line, decl.Pos().Column,
				"An async function or method in ES5 requires the 'Promise' constructor.  Make sure you have a declaration for the 'Promise' constructor or include 'ES2015' in your '--lib' option.",
				"TS2705", "error")
		}
	}

	// Check parameter names and types
	for _, param := range decl.Params {
		if param.ID != nil {
			if !isValidIdentifier(param.ID.Name) {
				tc.addError(filename, param.ID.Pos().Line, param.ID.Pos().Column,
					fmt.Sprintf("Invalid parameter name: '%s'", param.ID.Name), "TS1003", "error")
			}

			// Check for implicit any in parameters
			if tc.GetConfig().NoImplicitAny && param.ParamType == nil {
				tc.addError(filename, param.ID.Pos().Line, param.ID.Pos().Column,
					fmt.Sprintf("Parameter '%s' implicitly has an 'any' type.", param.ID.Name),
					"TS7006", "error")
			}
		}
	}

	// Check function body in the function's scope
	if decl.Body != nil {
		// Set current function for return type checking
		previousFunction := tc.currentFunction
		tc.currentFunction = decl

		// Find the function scope
		functionScope := tc.findScopeForNode(decl)
		if functionScope != nil {
			// Enter the function scope
			originalScope := tc.symbolTable.Current
			tc.symbolTable.Current = functionScope

			// Check the body
			tc.checkBlockStatement(decl.Body, filename)

			// Restore the original scope
			tc.symbolTable.Current = originalScope
		} else {
			// Fallback: check without scope change
			tc.checkBlockStatement(decl.Body, filename)
		}

		// Restore previous function
		tc.currentFunction = previousFunction
	}
}

func (tc *TypeChecker) checkBlockStatement(block *ast.BlockStatement, filename string) {
	// Find the block scope
	blockScope := tc.findScopeForNode(block)
	if blockScope != nil {
		// Enter the block scope
		originalScope := tc.symbolTable.Current
		tc.symbolTable.Current = blockScope

		// Check all statements in the block
		for _, stmt := range block.Body {
			tc.checkStatement(stmt, filename)
		}

		// Restore the original scope
		tc.symbolTable.Current = originalScope
	} else {
		// Fallback: check without scope change
		for _, stmt := range block.Body {
			tc.checkStatement(stmt, filename)
		}
	}
}

func (tc *TypeChecker) checkReturnStatement(ret *ast.ReturnStatement, filename string) {
	if ret.Argument != nil {
		tc.checkExpression(ret.Argument, filename)

		// Infer the type of the return value
		returnType := tc.inferencer.InferType(ret.Argument)

		// Store the return type for the current function
		if tc.currentFunction != nil {
			// Check if we already have a cached return type for this function
			existingReturnType, exists := tc.typeCache[tc.currentFunction]

			if exists {
				// Verify that all returns have compatible types
				if !tc.isAssignableTo(returnType, existingReturnType) {
					msg := fmt.Sprintf("Type '%s' is not assignable to type '%s'.", returnType.String(), existingReturnType.String())
					msg += "\n  Sugerencia: Todas las rutas de retorno deben devolver el mismo tipo"
					tc.addError(filename, ret.Argument.Pos().Line, ret.Argument.Pos().Column, msg, "TS2322", "error")
				}
			} else {
				// First return statement, cache the type
				tc.typeCache[tc.currentFunction] = returnType
			}
		}
	} else {
		// Return without value (void)
		if tc.currentFunction != nil {
			existingReturnType, exists := tc.typeCache[tc.currentFunction]
			if exists && existingReturnType.Kind != types.VoidType && existingReturnType.Kind != types.AnyType {
				msg := fmt.Sprintf("A function whose declared type is neither 'void' nor 'any' must return a value.")
				msg += "\n  Sugerencia: Agrega un valor de retorno o cambia el tipo de retorno a 'void'"
				tc.addError(filename, ret.Pos().Line, ret.Pos().Column, msg, "TS2355", "error")
			} else if !exists {
				// First return is void
				tc.typeCache[tc.currentFunction] = types.Void
			}
		}
	}
}

func (tc *TypeChecker) checkIfStatement(stmt *ast.IfStatement, filename string) {
	// Check the test condition
	tc.checkExpression(stmt.Test, filename)

	// Detect type guards
	var typeGuardVar string
	if binExpr, ok := stmt.Test.(*ast.BinaryExpression); ok {
		// Type guard 1: if (variable instanceof Function)
		if binExpr.Operator == "instanceof" {
			if leftId, ok := binExpr.Left.(*ast.Identifier); ok {
				if rightId, ok := binExpr.Right.(*ast.Identifier); ok {
					if rightId.Name == "Function" {
						typeGuardVar = leftId.Name
						tc.typeGuards[typeGuardVar] = true
					}
				}
			}
		}

		// Type guard 2: if (typeof variable === 'function')
		if binExpr.Operator == "===" || binExpr.Operator == "==" {
			// Check for: typeof variable === 'function'
			if unaryExpr, ok := binExpr.Left.(*ast.UnaryExpression); ok {
				if unaryExpr.Operator == "typeof" {
					if argId, ok := unaryExpr.Argument.(*ast.Identifier); ok {
						if literal, ok := binExpr.Right.(*ast.Literal); ok {
							if literal.Value == "function" || literal.Value == "'function'" || literal.Value == "\"function\"" {
								typeGuardVar = argId.Name
								tc.typeGuards[typeGuardVar] = true
							}
						}
					}
				}
			}
			// Check for: 'function' === typeof variable (reversed order)
			if unaryExpr, ok := binExpr.Right.(*ast.UnaryExpression); ok {
				if unaryExpr.Operator == "typeof" {
					if argId, ok := unaryExpr.Argument.(*ast.Identifier); ok {
						if literal, ok := binExpr.Left.(*ast.Literal); ok {
							if literal.Value == "function" || literal.Value == "'function'" || literal.Value == "\"function\"" {
								typeGuardVar = argId.Name
								tc.typeGuards[typeGuardVar] = true
							}
						}
					}
				}
			}
		}
	}

	// Find the if statement scope (if it exists)
	ifScope := tc.findScopeForNode(stmt)
	if ifScope != nil {
		// Enter the if scope
		originalScope := tc.symbolTable.Current
		tc.symbolTable.Current = ifScope

		// Check the consequent (then branch)
		tc.checkStatement(stmt.Consequent, filename)

		// Check the alternate (else branch) if present
		if stmt.Alternate != nil {
			tc.checkStatement(stmt.Alternate, filename)
		}

		// Restore the original scope
		tc.symbolTable.Current = originalScope
	} else {
		// Fallback: check without scope change
		tc.checkStatement(stmt.Consequent, filename)

		// Check the alternate (else branch) if present
		if stmt.Alternate != nil {
			tc.checkStatement(stmt.Alternate, filename)
		}
	}

	// Clean up type guard after if block
	if typeGuardVar != "" {
		delete(tc.typeGuards, typeGuardVar)
	}
}

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
	case *ast.ConditionalExpression:
		tc.checkConditionalExpression(e, filename)
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
		rightType := tc.inferencer.InferType(assign.Right)

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
	// Skip TypeScript keywords that are type-related and not runtime identifiers
	// These keywords are used for type assertions, type guards, etc.
	typeKeywords := []string{"as", "is", "keyof", "typeof", "infer", "readonly"}
	for _, keyword := range typeKeywords {
		if id.Name == keyword {
			return
		}
	}

	// Check if the identifier is defined in the symbol table
	if _, exists := tc.symbolTable.ResolveSymbol(id.Name); exists {
		return
	}

	// Check if it's a global object or type
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

			if !symbol.IsFunction && !isUnderTypeGuard {
				msg := fmt.Sprintf("This expression is not callable. Type '%s' has no call signatures.", id.Name)
				msg += "\n  Sugerencia: Verifica que estés llamando a una función y no a una variable"
				tc.addError(filename, call.Pos().Line, call.Pos().Column, msg, "TS2349", "error")
			} else {
				// Check parameter count
				// Skip validation for symbols from .d.ts files (they may have complex overloads)
				if len(symbol.Params) > 0 && !symbol.FromDTS {
					expectedCount := len(symbol.Params)
					actualCount := len(call.Arguments)
					if actualCount != expectedCount {
						msg := fmt.Sprintf("Expected %d arguments, but got %d.", expectedCount, actualCount)

						if actualCount < expectedCount {
							msg += fmt.Sprintf("\n  Sugerencia: La función '%s' requiere %d argumento(s)", id.Name, expectedCount)
							if len(symbol.Params) > 0 {
								msg += "\n  Parámetros esperados:"
								for i, param := range symbol.Params {
									if i < 5 { // Show max 5 parameters
										msg += fmt.Sprintf("\n    %d. %s", i+1, param)
									}
								}
							}
						} else {
							msg += fmt.Sprintf("\n  Sugerencia: La función '%s' solo acepta %d argumento(s)", id.Name, expectedCount)
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

	// Create a new scope for the arrow function
	arrowScope := tc.findScopeForNode(arrow)
	if arrowScope == nil {
		// If no scope exists, create one temporarily
		tc.symbolTable.EnterScope(arrow)

		// Define parameters in the function scope
		for _, param := range arrow.Params {
			if param.ID != nil {
				tc.symbolTable.DefineSymbol(param.ID.Name, symbols.ParameterSymbol, param, false)
			}
		}

		// Check the body
		switch body := arrow.Body.(type) {
		case *ast.BlockStatement:
			tc.checkBlockStatement(body, filename)
		case ast.Expression:
			tc.checkExpression(body, filename)
		}

		tc.symbolTable.ExitScope()
	} else {
		// Use existing scope
		originalScope := tc.symbolTable.Current
		tc.symbolTable.Current = arrowScope

		// Check the body
		switch body := arrow.Body.(type) {
		case *ast.BlockStatement:
			tc.checkBlockStatement(body, filename)
		case ast.Expression:
			tc.checkExpression(body, filename)
		}

		tc.symbolTable.Current = originalScope
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
func levenshteinDistance(s1, s2 string) int {
	if len(s1) == 0 {
		return len(s2)
	}
	if len(s2) == 0 {
		return len(s1)
	}

	// Create matrix
	matrix := make([][]int, len(s1)+1)
	for i := range matrix {
		matrix[i] = make([]int, len(s2)+1)
	}

	// Initialize first row and column
	for i := 0; i <= len(s1); i++ {
		matrix[i][0] = i
	}
	for j := 0; j <= len(s2); j++ {
		matrix[0][j] = j
	}

	// Fill matrix
	for i := 1; i <= len(s1); i++ {
		for j := 1; j <= len(s2); j++ {
			cost := 0
			if s1[i-1] != s2[j-1] {
				cost = 1
			}

			matrix[i][j] = min(
				matrix[i-1][j]+1, // deletion
				min(
					matrix[i][j-1]+1,      // insertion
					matrix[i-1][j-1]+cost, // substitution
				),
			)
		}
	}

	return matrix[len(s1)][len(s2)]
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
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
		firstChar == '_' || firstChar == '$') {
		return false
	}

	// Check remaining characters
	for i := 1; i < len(name); i++ {
		char := name[i]
		if !((char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') ||
			char == '_' || char == '$') {
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
		firstChar == '_' || firstChar == '$') {
		return false
	}

	// Check remaining characters
	for i := 1; i < len(name); i++ {
		char := name[i]
		if !((char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') ||
			char == '_' || char == '$') {
			return false
		}
	}

	// Don't check against reserved keywords for property names
	return true
}

// isReservedKeyword checks if a string is a JavaScript/TypeScript reserved keyword
func isReservedKeyword(name string) bool {
	keywords := []string{
		"break", "case", "catch", "class", "const", "continue", "debugger",
		"default", "delete", "do", "else", "export", "extends", "finally",
		"for", "function", "if", "import", "in", "instanceof", "let",
		"new", "return", "super", "switch", "this", "throw", "try",
		"typeof", "var", "void", "while", "with", "yield", "enum",
		"implements", "interface", "package", "private", "protected",
		"public", "static", "abstract", "as", "async", "await", "constructor",
		"declare", "from", "get", "is", "module", "namespace", "of",
		"require", "set", "type", "",
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
			result.WriteString(fmt.Sprintf("  {\n"))
			result.WriteString(fmt.Sprintf("    \"file\": \"%s\",\n", err.File))
			result.WriteString(fmt.Sprintf("    \"line\": %d,\n", err.Line))
			result.WriteString(fmt.Sprintf("    \"column\": %d,\n", err.Column))
			result.WriteString(fmt.Sprintf("    \"message\": \"%s\",\n", err.Message))
			result.WriteString(fmt.Sprintf("    \"code\": \"%s\",\n", err.Code))
			result.WriteString(fmt.Sprintf("    \"severity\": \"%s\"\n", err.Severity))
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
	for _, stmt := range file.Body {
		if importDecl, ok := stmt.(*ast.ImportDeclaration); ok {
			tc.processImport(importDecl, filename)
		}
	}
}

// processImport processes a single import declaration
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
	}
}

func (tc *TypeChecker) checkForStatement(stmt *ast.ForStatement, filename string) {
	// Find the for statement scope
	forScope := tc.findScopeForNode(stmt)
	if forScope != nil {
		originalScope := tc.symbolTable.Current
		tc.symbolTable.Current = forScope

		// Check init
		if stmt.Init != nil {
			switch init := stmt.Init.(type) {
			case *ast.VariableDeclaration:
				tc.checkVariableDeclaration(init, filename)
			case *ast.ExpressionStatement:
				tc.checkExpression(init.Expression, filename)
			}
		}

		// Check test
		if stmt.Test != nil {
			tc.checkExpression(stmt.Test, filename)
		}

		// Check update
		if stmt.Update != nil {
			tc.checkExpression(stmt.Update, filename)
		}

		// Check body
		if stmt.Body != nil {
			tc.checkStatement(stmt.Body, filename)
		}

		tc.symbolTable.Current = originalScope
	} else {
		// Fallback without scope
		if stmt.Init != nil {
			switch init := stmt.Init.(type) {
			case *ast.VariableDeclaration:
				tc.checkVariableDeclaration(init, filename)
			case *ast.ExpressionStatement:
				tc.checkExpression(init.Expression, filename)
			}
		}

		if stmt.Test != nil {
			tc.checkExpression(stmt.Test, filename)
		}

		if stmt.Update != nil {
			tc.checkExpression(stmt.Update, filename)
		}

		if stmt.Body != nil {
			tc.checkStatement(stmt.Body, filename)
		}
	}
}

func (tc *TypeChecker) checkWhileStatement(stmt *ast.WhileStatement, filename string) {
	// Check test
	tc.checkExpression(stmt.Test, filename)

	// Check body
	if stmt.Body != nil {
		tc.checkStatement(stmt.Body, filename)
	}
}

// checkSwitchStatement checks switch statements
func (tc *TypeChecker) checkSwitchStatement(stmt *ast.SwitchStatement, filename string) {
	// Check discriminant (the expression being switched on)
	if stmt.Discriminant != nil {
		tc.checkExpression(stmt.Discriminant, filename)
	}

	// Check each case
	for _, switchCase := range stmt.Cases {
		// Check test expression (nil for default case)
		if switchCase.Test != nil {
			tc.checkExpression(switchCase.Test, filename)
		}

		// Check consequent statements
		for _, consequent := range switchCase.Consequent {
			tc.checkStatement(consequent, filename)
		}
	}
}

// checkTryStatement checks try-catch-finally statements
func (tc *TypeChecker) checkTryStatement(stmt *ast.TryStatement, filename string) {
	// Check the try block
	if stmt.Block != nil {
		tc.checkBlockStatement(stmt.Block, filename)
	}

	// Check the catch clause
	if stmt.Handler != nil {
		// Create a new scope for the catch clause
		tc.symbolTable.EnterScope(stmt.Handler)

		// Define the catch parameter if present
		if stmt.Handler.Param != nil {
			// In TypeScript, catch parameters are implicitly 'any' or 'unknown' depending on useUnknownInCatchVariables
			// For now, we'll use 'unknown' as it's stricter
			tc.symbolTable.DefineSymbol(stmt.Handler.Param.Name, symbols.VariableSymbol, stmt.Handler.Param, false)
			tc.varTypeCache[stmt.Handler.Param.Name] = types.Unknown
		}

		// Check the catch block
		if stmt.Handler.Body != nil {
			tc.checkBlockStatement(stmt.Handler.Body, filename)
		}

		tc.symbolTable.ExitScope()
	}

	// Check the finally block
	if stmt.Finalizer != nil {
		tc.checkBlockStatement(stmt.Finalizer, filename)
	}
}

// checkThrowStatement checks throw statements
func (tc *TypeChecker) checkThrowStatement(stmt *ast.ThrowStatement, filename string) {
	// Check the argument being thrown
	if stmt.Argument != nil {
		tc.checkExpression(stmt.Argument, filename)
	}
}

func (tc *TypeChecker) checkBreakStatement(stmt *ast.BreakStatement, filename string) {
	// Break statements are valid - no additional checks needed for now
	// In a more complete implementation, we would verify:
	// - We're inside a loop or switch statement
	// - If there's a label, it exists and is valid
	_ = stmt
	_ = filename
}

func (tc *TypeChecker) checkContinueStatement(stmt *ast.ContinueStatement, filename string) {
	// Continue statements are valid - no additional checks needed for now
	// In a more complete implementation, we would verify:
	// - We're inside a loop statement
	// - If there's a label, it exists and is valid
	_ = stmt
	_ = filename
}

// checkImportDeclaration checks import statements
func (tc *TypeChecker) checkImportDeclaration(importDecl *ast.ImportDeclaration, filename string) {
	if tc.moduleResolver == nil {
		// If we don't have module resolution, just skip import checking
		return
	}

	// Obtener el string del source
	if importDecl.Source == nil {
		return
	}

	sourceStr, ok := importDecl.Source.Value.(string)
	if !ok || sourceStr == "" {
		return
	}

	// Create an import resolver for this file
	currentModule, err := tc.moduleResolver.ResolveModule(filename, "")
	if err != nil {
		// If we can't resolve the current module, we can't check imports
		return
	}

	importResolver := modules.NewImportResolver(tc.moduleResolver, currentModule)

	// Try to resolve the import
	_, err = importResolver.ResolveImport(importDecl)
	if err != nil {
		tc.addError(filename, importDecl.Pos().Line, importDecl.Pos().Column,
			fmt.Sprintf("Cannot find module '%s' or its corresponding type declarations", sourceStr),
			"TS2307", "error")
	}
}

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

		// If we can't resolve it, return the object type or Any
		if objectType.Kind != types.UnknownType {
			return objectType
		}
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

	// Unknown is assignable to anything except never
	if sourceType.Kind == types.UnknownType {
		return targetType.Kind != types.NeverType
	}

	// Nothing is assignable to never except never itself
	if targetType.Kind == types.NeverType {
		return sourceType.Kind == types.NeverType
	}

	// Exact type match
	if sourceType.Kind == targetType.Kind {
		return true
	}

	// Undefined and null are assignable to each other (in non-strict mode)
	if (sourceType.Kind == types.UndefinedType && targetType.Kind == types.NullType) ||
		(sourceType.Kind == types.NullType && targetType.Kind == types.UndefinedType) {
		return true
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

	return false
}

// checkExportDeclaration checks export statements
func (tc *TypeChecker) checkExportDeclaration(exportDecl *ast.ExportDeclaration, filename string) {
	if tc.moduleResolver == nil {
		// If we don't have module resolution, just skip export checking
		return
	}

	// Solo verificar re-exports que tienen source
	if exportDecl.Source == nil || len(exportDecl.Specifiers) == 0 {
		return
	}

	sourceStr, ok := exportDecl.Source.Value.(string)
	if !ok || sourceStr == "" {
		return
	}

	// Create an import resolver for this file
	currentModule, err := tc.moduleResolver.ResolveModule(filename, "")
	if err != nil {
		// If we can't resolve the current module, we can't check exports
		return
	}

	importResolver := modules.NewImportResolver(tc.moduleResolver, currentModule)

	// Check re-exports
	err = importResolver.ResolveExport(exportDecl)
	if err != nil {
		tc.addError(filename, exportDecl.Pos().Line, exportDecl.Pos().Column,
			fmt.Sprintf("Module '%s' has no exported member", sourceStr),
			"TS2305", "error")
	}
}

func (tc *TypeChecker) checkTypeAliasDeclaration(decl *ast.TypeAliasDeclaration, filename string) {
	if decl.ID != nil {
		if !isValidIdentifier(decl.ID.Name) {
			tc.addError(filename, decl.ID.Pos().Line, decl.ID.Pos().Column,
				fmt.Sprintf("Invalid type name: '%s'", decl.ID.Name), "TS1003", "error")
		}

		// For non-generic type aliases, resolve and cache them.
		// Generic ones are resolved on instantiation.
		if len(decl.TypeParameters) == 0 {
			resolvedType := tc.convertTypeNode(decl.TypeAnnotation)
			tc.typeAliasCache[decl.ID.Name] = resolvedType
		}
	}
}

func (tc *TypeChecker) checkInterfaceDeclaration(decl *ast.InterfaceDeclaration, filename string) {
	// Interfaces are just declarations, no runtime checking needed
	// We just verify the name is valid
	if decl.ID != nil && !isValidIdentifier(decl.ID.Name) {
		tc.addError(filename, decl.ID.Pos().Line, decl.ID.Pos().Column,
			fmt.Sprintf("Invalid interface name: '%s'", decl.ID.Name), "TS1003", "error")
	}
}

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
	tc.loadTypeScriptLibs(libs)
}

// loadTypeScriptLibs loads TypeScript library definition files based on configured libs
func (tc *TypeChecker) loadTypeScriptLibs(libs []string) {
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
			return
		}
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
		"es2021":       "lib.es2021.d.ts",
		"es2022":       "lib.es2022.d.ts",
		"es2023":       "lib.es2023.d.ts",
		"esnext":       "lib.esnext.d.ts",
		"dom":          "lib.dom.d.ts",
		"dom.iterable": "lib.dom.iterable.d.ts",
		"webworker":    "lib.webworker.d.ts",
		"scripthost":   "lib.scripthost.d.ts",
	}

	// Load the requested lib files
	for _, lib := range libs {
		libLower := strings.ToLower(lib)
		if fileName, ok := libFileMap[libLower]; ok {
			libFilePath := filepath.Join(typescriptLibPath, fileName)
			if _, err := os.Stat(libFilePath); err == nil {
				tc.loadLibFile(libFilePath)
			}
		}
	}
}

// loadLibFile loads a single TypeScript lib file and extracts type definitions
func (tc *TypeChecker) loadLibFile(filePath string) {
	// Pass 1: Extract interfaces and types
	tc.extractInterfacesFromFile(filePath)

	// Pass 2: Extract variables and functions
	tc.extractVariablesFromFile(filePath)
}

// SetPathAliases configures path aliases from tsconfig for module resolution
func (tc *TypeChecker) SetPathAliases(baseUrl string, paths map[string][]string) {
	if tc.moduleResolver != nil {
		tc.moduleResolver.SetPathAliases(baseUrl, paths)
	}
}

// SetTypeRoots configures type roots from tsconfig for declaration file resolution
func (tc *TypeChecker) SetTypeRoots(typeRoots []string) {
	if tc.moduleResolver != nil {
		tc.moduleResolver.SetTypeRoots(typeRoots)
	}
	// Load global types from the configured typeRoots
	tc.loadGlobalTypesFromRoots(typeRoots)
}

// loadGlobalTypes loads type definitions from @types packages
func (tc *TypeChecker) loadGlobalTypes(rootDir string) {
	// Try to load from all @types packages that are installed
	typesDir := filepath.Join(rootDir, "node_modules", "@types")

	// Check if @types directory exists
	if _, err := os.Stat(typesDir); os.IsNotExist(err) {
		return
	}

	// Scan all installed @types packages
	entries, err := os.ReadDir(typesDir)
	if err != nil {
		return
	}

	for _, entry := range entries {
		if entry.IsDir() {
			pkgDir := filepath.Join(typesDir, entry.Name())
			tc.loadPackageTypes(pkgDir)
		}
	}
}

// loadGlobalTypesFromRoots loads type definitions from configured typeRoots
func (tc *TypeChecker) loadGlobalTypesFromRoots(typeRoots []string) {
	if len(typeRoots) == 0 {
		return
	}

	// Get the root directory from moduleResolver
	var rootDir string
	if tc.moduleResolver != nil {
		rootDir = tc.moduleResolver.GetRootDir()
	}
	if rootDir == "" {
		rootDir = "."
	}

	// Load types from each typeRoot
	for _, typeRoot := range typeRoots {
		// Resolve relative paths
		var typesPath string
		if filepath.IsAbs(typeRoot) {
			typesPath = typeRoot
		} else {
			typesPath = filepath.Join(rootDir, typeRoot)
		}

		// Check if directory exists
		if info, err := os.Stat(typesPath); err == nil && info.IsDir() {
			// Load all .d.ts and .ts files from this directory
			tc.loadDeclarationFiles(typesPath)
		}
	}
}

// loadDeclarationFiles loads all .d.ts and .ts files from a directory (including subdirectories)
func (tc *TypeChecker) loadDeclarationFiles(dir string) {
	var declarationFiles []string

	// Collect all .d.ts and .ts files
	filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors
		}
		if !info.IsDir() {
			if strings.HasSuffix(path, ".d.ts") || strings.HasSuffix(path, ".ts") {
				// Only load declaration files (globals.ts, *.d.ts)
				baseName := filepath.Base(path)
				if strings.HasSuffix(path, ".d.ts") || baseName == "globals.ts" {
					declarationFiles = append(declarationFiles, path)
				}
			}
		}
		return nil
	})

	// Pass 1: Extract interfaces and types (they define callable signatures)
	for _, path := range declarationFiles {
		tc.extractInterfacesFromFile(path)
	}

	// Pass 2: Extract variables and functions (they may reference interfaces from pass 1)
	for _, path := range declarationFiles {
		tc.extractVariablesFromFile(path)
	}
}

// loadPackageTypes loads all .d.ts files from a package directory
// Uses two-pass approach: first load interfaces/types, then variables
func (tc *TypeChecker) loadPackageTypes(pkgDir string) {
	var dtsFiles []string

	// Collect all .d.ts files
	filepath.Walk(pkgDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors
		}
		if !info.IsDir() && strings.HasSuffix(path, ".d.ts") {
			dtsFiles = append(dtsFiles, path)
		}
		return nil
	})

	// Pass 1: Extract interfaces and types (they define callable signatures)
	for _, path := range dtsFiles {
		tc.extractInterfacesFromFile(path)
	}

	// Pass 2: Extract variables and functions (they may reference interfaces from pass 1)
	for _, path := range dtsFiles {
		tc.extractVariablesFromFile(path)
	}
}

// extractInterfacesFromFile extracts interface and type declarations from a .d.ts file (Pass 1)
func (tc *TypeChecker) extractInterfacesFromFile(filePath string) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return
	}
	tc.extractInterfacesUsingPatterns(string(content))
}

// extractVariablesFromFile extracts variable and function declarations from a .d.ts file (Pass 2)
func (tc *TypeChecker) extractVariablesFromFile(filePath string) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return
	}
	tc.extractVariablesUsingPatterns(string(content))
}

// extractInterfacesUsingPatterns extracts interface and type declarations (Pass 1)
func (tc *TypeChecker) extractInterfacesUsingPatterns(text string) {
	lines := strings.Split(text, "\n")

	// Track context
	inDeclareBlock := false
	blockDepth := 0
	interfaceContext := ""
	interfaceDepth := 0
	hasCallSignature := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Track declare module/namespace blocks
		if strings.HasPrefix(trimmed, "declare module") || strings.HasPrefix(trimmed, "declare namespace") {
			inDeclareBlock = true
			blockDepth = 0
		}

		// Track interface declarations to detect call signatures
		if strings.HasPrefix(trimmed, "interface ") || strings.HasPrefix(trimmed, "export interface ") {
			parts := strings.Fields(trimmed)
			for j, part := range parts {
				if part == "interface" && j+1 < len(parts) {
					interfaceName := parts[j+1]
					// Clean interface name
					interfaceName = strings.TrimSuffix(interfaceName, "{")
					interfaceName = strings.TrimSpace(interfaceName)
					if idx := strings.IndexAny(interfaceName, "<{"); idx != -1 {
						interfaceName = interfaceName[:idx]
					}
					interfaceContext = interfaceName
					interfaceDepth = 0
					hasCallSignature = false
					break
				}
			}
		}

		// Detect call signatures in interfaces: (args): returnType;
		// Call signatures can be indented and may span multiple lines
		if interfaceContext != "" {
			// Check if line contains a call signature pattern
			// Pattern 1: (args): ReturnType;
			// Pattern 2: <TElement>(args): ReturnType;
			if strings.Contains(trimmed, "(") && (strings.Contains(trimmed, "):") || strings.Contains(trimmed, "): ")) {
				// Check if it's a call signature (starts with ( or <generics>()
				if strings.HasPrefix(trimmed, "(") ||
					(strings.Contains(trimmed, "<") && strings.Index(trimmed, "<") < strings.Index(trimmed, "(")) {
					hasCallSignature = true
				}
			}
			// Pattern 3: Just opening paren at start (multi-line signature)
			if strings.HasPrefix(trimmed, "(") && !strings.Contains(trimmed, ":") {
				// Might be start of a multi-line call signature
				hasCallSignature = true
			}
		}

		// Count braces
		openBraces := strings.Count(line, "{")
		closeBraces := strings.Count(line, "}")
		blockDepth += openBraces - closeBraces

		if interfaceContext != "" {
			interfaceDepth += openBraces - closeBraces
			if interfaceDepth <= 0 {
				// End of interface - register symbol if it has call signature
				if hasCallSignature && isValidIdentifier(interfaceContext) {
					symbol := tc.symbolTable.DefineSymbol(interfaceContext, symbols.InterfaceSymbol, nil, false)
					symbol.IsFunction = true
					symbol.FromDTS = true // Mark as coming from .d.ts
				}
				interfaceContext = ""
				hasCallSignature = false
			}
		}

		if inDeclareBlock && blockDepth <= 0 {
			inDeclareBlock = false
		}

		// Process type aliases outside of declare module blocks
		if !inDeclareBlock {
			tc.extractTypeAliasFromLine(trimmed)
		}
	}
}

// extractVariablesUsingPatterns extracts variable and function declarations (Pass 2)
func (tc *TypeChecker) extractVariablesUsingPatterns(text string) {
	lines := strings.Split(text, "\n")

	// Track context
	inDeclareBlock := false
	blockDepth := 0

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Track declare module/namespace blocks
		if strings.HasPrefix(trimmed, "declare module") || strings.HasPrefix(trimmed, "declare namespace") {
			inDeclareBlock = true
			blockDepth = 0
		}

		// Count braces
		blockDepth += strings.Count(line, "{") - strings.Count(line, "}")

		if inDeclareBlock && blockDepth <= 0 {
			inDeclareBlock = false
		}

		// Only extract global declarations (not inside declare module blocks)
		if !inDeclareBlock {
			tc.extractGlobalDeclarationFromLine(trimmed, i, lines)
		}
	}
}

// extractTypeAliasFromLine extracts type alias declarations
func (tc *TypeChecker) extractTypeAliasFromLine(line string) {
	// Pattern: type NAME = ...
	if strings.HasPrefix(line, "type ") || strings.HasPrefix(line, "export type ") {
		parts := strings.Fields(line)
		for i, part := range parts {
			if part == "type" && i+1 < len(parts) {
				name := parts[i+1]
				if idx := strings.Index(name, "="); idx != -1 {
					name = name[:idx]
				}
				name = strings.TrimSpace(name)
				if idx := strings.IndexAny(name, "<{"); idx != -1 {
					name = name[:idx]
				}
				if name != "" && isValidIdentifier(name) {
					tc.symbolTable.DefineSymbol(name, symbols.TypeAliasSymbol, nil, false)
				}
				break
			}
		}
	}
}

// extractGlobalDeclarationFromLine extracts a global symbol from a single line
func (tc *TypeChecker) extractGlobalDeclarationFromLine(line string, lineIdx int, allLines []string) {
	// Pattern: declare const NAME: TYPE;
	// Pattern: declare var NAME: TYPE;
	// Pattern: declare let NAME: TYPE;
	if strings.HasPrefix(line, "declare const ") ||
		strings.HasPrefix(line, "declare var ") ||
		strings.HasPrefix(line, "declare let ") {

		parts := strings.Fields(line)
		if len(parts) >= 3 {
			name := parts[2]
			// Remove : and everything after it
			if idx := strings.Index(name, ":"); idx != -1 {
				name = name[:idx]
			}
			name = strings.TrimSuffix(name, ";")

			if name != "" && isValidIdentifier(name) {
				symbol := tc.symbolTable.DefineSymbol(name, symbols.VariableSymbol, nil, false)
				symbol.FromDTS = true // Mark as coming from .d.ts
				// Check if the type suggests it's callable
				typeStr := tc.extractTypeFromDeclaration(line)
				if typeStr != "" {
					// Check if the type is a known callable interface
					if tc.isTypeCallable(typeStr) {
						symbol.IsFunction = true
					} else {
						// Look ahead in the file to see if this type becomes callable
						tc.checkIfTypeIsCallable(symbol, typeStr, lineIdx, allLines)
					}
				}

				// Also add to global environment so it can be found during type checking
				tc.globalEnv.Objects[name] = types.Any
			}
		}
	}

	// Pattern: declare function NAME(...): TYPE;
	if strings.HasPrefix(line, "declare function ") {
		parts := strings.Fields(line)
		if len(parts) >= 3 {
			name := parts[2]
			if idx := strings.Index(name, "("); idx != -1 {
				name = name[:idx]
			}

			if name != "" && isValidIdentifier(name) {
				symbol := tc.symbolTable.DefineSymbol(name, symbols.FunctionSymbol, nil, false)
				symbol.IsFunction = true
				symbol.FromDTS = true // Mark as coming from .d.ts

				// Also add to global environment
				tc.globalEnv.Objects[name] = types.Any
			}
		}
	}

	// Pattern: export = NAME; (CommonJS export)
	if strings.HasPrefix(line, "export =") || strings.HasPrefix(line, "export=") {
		exportedName := strings.TrimPrefix(line, "export=")
		exportedName = strings.TrimPrefix(exportedName, "export =")
		exportedName = strings.TrimSpace(exportedName)
		exportedName = strings.TrimSuffix(exportedName, ";")

		if exportedName != "" && isValidIdentifier(exportedName) {
			// The exported name might be defined elsewhere, just ensure it exists
			if existing, ok := tc.symbolTable.ResolveSymbol(exportedName); ok && existing != nil {
				// Create an alias or ensure it's accessible
				tc.symbolTable.DefineSymbol(exportedName, existing.Type, nil, false)
			}
		}
	}
}

// extractTypeFromDeclaration extracts the type annotation from a declaration line
func (tc *TypeChecker) extractTypeFromDeclaration(line string) string {
	if idx := strings.Index(line, ":"); idx != -1 {
		typeStr := line[idx+1:]
		typeStr = strings.TrimSuffix(typeStr, ";")
		typeStr = strings.TrimSpace(typeStr)
		return typeStr
	}
	return ""
}

// isTypeCallable checks if a type name refers to a callable interface already registered
func (tc *TypeChecker) isTypeCallable(typeName string) bool {
	// Clean up type name (remove generics, etc)
	if idx := strings.Index(typeName, "<"); idx != -1 {
		typeName = typeName[:idx]
	}
	typeName = strings.TrimSpace(typeName)

	// Look up the symbol
	if sym, ok := tc.symbolTable.ResolveSymbol(typeName); ok && sym != nil {
		return sym.IsFunction
	}
	return false
}

// checkIfTypeIsCallable checks if a type name suggests the symbol should be callable
// This is called when we find a variable declaration with a type that might be callable
func (tc *TypeChecker) checkIfTypeIsCallable(symbol *symbols.Symbol, typeName string, lineIdx int, allLines []string) {
	// Clean type name
	if idx := strings.Index(typeName, "<"); idx != -1 {
		typeName = typeName[:idx]
	}
	typeName = strings.TrimSpace(typeName)

	// Look for the interface definition in the current file
	for i := 0; i < len(allLines); i++ {
		line := strings.TrimSpace(allLines[i])
		// Check if this line defines the interface/type
		if strings.Contains(line, "interface "+typeName) || strings.Contains(line, "type "+typeName) {
			// Look ahead for call signature
			depth := 0
			for j := i; j < len(allLines) && j < i+100; j++ {
				checkLine := strings.TrimSpace(allLines[j])
				depth += strings.Count(allLines[j], "{") - strings.Count(allLines[j], "}")

				// Check for call signature patterns
				// Pattern 1: (args): returnType;
				if strings.HasPrefix(checkLine, "(") && (strings.Contains(checkLine, "):") || strings.Contains(checkLine, "): ")) {
					symbol.IsFunction = true
					return
				}
				// Pattern 2: generic call signature <T>(args): ReturnType;
				if strings.Contains(checkLine, "(") && (strings.Contains(checkLine, "):") || strings.Contains(checkLine, "): ")) {
					if strings.Contains(checkLine, "<") && strings.Index(checkLine, "<") < strings.Index(checkLine, "(") {
						symbol.IsFunction = true
						return
					}
				}

				if depth <= 0 && j > i {
					break
				}
			}
		}
	}
}

// GetConfig returns the current compiler configuration
func (tc *TypeChecker) GetConfig() *CompilerConfig {
	if tc.config == nil {
		tc.config = getDefaultConfig()
	}
	return tc.config
}

func (tc *TypeChecker) checkClassDeclaration(decl *ast.ClassDeclaration, filename string) {
	// Check class name
	if !isValidIdentifier(decl.ID.Name) {
		tc.addError(filename, decl.ID.Pos().Line, decl.ID.Pos().Column,
			fmt.Sprintf("Invalid class name: '%s'", decl.ID.Name), "TS1003", "error")
	}

	// Find the class scope
	classScope := tc.findScopeForNode(decl)
	if classScope == nil {
		// If we can't find the scope, skip member checking
		return
	}

	// Save current scope
	originalScope := tc.symbolTable.Current

	// Enter class scope
	tc.symbolTable.Current = classScope

	// Check members
	for _, member := range decl.Body {
		switch m := member.(type) {
		case *ast.MethodDefinition:
			// Check method
			if m.Value != nil && m.Value.Body != nil {
				// Find method scope
				methodScope := tc.findScopeForNode(m)
				if methodScope != nil {
					// Set current function for return type checking
					previousFunction := tc.currentFunction
					tc.currentFunction = nil // Methods are not FunctionDeclaration

					// Enter method scope
					tc.symbolTable.Current = methodScope

					tc.checkBlockStatement(m.Value.Body, filename)

					// Restore class scope
					tc.symbolTable.Current = classScope

					tc.currentFunction = previousFunction
				}
			}

		case *ast.PropertyDefinition:
			// Check property initializer
			if m.Value != nil {
				tc.checkExpression(m.Value, filename)
			}
		}
	}

	// Restore original scope
	tc.symbolTable.Current = originalScope
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

	switch t := typeNode.(type) {
	case *ast.TypeReference:
		// Handle generic type alias instantiation
		if symbol, exists := tc.symbolTable.ResolveSymbol(t.Name); exists && symbol.Type == symbols.TypeAliasSymbol {
			aliasDecl := symbol.Node.(*ast.TypeAliasDeclaration)

			// Create substitution map
			substitutions := make(map[string]*types.Type)
			for i, param := range aliasDecl.TypeParameters {
				if i < len(t.TypeArguments) {
					argType := tc.convertTypeNode(t.TypeArguments[i])
					if typeRef, ok := param.(*ast.TypeReference); ok {
						substitutions[typeRef.Name] = argType
					}
				}
			}

			// Substitute in the alias's type annotation
			annotationType := tc.convertTypeNode(aliasDecl.TypeAnnotation)
			resolvedType := tc.substituteType(annotationType, substitutions)

			// Evaluate if it's a conditional type
			if resolvedType.Kind == types.ConditionalType {
				return tc.evaluateConditionalType(resolvedType)
			}
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
		default:
			// Check type alias cache for non-generic aliases
			if resolvedType, ok := tc.typeAliasCache[t.Name]; ok {
				return resolvedType
			}

			// For other type references, create a basic object type
			return types.NewObjectType(t.Name, nil)
		}

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

	case *ast.LiteralType:
		return types.NewLiteralType(t.Value)

	case *ast.TypeParameter:
		return types.NewTypeParameter(t.Name.Name, nil, nil)

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
		// HACK: NewIntersectionType does not exist, using NewUnionType as a placeholder.
		return types.NewUnionType(intersectionTypes)
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
