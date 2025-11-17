package symbols

import (
	"fmt"

	"tstypechecker/pkg/ast"
)

// Binder visits AST nodes and builds the symbol table
type Binder struct {
	table *SymbolTable
}

// NewBinder creates a new binder
func NewBinder(table *SymbolTable) *Binder {
	return &Binder{
		table: table,
	}
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
	for _, param := range decl.Params {
		if param.ID != nil {
			b.table.DefineSymbol(param.ID.Name, ParameterSymbol, param, false)
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
			b.bindExpression(prop.Value)
		}
	case *ast.ArrowFunctionExpression:
		b.bindArrowFunction(e)
	case *ast.AssignmentExpression:
		b.bindExpression(e.Left)
		b.bindExpression(e.Right)
	case *ast.UnaryExpression:
		b.bindExpression(e.Argument)
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

	// Bind all arguments
	for _, arg := range call.Arguments {
		b.bindExpression(arg)
	}

	// Check if it's a valid function call
	if id, ok := call.Callee.(*ast.Identifier); ok {
		b.table.CheckFunctionCall(id.Name, call.Pos(), len(call.Arguments))
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

func (b *Binder) bindArrowFunction(arrow *ast.ArrowFunctionExpression) {
	// Create a new scope for the arrow function
	b.table.EnterScope(arrow)

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

// GetSymbolTable returns the symbol table
func (b *Binder) GetSymbolTable() *SymbolTable {
	return b.table
}


func (b *Binder) bindTypeAliasDeclaration(decl *ast.TypeAliasDeclaration) {
	// Register the type alias in the symbol table
	if decl.ID != nil {
		b.table.DefineSymbol(decl.ID.Name, TypeSymbol, decl, false)
	}
}

func (b *Binder) bindInterfaceDeclaration(decl *ast.InterfaceDeclaration) {
	// Register the interface in the symbol table
	if decl.ID != nil {
		b.table.DefineSymbol(decl.ID.Name, TypeSymbol, decl, false)
	}
}
