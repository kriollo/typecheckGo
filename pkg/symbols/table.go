package symbols

import (
	"fmt"
	"strings"

	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// Symbol represents a symbol in the symbol table
type Symbol struct {
	Name         string
	Type         SymbolType
	Node         ast.Node
	Mutable      bool
	Scope        *Scope
	DeclSpan     ast.Position
	Hoisted      bool
	IsFunction   bool
	Params       []string
	FromDTS      bool // True if this symbol was loaded from a .d.ts file
	ResolvedType *types.Type
	UpdateCache  func(*types.Type)
}

// SymbolType represents the type of symbol
type SymbolType int

const (
	VariableSymbol SymbolType = iota
	FunctionSymbol
	ParameterSymbol
	ModuleSymbol
	InterfaceSymbol
	TypeAliasSymbol
	EnumSymbol
	ClassSymbol
)

func (st SymbolType) String() string {
	switch st {
	case VariableSymbol:
		return "variable"
	case FunctionSymbol:
		return "function"
	case ParameterSymbol:
		return "parameter"
	case ModuleSymbol:
		return "module"
	case InterfaceSymbol:
		return "interface"
	case TypeAliasSymbol:
		return "type alias"
	case EnumSymbol:
		return "enum"
	case ClassSymbol:
		return "class"
	default:
		return "unknown"
	}
}

// Scope represents a scope in the symbol table
type Scope struct {
	Parent   *Scope
	Symbols  map[string]*Symbol
	Children []*Scope
	Level    int
	Node     ast.Node // The AST node that created this scope
}

// SymbolTable manages all symbols and scopes
type SymbolTable struct {
	Global  *Scope
	Current *Scope
	Modules map[string]*ModuleInfo
	Errors  []SymbolError
}

// ModuleInfo contains information about a module
type ModuleInfo struct {
	Name       string
	Path       string
	Exports    map[string]*Symbol
	Imports    map[string]*ImportInfo
	IsExternal bool
}

// ImportInfo contains information about an import
type ImportInfo struct {
	LocalName   string
	ModuleName  string
	ExportName  string
	IsDefault   bool
	IsNamespace bool
}

// SymbolError represents a symbol-related error
type SymbolError struct {
	Message  string
	Position ast.Position
	Code     string
	Severity string
}

func (e SymbolError) Error() string {
	return e.Message
}

// NewSymbolTable creates a new symbol table
func NewSymbolTable() *SymbolTable {
	global := &Scope{
		Parent:  nil,
		Symbols: make(map[string]*Symbol),
		Level:   0,
	}

	return &SymbolTable{
		Global:  global,
		Current: global,
		Modules: make(map[string]*ModuleInfo),
		Errors:  []SymbolError{},
	}
}

// EnterScope creates a new scope and makes it current
func (st *SymbolTable) EnterScope(node ast.Node) *Scope {
	scope := &Scope{
		Parent:  st.Current,
		Symbols: make(map[string]*Symbol),
		Level:   st.Current.Level + 1,
		Node:    node,
	}

	st.Current.Children = append(st.Current.Children, scope)
	st.Current = scope
	return scope
}

// ExitScope returns to the parent scope
func (st *SymbolTable) ExitScope() {
	if st.Current.Parent != nil {
		st.Current = st.Current.Parent
	}
}

// DefineSymbol defines a new symbol in the current scope
func (st *SymbolTable) DefineSymbol(name string, symbolType SymbolType, node ast.Node, mutable bool) *Symbol {
	// Check if symbol already exists in current scope
	if existing, exists := st.Current.Symbols[name]; exists {
		// If the new call has no node but existing has one, preserve the existing node
		// This prevents optimized loaders from overwriting properly parsed symbols
		if node == nil && existing.Node != nil {
			// Just return the existing symbol without modification
			return existing
		}

		// Only add error if node is not nil
		if node != nil {
			st.addError(fmt.Sprintf("'%s' is already defined", name),
				node.Pos(), "TS2451", "error")
		}
		return existing
	}

	// Get position from node if available, otherwise use zero position
	var declSpan ast.Position
	if node != nil {
		declSpan = node.Pos()
	}

	symbol := &Symbol{
		Name:     name,
		Type:     symbolType,
		Node:     node,
		Mutable:  mutable,
		Scope:    st.Current,
		DeclSpan: declSpan,
	}

	st.Current.Symbols[name] = symbol
	return symbol
}

// DefineFunction defines a function symbol
func (st *SymbolTable) DefineFunction(name string, node *ast.FunctionDeclaration) *Symbol {
	symbol := st.DefineSymbol(name, FunctionSymbol, node, false)
	symbol.IsFunction = true

	// Extract parameter names
	var params []string
	for _, param := range node.Params {
		if param.ID != nil {
			params = append(params, param.ID.Name)
		}
	}
	symbol.Params = params

	return symbol
}

// ResolveSymbol looks up a symbol by name, searching up the scope chain
func (st *SymbolTable) ResolveSymbol(name string) (*Symbol, bool) {
	scope := st.Current
	for scope != nil {
		if symbol, exists := scope.Symbols[name]; exists {
			return symbol, true
		}
		scope = scope.Parent
	}
	return nil, false
}

// ResolveSymbolInScope looks up a symbol in a specific scope
func (st *SymbolTable) ResolveSymbolInScope(name string, scope *Scope) (*Symbol, bool) {
	if scope == nil {
		return nil, false
	}

	symbol, exists := scope.Symbols[name]
	return symbol, exists
}

// CheckSymbolUsage checks if a symbol is used correctly
func (st *SymbolTable) CheckSymbolUsage(name string, usagePos ast.Position, expectedType SymbolType) bool {
	symbol, exists := st.ResolveSymbol(name)
	if !exists {
		st.addError(fmt.Sprintf("Cannot find name '%s'", name), usagePos, "TS2304", "error")
		return false
	}

	// Check type compatibility
	if expectedType != VariableSymbol && symbol.Type != expectedType {
		st.addError(fmt.Sprintf("'%s' is a %s, expected %s", name, symbol.Type, expectedType),
			usagePos, "TS2322", "error")
		return false
	}

	return true
}

// CheckFunctionCall checks if a function call is valid
func (st *SymbolTable) CheckFunctionCall(name string, usagePos ast.Position, argCount int) bool {
	// Debug logging for emit
	// Debug logging removed for performance

	symbol, exists := st.ResolveSymbol(name)
	if !exists {
		st.addError(fmt.Sprintf("Cannot find name '%s'", name), usagePos, "TS2304", "error")
		return false
	}

	if !symbol.IsFunction {
		st.addError(fmt.Sprintf("'%s' is not a function", name), usagePos, "TS2349", "error")
		return false
	}

	// Check parameter count
	expectedCount := len(symbol.Params)
	if argCount != expectedCount {
		st.addError(fmt.Sprintf("Expected %d arguments, but got %d", expectedCount, argCount),
			usagePos, "TS2554", "error")
		return false
	}

	return true
}

// GetErrors returns all symbol errors
func (st *SymbolTable) GetErrors() []SymbolError {
	return st.Errors
}

// GetErrorCount returns the number of errors
func (st *SymbolTable) GetErrorCount() int {
	return len(st.Errors)
}

// ClearErrors clears all errors
func (st *SymbolTable) ClearErrors() {
	st.Errors = []SymbolError{}
}

// Dump returns a string representation of the symbol table
func (st *SymbolTable) Dump() string {
	var builder strings.Builder
	builder.WriteString("Symbol Table:\n")
	st.dumpScope(st.Global, &builder, 0)
	return builder.String()
}

func (st *SymbolTable) dumpScope(scope *Scope, builder *strings.Builder, indent int) {
	indentStr := strings.Repeat("  ", indent)
	builder.WriteString(fmt.Sprintf("%sScope Level %d:\n", indentStr, scope.Level))

	for name, symbol := range scope.Symbols {
		builder.WriteString(fmt.Sprintf("%s  %s: %s (%s)\n", indentStr, name, symbol.Type, symbol.Name))
		if symbol.IsFunction {
			builder.WriteString(fmt.Sprintf("%s    params: %v\n", indentStr, symbol.Params))
		}
	}

	for _, child := range scope.Children {
		st.dumpScope(child, builder, indent+1)
	}
}

// Helper function to add errors
func (st *SymbolTable) addError(message string, pos ast.Position, code, severity string) {
	err := SymbolError{
		Message:  message,
		Position: pos,
		Code:     code,
		Severity: severity,
	}
	st.Errors = append(st.Errors, err)
}

// Module resolution functions
func (st *SymbolTable) DefineModule(name, path string) *ModuleInfo {
	module := &ModuleInfo{
		Name:    name,
		Path:    path,
		Exports: make(map[string]*Symbol),
		Imports: make(map[string]*ImportInfo),
	}

	st.Modules[name] = module
	return module
}

func (st *SymbolTable) GetModule(name string) (*ModuleInfo, bool) {
	module, exists := st.Modules[name]
	return module, exists
}

func (st *SymbolTable) AddExport(moduleName, exportName string, symbol *Symbol) {
	module, exists := st.Modules[moduleName]
	if !exists {
		module = st.DefineModule(moduleName, "")
	}

	module.Exports[exportName] = symbol
}

func (st *SymbolTable) AddImport(moduleName, localName, exportName string, isDefault, isNamespace bool) {
	module, exists := st.Modules[moduleName]
	if !exists {
		module = st.DefineModule(moduleName, "")
	}

	importInfo := &ImportInfo{
		LocalName:   localName,
		ModuleName:  moduleName,
		ExportName:  exportName,
		IsDefault:   isDefault,
		IsNamespace: isNamespace,
	}

	module.Imports[localName] = importInfo
}

// ResetFileScope clears all child scopes from the global scope and resets to global.
// This is used to clean up after processing a file while preserving the global scope.
func (st *SymbolTable) ResetFileScope() {
	// Clear all children from global scope
	st.Global.Children = nil

	// Reset current to global
	st.Current = st.Global

	// Clear module-specific data (but keep global modules if needed)
	// For now, we clear all modules as they are file-specific
	for k := range st.Modules {
		delete(st.Modules, k)
	}
}
