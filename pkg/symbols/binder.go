package symbols

import (
	"fmt"
	"os"

	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// Binder visits AST nodes and builds the symbol table
type Binder struct {
	table               *SymbolTable
	paramTypeInferencer types.ParameterTypeInferencer
}

// NewBinder creates a new binder
func NewBinder(table *SymbolTable) *Binder {
	return &Binder{
		table: table,
	}
}

// SetParameterTypeInferencer sets the inferencer for destructured parameters
func (b *Binder) SetParameterTypeInferencer(inferencer types.ParameterTypeInferencer) {
	b.paramTypeInferencer = inferencer
}

// BindFile binds all symbols in a file
func (b *Binder) BindFile(file *ast.File) {
	for _, stmt := range file.Body {
		b.bindStatement(stmt)
	}
}

func (b *Binder) bindStatement(stmt ast.Statement) {
	switch s := stmt.(type) {
	case *ast.VariableDeclaration:
		b.bindVariableDeclaration(s)
	case *ast.FunctionDeclaration:
		b.bindFunctionDeclaration(s)
	case *ast.BlockStatement:
		b.bindBlockStatement(s)
	case *ast.ReturnStatement:
		b.bindReturnStatement(s)
	case *ast.ExpressionStatement:
		b.bindExpression(s.Expression)
	case *ast.IfStatement:
		b.bindIfStatement(s)
	case *ast.ImportDeclaration:
		b.bindImportDeclaration(s)
	case *ast.ExportDeclaration:
		b.bindExportDeclaration(s)
	case *ast.ForStatement:
		b.bindForStatement(s)
	case *ast.WhileStatement:
		b.bindWhileStatement(s)
	case *ast.TypeAliasDeclaration:
		b.bindTypeAliasDeclaration(s)
	case *ast.InterfaceDeclaration:
		b.bindInterfaceDeclaration(s)
	case *ast.ClassDeclaration:
		b.bindClassDeclaration(s)
	case *ast.SwitchStatement:
		b.bindSwitchStatement(s)
	case *ast.TryStatement:
		b.bindTryStatement(s)
	case *ast.ThrowStatement:
		b.bindThrowStatement(s)
	case *ast.BreakStatement:
		b.bindBreakStatement(s)
	case *ast.ContinueStatement:
		b.bindContinueStatement(s)
	default:
		// Unknown statement type
		fmt.Printf("Warning: Unknown statement type: %T\n", stmt)
	}
}

func (b *Binder) bindVariableDeclaration(decl *ast.VariableDeclaration) {
	mutable := decl.Kind != "const"

	for _, declarator := range decl.Decls {
		if declarator.ID != nil {
			// Check if the initializer is a function (arrow or regular)
			symbolType := VariableSymbol
			isFunction := false
			var params []string

			if declarator.Init != nil {
				switch init := declarator.Init.(type) {
				case *ast.ArrowFunctionExpression:
					symbolType = FunctionSymbol
					isFunction = true
					for _, param := range init.Params {
						if param.ID != nil {
							params = append(params, param.ID.Name)
						}
					}
				case *ast.Identifier:
					// Check if this is a destructured binding from a known global
					// (e.g., const { ref, computed } = Vue)
					// In this case, assume the extracted properties might be callable
					if init.Name == "Vue" || init.Name == "Vuex" || init.Name == "Swal" {
						isFunction = true
					}
				}
			}

			// Define the variable symbol
			symbol := b.table.DefineSymbol(declarator.ID.Name, symbolType, declarator, mutable)
			symbol.IsFunction = isFunction
			symbol.Params = params

			// If there's an initializer, bind it
			if declarator.Init != nil {
				b.bindExpression(declarator.Init)
			}
		}
	}
}

func (b *Binder) bindFunctionDeclaration(decl *ast.FunctionDeclaration) {
	// Define the function symbol in the current scope
	b.table.DefineFunction(decl.ID.Name, decl)

	// Create a new scope for the function body
	b.table.EnterScope(decl)

	// Define parameters in the function scope
	for paramIdx, param := range decl.Params {
		if param.ID != nil {
			symbol := b.table.DefineSymbol(param.ID.Name, ParameterSymbol, param, false)

			// Try to infer type for destructured parameters using loaded type definitions
			if b.paramTypeInferencer != nil {
				inferredType := b.paramTypeInferencer.InferDestructuredParamType(
					decl.ID.Name,
					paramIdx,
					param.ID.Name,
				)

				if inferredType != nil && inferredType.IsFunction {
					symbol.IsFunction = true
				}
			}
		}
	}

	// Bind the function body
	if decl.Body != nil {
		b.bindBlockStatement(decl.Body)
	}

	// Exit the function scope
	b.table.ExitScope()
}

func (b *Binder) bindBlockStatement(block *ast.BlockStatement) {
	// Create a new scope for the block
	b.table.EnterScope(block)

	// Bind all statements in the block
	for _, stmt := range block.Body {
		b.bindStatement(stmt)
	}

	// Exit the block scope
	b.table.ExitScope()
}

func (b *Binder) bindReturnStatement(ret *ast.ReturnStatement) {
	if ret.Argument != nil {
		b.bindExpression(ret.Argument)
	}
}

func (b *Binder) bindIfStatement(stmt *ast.IfStatement) {
	// Bind the test condition
	b.bindExpression(stmt.Test)

	// Bind the consequent (then branch)
	b.bindStatement(stmt.Consequent)

	// Bind the alternate (else branch) if present
	if stmt.Alternate != nil {
		b.bindStatement(stmt.Alternate)
	}
}

func (b *Binder) bindExpression(expr ast.Expression) {
	if expr == nil {
		return
	}

	switch e := expr.(type) {
	case *ast.Identifier:
		b.bindIdentifier(e)
	case *ast.Literal:
		// Literals don't need binding
		return
	case *ast.CallExpression:
		b.bindCallExpression(e)
	case *ast.MemberExpression:
		b.bindMemberExpression(e)
	case *ast.BinaryExpression:
		b.bindBinaryExpression(e)
	case *ast.ArrayExpression:
		// Bind all elements
		for _, elem := range e.Elements {
			b.bindExpression(elem)
		}
	case *ast.ObjectExpression:
		// Bind all property values
		for _, prop := range e.Properties {
			switch p := prop.(type) {
			case *ast.Property:
				// Check if the property value is a function expression
				if fnExpr, ok := p.Value.(*ast.FunctionExpression); ok {
					b.bindFunctionExpression(fnExpr)
				} else {
					b.bindExpression(p.Value)
				}
			case *ast.SpreadElement:
				b.bindExpression(p.Argument)
			}
		}
	case *ast.ArrowFunctionExpression:
		b.bindArrowFunction(e)
	case *ast.FunctionExpression:
		b.bindFunctionExpression(e)
	case *ast.AssignmentExpression:
		b.bindExpression(e.Left)
		b.bindExpression(e.Right)
	case *ast.UnaryExpression:
		b.bindExpression(e.Argument)
	case *ast.NewExpression:
		b.bindExpression(e.Callee)
		for _, arg := range e.Arguments {
			b.bindExpression(arg)
		}
	case *ast.ThisExpression:
		// 'this' doesn't need binding
		return
	case *ast.SuperExpression:
		// 'super' doesn't need binding
		return
	case *ast.ConditionalExpression:
		b.bindConditionalExpression(e)
	default:
		// Unknown expression type
		fmt.Printf("Warning: Unknown expression type: %T\n", expr)
	}
}

func (b *Binder) bindIdentifier(id *ast.Identifier) {
	// Check if the identifier is defined
	if _, exists := b.table.ResolveSymbol(id.Name); !exists {
		// This will be reported as an error during type checking
		// For now, we just note that it's an unresolved reference
		return
	}
}

func (b *Binder) bindCallExpression(call *ast.CallExpression) {
	// Bind the callee
	b.bindExpression(call.Callee)

	// Special handling for defineComponent with setup function
	if id, ok := call.Callee.(*ast.Identifier); ok {
		if id.Name == "defineComponent" && len(call.Arguments) > 0 {
			b.bindDefineComponentArgument(call.Arguments[0])
			// Bind remaining arguments normally
			for i := 1; i < len(call.Arguments); i++ {
				b.bindExpression(call.Arguments[i])
			}
		} else {
			// Bind all arguments normally
			for _, arg := range call.Arguments {
				b.bindExpression(arg)
			}
			b.table.CheckFunctionCall(id.Name, call.Pos(), len(call.Arguments))
		}
	} else {
		// Bind all arguments normally
		for _, arg := range call.Arguments {
			b.bindExpression(arg)
		}
	}
}

// bindDefineComponentArgument handles the object argument of defineComponent
func (b *Binder) bindDefineComponentArgument(arg ast.Expression) {
	objExpr, ok := arg.(*ast.ObjectExpression)
	if !ok {
		b.bindExpression(arg)
		return
	}

	// Look for the 'setup' property
	for _, prop := range objExpr.Properties {
		property, ok := prop.(*ast.Property)
		if !ok {
			continue
		}

		key, ok := property.Key.(*ast.Identifier)
		if !ok {
			b.bindExpression(property.Value)
			continue
		}

		if key.Name != "setup" {
			// Bind non-setup properties normally
			b.bindExpression(property.Value)
			continue
		}

		// Found setup function - bind with special context
		switch fnValue := property.Value.(type) {
		case *ast.FunctionExpression:
			b.bindSetupFunction(fnValue)
		case *ast.ArrowFunctionExpression:
			b.bindSetupArrowFunction(fnValue)
		default:
			b.bindExpression(property.Value)
		}
	}
}

func (b *Binder) bindMemberExpression(member *ast.MemberExpression) {
	// Bind the object
	b.bindExpression(member.Object)

	// Bind the property
	if !member.Computed {
		// Property is an identifier
		if id, ok := member.Property.(*ast.Identifier); ok {
			// Check if the property exists on the object type
			// This is a simplified check - in a real implementation,
			// you would need to know the type of the object
			_ = id
		}
	} else {
		// Property is a computed expression
		b.bindExpression(member.Property)
	}
}

func (b *Binder) bindBinaryExpression(expr *ast.BinaryExpression) {
	// Bind both operands
	b.bindExpression(expr.Left)
	b.bindExpression(expr.Right)
}

func (b *Binder) bindImportDeclaration(decl *ast.ImportDeclaration) {
	// Register the import in the symbol table
	if decl.Source != nil && decl.Source.Value != nil {
		moduleName, ok := decl.Source.Value.(string)
		if ok {
			for _, spec := range decl.Specifiers {
				if spec.Local != nil {
					// Create an import symbol that references the module
					b.table.AddImport(moduleName, spec.Local.Name, "", false, false)

					// Also register the imported identifier as a symbol in the current scope
					// so it can be resolved during type checking
					// This prevents cascade "Cannot find name" errors when module resolution fails
					symbol := &Symbol{
						Name:     spec.Local.Name,
						Type:     VariableSymbol,
						Node:     decl,
						Mutable:  false,
						Scope:    b.table.Current,
						DeclSpan: spec.Local.Position,
						Hoisted:  false,
					}
					b.table.Current.Symbols[spec.Local.Name] = symbol
				}
			}
		}
	}
}

func (b *Binder) bindExportDeclaration(decl *ast.ExportDeclaration) {
	if decl.Declaration != nil {
		// Handle export declarations like export function, export const, etc.
		switch d := decl.Declaration.(type) {
		case *ast.FunctionDeclaration:
			// First bind the function normally
			b.bindFunctionDeclaration(d)
			// Then mark it as exported
			if symbol, exists := b.table.ResolveSymbol(d.ID.Name); exists {
				b.table.AddExport("", d.ID.Name, symbol)
			}
		case *ast.VariableDeclaration:
			// First bind the variables normally
			b.bindVariableDeclaration(d)
			// Then mark them as exported
			for _, declarator := range d.Decls {
				if declarator.ID != nil {
					if symbol, exists := b.table.ResolveSymbol(declarator.ID.Name); exists {
						b.table.AddExport("", declarator.ID.Name, symbol)
					}
				}
			}
		}
	} else if len(decl.Specifiers) > 0 && decl.Source != nil {
		// Handle re-exports: export { name } from "module"
		if decl.Source.Value != nil {
			moduleName, ok := decl.Source.Value.(string)
			if ok {
				for _, spec := range decl.Specifiers {
					if spec.Local != nil && spec.Exported != nil {
						// This is a re-export, we'll resolve it during type checking
						b.table.AddExport(moduleName, spec.Exported.Name, nil)
					}
				}
			}
		}
	} else if len(decl.Specifiers) > 0 {
		// Handle local exports: export { name1, name2 }
		for _, spec := range decl.Specifiers {
			if spec.Local != nil && spec.Exported != nil {
				if symbol, exists := b.table.ResolveSymbol(spec.Local.Name); exists {
					b.table.AddExport("", spec.Exported.Name, symbol)
				}
			}
		}
	}
}

func (b *Binder) bindForStatement(stmt *ast.ForStatement) {
	// Create a new scope for the for loop
	b.table.EnterScope(stmt)

	// Bind init
	if stmt.Init != nil {
		switch init := stmt.Init.(type) {
		case *ast.VariableDeclaration:
			b.bindVariableDeclaration(init)
		case *ast.ExpressionStatement:
			b.bindExpression(init.Expression)
		}
	}

	// Bind test
	if stmt.Test != nil {
		b.bindExpression(stmt.Test)
	}

	// Bind update
	if stmt.Update != nil {
		b.bindExpression(stmt.Update)
	}

	// Bind body
	if stmt.Body != nil {
		b.bindStatement(stmt.Body)
	}

	b.table.ExitScope()
}

func (b *Binder) bindWhileStatement(stmt *ast.WhileStatement) {
	// Bind test
	b.bindExpression(stmt.Test)

	// Bind body
	if stmt.Body != nil {
		b.bindStatement(stmt.Body)
	}
}

func (b *Binder) bindSwitchStatement(stmt *ast.SwitchStatement) {
	// Bind discriminant
	if stmt.Discriminant != nil {
		b.bindExpression(stmt.Discriminant)
	}

	// Bind all cases
	for _, switchCase := range stmt.Cases {
		// Bind test expression (nil for default case)
		if switchCase.Test != nil {
			b.bindExpression(switchCase.Test)
		}

		// Bind all consequent statements
		for _, consequent := range switchCase.Consequent {
			b.bindStatement(consequent)
		}
	}
}

func (b *Binder) bindConditionalExpression(expr *ast.ConditionalExpression) {
	// Bind test (condition)
	if expr.Test != nil {
		b.bindExpression(expr.Test)
	}

	// Bind consequent (true branch)
	if expr.Consequent != nil {
		b.bindExpression(expr.Consequent)
	}

	// Bind alternate (false branch)
	if expr.Alternate != nil {
		b.bindExpression(expr.Alternate)
	}
}

func (b *Binder) bindFunctionExpression(fnExpr *ast.FunctionExpression) {
	// Create a new scope for the function expression
	b.table.EnterScope(fnExpr)

	// If the function has a name, define it in the function's own scope
	// This allows the function to call itself recursively
	if fnExpr.ID != nil {
		symbol := b.table.DefineSymbol(fnExpr.ID.Name, FunctionSymbol, fnExpr, false)
		symbol.IsFunction = true
	}

	// Define parameters in the function scope
	for _, param := range fnExpr.Params {
		if param.ID != nil {
			b.table.DefineSymbol(param.ID.Name, ParameterSymbol, param, false)
		}
	}

	// Bind the function body
	if fnExpr.Body != nil {
		b.bindBlockStatement(fnExpr.Body)
	}

	// Exit the function scope
	b.table.ExitScope()
}

// bindSetupFunction handles Vue's setup function with type inference
func (b *Binder) bindSetupFunction(fnExpr *ast.FunctionExpression) {
	// Create a new scope for the function expression
	b.table.EnterScope(fnExpr)

	// Define parameters with type inference for destructured properties
	for paramIdx, param := range fnExpr.Params {
		if param.ID != nil {
			symbol := b.table.DefineSymbol(param.ID.Name, ParameterSymbol, param, false)

			// Try to infer type for destructured parameters
			if b.paramTypeInferencer != nil {
				inferredType := b.paramTypeInferencer.InferDestructuredParamType(
					"setup", // Vue's setup function
					paramIdx,
					param.ID.Name,
				)

				if inferredType != nil && inferredType.IsFunction {
					symbol.IsFunction = true
				}
			}
		}
	}

	// Bind the function body
	if fnExpr.Body != nil {
		b.bindBlockStatement(fnExpr.Body)
	}

	// Exit the function scope
	b.table.ExitScope()
}

// bindSetupArrowFunction handles Vue's setup arrow function with type inference
func (b *Binder) bindSetupArrowFunction(arrow *ast.ArrowFunctionExpression) {
	// Create a new scope for the arrow function
	b.table.EnterScope(arrow)

	// Define parameters with type inference for destructured properties
	for paramIdx, param := range arrow.Params {
		if param.ID != nil {
			symbol := b.table.DefineSymbol(param.ID.Name, ParameterSymbol, param, false)

			// Try to infer type for destructured parameters
			if b.paramTypeInferencer != nil {
				inferredType := b.paramTypeInferencer.InferDestructuredParamType(
					"setup", // Vue's setup function
					paramIdx,
					param.ID.Name,
				)

				if inferredType != nil && inferredType.IsFunction {
					symbol.IsFunction = true
				}
			}
		}
	}

	// Bind the body
	switch body := arrow.Body.(type) {
	case *ast.BlockStatement:
		b.bindBlockStatement(body)
	case ast.Expression:
		b.bindExpression(body)
	}

	// Exit the function scope
	b.table.ExitScope()
}

func (b *Binder) bindArrowFunction(arrow *ast.ArrowFunctionExpression) {
	// Create a new scope for the arrow function
	b.table.EnterScope(arrow)

	// Debug logging
	if os.Getenv("TSCHECK_DEBUG_SCOPE") == "1" {
		debugFile, err := os.OpenFile("debug_scope.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err == nil {
			fmt.Fprintf(debugFile, "BINDER: Entered arrow function scope, level: %d, parent symbols: ", b.table.Current.Level)
			if b.table.Current.Parent != nil {
				for name := range b.table.Current.Parent.Symbols {
					fmt.Fprintf(debugFile, "%s ", name)
				}
			}
			fmt.Fprintf(debugFile, "\n")
			debugFile.Close()
		}
	}

	// Define parameters in the function scope
	for _, param := range arrow.Params {
		if param.ID != nil {
			b.table.DefineSymbol(param.ID.Name, ParameterSymbol, param, false)
		}
	}

	// Bind the body
	switch body := arrow.Body.(type) {
	case *ast.BlockStatement:
		b.bindBlockStatement(body)
	case ast.Expression:
		b.bindExpression(body)
	}

	// Exit the function scope
	b.table.ExitScope()
}

func (b *Binder) bindTryStatement(stmt *ast.TryStatement) {
	// Bind the try block
	if stmt.Block != nil {
		b.bindBlockStatement(stmt.Block)
	}

	// Bind the catch clause
	if stmt.Handler != nil {
		// Create a new scope for the catch clause
		b.table.EnterScope(stmt.Handler)

		// Define the catch parameter if present
		if stmt.Handler.Param != nil {
			b.table.DefineSymbol(stmt.Handler.Param.Name, VariableSymbol, stmt.Handler.Param, false)
		}

		// Bind the catch block
		if stmt.Handler.Body != nil {
			b.bindBlockStatement(stmt.Handler.Body)
		}

		b.table.ExitScope()
	}

	// Bind the finally block
	if stmt.Finalizer != nil {
		b.bindBlockStatement(stmt.Finalizer)
	}
}

func (b *Binder) bindThrowStatement(stmt *ast.ThrowStatement) {
	// Bind the expression being thrown
	if stmt.Argument != nil {
		b.bindExpression(stmt.Argument)
	}
}

// GetSymbolTable returns the symbol table
func (b *Binder) GetSymbolTable() *SymbolTable {
	return b.table
}

func (b *Binder) bindTypeAliasDeclaration(decl *ast.TypeAliasDeclaration) {
	// Register the type alias in the symbol table
	if decl.ID != nil {
		b.table.DefineSymbol(decl.ID.Name, TypeAliasSymbol, decl, false)
	}
}

func (b *Binder) bindInterfaceDeclaration(decl *ast.InterfaceDeclaration) {
	// Register the interface in the symbol table
	if decl.ID != nil {
		b.table.DefineSymbol(decl.ID.Name, InterfaceSymbol, decl, false)
	}
}

func (b *Binder) bindClassDeclaration(decl *ast.ClassDeclaration) {
	// Add class to symbol table
	symbol := &Symbol{
		Name:       decl.ID.Name,
		Type:       InterfaceSymbol, // Classes are types
		Node:       decl,
		DeclSpan:   decl.Pos(),
		IsFunction: false,
	}
	b.table.Current.Symbols[symbol.Name] = symbol

	// Create a new scope for the class
	classScope := &Scope{
		Parent:  b.table.Current,
		Symbols: make(map[string]*Symbol),
		Level:   b.table.Current.Level + 1,
		Node:    decl,
	}
	b.table.Current = classScope

	// Bind class members
	for _, member := range decl.Body {
		switch m := member.(type) {
		case *ast.MethodDefinition:
			// Add method to class scope
			methodSymbol := &Symbol{
				Name:       m.Key.Name,
				Type:       FunctionSymbol,
				Node:       m,
				DeclSpan:   m.Pos(),
				IsFunction: true,
			}
			b.table.Current.Symbols[methodSymbol.Name] = methodSymbol

			// Bind method body
			if m.Value != nil && m.Value.Body != nil {
				methodScope := &Scope{
					Parent:  b.table.Current,
					Symbols: make(map[string]*Symbol),
					Level:   b.table.Current.Level + 1,
					Node:    m,
				}
				b.table.Current = methodScope

				// Add parameters to method scope
				if m.Value.Params != nil {
					for _, param := range m.Value.Params {
						if param.ID != nil {
							paramSymbol := &Symbol{
								Name:     param.ID.Name,
								Type:     ParameterSymbol,
								Node:     param,
								DeclSpan: param.Pos(),
							}

							// Mark known Vue composition API context properties as functions
							vueContextFunctions := []string{"emit", "expose"}
							for _, fnName := range vueContextFunctions {
								if param.ID.Name == fnName {
									paramSymbol.IsFunction = true
									break
								}
							}

							b.table.Current.Symbols[paramSymbol.Name] = paramSymbol
						}
					}
				}

				b.bindBlockStatement(m.Value.Body)
				b.table.Current = methodScope.Parent
			}

		case *ast.PropertyDefinition:
			// Add property to class scope
			propSymbol := &Symbol{
				Name:     m.Key.Name,
				Type:     VariableSymbol,
				Node:     m,
				DeclSpan: m.Pos(),
			}
			b.table.Current.Symbols[propSymbol.Name] = propSymbol

			// Bind property initializer if present
			if m.Value != nil {
				b.bindExpression(m.Value)
			}
		}
	}

	// Restore parent scope
	b.table.Current = classScope.Parent
}

func (b *Binder) bindBreakStatement(stmt *ast.BreakStatement) {
	// Break statements don't introduce new symbols
	// Just validate that we're inside a loop or switch (could be added later)
	// For now, just accept it
	if stmt.Label != nil {
		// If there's a label, we could check if it exists
		// But for simplicity, we'll skip that for now
		_ = stmt.Label
	}
}

func (b *Binder) bindContinueStatement(stmt *ast.ContinueStatement) {
	// Continue statements don't introduce new symbols
	// Just validate that we're inside a loop (could be added later)
	// For now, just accept it
	if stmt.Label != nil {
		// If there's a label, we could check if it exists
		// But for simplicity, we'll skip that for now
		_ = stmt.Label
	}
}
