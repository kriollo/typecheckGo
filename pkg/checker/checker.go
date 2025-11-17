package checker

import (
	"fmt"
	"strings"

	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/modules"
)

// TypeChecker coordinates type checking operations
type TypeChecker struct {
	symbolTable    *symbols.SymbolTable
	errors         []TypeError
	moduleResolver *modules.ModuleResolver
	currentFile    string
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
	return &TypeChecker{
		symbolTable: symbols.NewSymbolTable(),
		errors:      []TypeError{},
	}
}

// NewWithModuleResolver creates a new type checker with module resolution support
func NewWithModuleResolver(rootDir string) *TypeChecker {
	symbolTable := symbols.NewSymbolTable()
	moduleResolver := modules.NewModuleResolver(rootDir, symbolTable)

	return &TypeChecker{
		symbolTable:    symbolTable,
		errors:         []TypeError{},
		moduleResolver: moduleResolver,
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
		}

		// Check initializer if present
		if declarator.Init != nil {
			tc.checkExpression(declarator.Init, filename)
		}
	}
}

func (tc *TypeChecker) checkFunctionDeclaration(decl *ast.FunctionDeclaration, filename string) {
	// Check if the function name is valid
	if !isValidIdentifier(decl.ID.Name) {
		tc.addError(filename, decl.ID.Pos().Line, decl.ID.Pos().Column,
			fmt.Sprintf("Invalid function name: '%s'", decl.ID.Name), "TS1003", "error")
	}

	// Check parameter names
	for _, param := range decl.Params {
		if param.ID != nil {
			if !isValidIdentifier(param.ID.Name) {
				tc.addError(filename, param.ID.Pos().Line, param.ID.Pos().Column,
					fmt.Sprintf("Invalid parameter name: '%s'", param.ID.Name), "TS1003", "error")
			}
		}
	}

	// Check function body in the function's scope
	if decl.Body != nil {
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
	default:
		// Unknown expression type
		tc.addError(filename, expr.Pos().Line, expr.Pos().Column,
			fmt.Sprintf("Unknown expression type: %T", expr), "TS9999", "error")
	}
}

func (tc *TypeChecker) checkIdentifier(id *ast.Identifier, filename string) {
	// Check if the identifier is defined
	if _, exists := tc.symbolTable.ResolveSymbol(id.Name); !exists {
		tc.addError(filename, id.Pos().Line, id.Pos().Column,
			fmt.Sprintf("Cannot find name '%s'", id.Name), "TS2304", "error")
	}
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
				tc.addError(filename, call.Pos().Line, call.Pos().Column,
					fmt.Sprintf("'%s' is not a function", id.Name), "TS2349", "error")
			} else {
				// Check parameter count
				expectedCount := len(symbol.Params)
				actualCount := len(call.Arguments)
				if actualCount != expectedCount {
					tc.addError(filename, call.Pos().Line, call.Pos().Column,
						fmt.Sprintf("Expected %d arguments, but got %d", expectedCount, actualCount),
						"TS2554", "error")
				}
			}
		}
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
