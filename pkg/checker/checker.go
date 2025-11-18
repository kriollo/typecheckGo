package checker

import (
	"fmt"
	"strings"

	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/modules"
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
	inferencer      *types.TypeInferencer
	currentFunction *ast.FunctionDeclaration // Track current function for return type checking
	config          *CompilerConfig          // Compiler configuration
}

// CompilerConfig holds the compiler options for type checking
type CompilerConfig struct {
	NoImplicitAny              bool
	StrictNullChecks           bool
	StrictFunctionTypes        bool
	NoUnusedLocals             bool
	NoUnusedParameters         bool
	NoImplicitReturns          bool
	NoImplicitThis             bool
	StrictBindCallApply        bool
	StrictPropertyInitialization bool
	AlwaysStrict               bool
	AllowUnreachableCode       bool
	AllowUnusedLabels          bool
	NoFallthroughCasesInSwitch bool
	NoUncheckedIndexedAccess   bool
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
	inferencer := types.NewTypeInferencer(globalEnv)
	inferencer.SetTypeCache(typeCache)

	return &TypeChecker{
		symbolTable:  symbols.NewSymbolTable(),
		errors:       []TypeError{},
		globalEnv:    globalEnv,
		typeCache:    typeCache,
		varTypeCache: make(map[string]*types.Type),
		inferencer:   inferencer,
		config:       getDefaultConfig(),
	}
}

// getDefaultConfig returns default compiler configuration
func getDefaultConfig() *CompilerConfig {
	return &CompilerConfig{
		NoImplicitAny:              false,
		StrictNullChecks:           false,
		StrictFunctionTypes:        false,
		NoUnusedLocals:             false,
		NoUnusedParameters:         false,
		NoImplicitReturns:          false,
		NoImplicitThis:             false,
		StrictBindCallApply:        false,
		StrictPropertyInitialization: false,
		AlwaysStrict:               false,
		AllowUnreachableCode:       true,
		AllowUnusedLabels:          true,
		NoFallthroughCasesInSwitch: false,
		NoUncheckedIndexedAccess:   false,
	}
}

// NewWithModuleResolver creates a new type checker with module resolution support
func NewWithModuleResolver(rootDir string) *TypeChecker {
	symbolTable := symbols.NewSymbolTable()
	moduleResolver := modules.NewModuleResolver(rootDir, symbolTable)
	globalEnv := types.NewGlobalEnvironment()
	typeCache := make(map[ast.Node]*types.Type)
	inferencer := types.NewTypeInferencer(globalEnv)
	inferencer.SetTypeCache(typeCache)

	return &TypeChecker{
		symbolTable:    symbolTable,
		errors:         []TypeError{},
		moduleResolver: moduleResolver,
		globalEnv:      globalEnv,
		typeCache:      typeCache,
		config:         getDefaultConfig(),
		varTypeCache:   make(map[string]*types.Type),
		inferencer:     inferencer,
	}
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
	default:
		// Unknown statement type
		tc.addError(filename, stmt.Pos().Line, stmt.Pos().Column,
			fmt.Sprintf("Unknown statement type: %T", stmt), "TS9999", "error")
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

				// Store the inferred type in the cache
				tc.typeCache[declarator] = inferredType
				tc.typeCache[declarator.ID] = inferredType

				// Also store it by variable name for easy lookup
				tc.varTypeCache[declarator.ID.Name] = inferredType
			} else if declarator.TypeAnnotation == nil {
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
			tc.checkExpression(prop.Value, filename)
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
	default:
		// Unknown expression type
		tc.addError(filename, expr.Pos().Line, expr.Pos().Column,
			fmt.Sprintf("Unknown expression type: %T", expr), "TS9999", "error")
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

func (tc *TypeChecker) checkIdentifier(id *ast.Identifier, filename string) {
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
			if !symbol.IsFunction {
				msg := fmt.Sprintf("This expression is not callable. Type '%s' has no call signatures.", id.Name)
				msg += "\n  Sugerencia: Verifica que estés llamando a una función y no a una variable"
				tc.addError(filename, call.Pos().Line, call.Pos().Column, msg, "TS2349", "error")
			} else {
				// Check parameter count
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

func (tc *TypeChecker) checkArrowFunction(arrow *ast.ArrowFunctionExpression, filename string) {
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

	// Check the property
	if !member.Computed {
		// Property is an identifier
		if id, ok := member.Property.(*ast.Identifier); ok {
			// For now, we just check if the identifier is valid
			// In a full implementation, we would check if the property exists
			// on the object's type
			if !isValidIdentifier(id.Name) {
				tc.addError(filename, id.Pos().Line, id.Pos().Column,
					fmt.Sprintf("Invalid property name: '%s'", id.Name), "TS1003", "error")
			}
		}
	} else {
		// Property is a computed expression
		tc.checkExpression(member.Property, filename)
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
				matrix[i-1][j]+1,      // deletion
				min(
					matrix[i][j-1]+1,  // insertion
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

		// If not in cache, try to infer from the symbol table
		if symbol, exists := tc.symbolTable.ResolveSymbol(id.Name); exists {
			// Check if we have a cached type for the symbol's declaration
			if symbol.Node != nil {
				// Try to get the type from the declarator
				if declarator, ok := symbol.Node.(*ast.VariableDeclarator); ok {
					// If the declarator has an initializer, infer from it
					if declarator.Init != nil {
						inferredType := tc.inferencer.InferType(declarator.Init)
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

	// Check if we have a cached type for this expression
	if cachedType, ok := tc.typeCache[expr]; ok {
		return cachedType
	}

	// Otherwise, infer the type
	inferredType := tc.inferencer.InferType(expr)
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
	// Type aliases are just declarations, no runtime checking needed
	// We just verify the name is valid
	if decl.ID != nil && !isValidIdentifier(decl.ID.Name) {
		tc.addError(filename, decl.ID.Pos().Line, decl.ID.Pos().Column,
			fmt.Sprintf("Invalid type name: '%s'", decl.ID.Name), "TS1003", "error")
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
