package checker

import (
	"fmt"
	"os"

	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

// checkStatement dispatches to the appropriate statement checker
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
	case *ast.ModuleDeclaration:
		// Ambient module declarations (declare module 'name' { ... })
		// These are type-only declarations and don't need runtime checking
		// We just skip them silently
		return
	case *ast.EnumDeclaration:
		tc.checkEnumDeclaration(s, filename)
	case *ast.NamespaceDeclaration:
		tc.checkNamespaceDeclaration(s, filename)
	default:
		// Unknown statement type - just a warning, don't block compilation
		fmt.Fprintf(os.Stderr, "Warning: Unknown statement type: %T\n", stmt)
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

		// Get declared return type from current function
		if tc.currentFunction != nil {
			declaredReturnType := tc.getDeclaredReturnType(tc.currentFunction)

			if declaredReturnType != nil {
				// Validate against declared return type
				if !tc.isAssignableTo(returnType, declaredReturnType) {
					msg := fmt.Sprintf("Type '%s' is not assignable to type '%s'.", returnType.String(), declaredReturnType.String())
					tc.addError(filename, ret.Argument.Pos().Line, ret.Argument.Pos().Column, msg, "TS2322", "error")
				}
			} else {
				// No declared return type - validate consistency between returns
				existingReturnType, exists := tc.typeCache[tc.currentFunction]
				if exists {
					if !tc.isAssignableTo(returnType, existingReturnType) {
						msg := fmt.Sprintf("Type '%s' is not assignable to type '%s'.", returnType.String(), existingReturnType.String())
						msg += "\n  Sugerencia: Todas las rutas de retorno deben devolver el mismo tipo"
						tc.addError(filename, ret.Argument.Pos().Line, ret.Argument.Pos().Column, msg, "TS2322", "error")
					}
				} else {
					tc.typeCache[tc.currentFunction] = returnType
				}
			}
		}
	} else {
		// Return without value (void)
		if tc.currentFunction != nil {
			declaredReturnType := tc.getDeclaredReturnType(tc.currentFunction)

			if declaredReturnType != nil {
				// Validate void return against declared type
				if declaredReturnType.Kind != types.VoidType && declaredReturnType.Kind != types.AnyType && declaredReturnType.Kind != types.UndefinedType {
					msg := "A function whose declared type is neither 'void' nor 'any' must return a value."
					tc.addError(filename, ret.Pos().Line, ret.Pos().Column, msg, "TS2355", "error")
				}
			} else {
				// No declared type - track void
				existingReturnType, exists := tc.typeCache[tc.currentFunction]
				if exists && existingReturnType.Kind != types.VoidType && existingReturnType.Kind != types.AnyType {
					msg := "A function whose declared type is neither 'void' nor 'any' must return a value."
					msg += "\n  Sugerencia: Agrega un valor de retorno o cambia el tipo de retorno a 'void'"
					tc.addError(filename, ret.Pos().Line, ret.Pos().Column, msg, "TS2355", "error")
				} else if !exists {
					tc.typeCache[tc.currentFunction] = types.Void
				}
			}
		}
	}
}

func (tc *TypeChecker) checkIfStatement(stmt *ast.IfStatement, filename string) {
	// Check the test condition
	tc.checkExpression(stmt.Test, filename)

	// Detect type guards
	var typeGuardVars []string

	var detectGuard func(expr ast.Expression)
	detectGuard = func(expr ast.Expression) {
		if binExpr, ok := expr.(*ast.BinaryExpression); ok {
			if binExpr.Operator == "&&" {
				detectGuard(binExpr.Left)
				detectGuard(binExpr.Right)
				return
			}

			// Type guard 1: if (variable instanceof Function)
			if binExpr.Operator == "instanceof" {
				if leftId, ok := binExpr.Left.(*ast.Identifier); ok {
					if rightId, ok := binExpr.Right.(*ast.Identifier); ok {
						if rightId.Name == "Function" {
							typeGuardVars = append(typeGuardVars, leftId.Name)
							tc.typeGuards[leftId.Name] = true
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
								val := fmt.Sprintf("%v", literal.Value)
								if val == "function" || val == "'function'" || val == "\"function\"" {
									typeGuardVars = append(typeGuardVars, argId.Name)
									tc.typeGuards[argId.Name] = true
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
								val := fmt.Sprintf("%v", literal.Value)
								if val == "function" || val == "'function'" || val == "\"function\"" {
									typeGuardVars = append(typeGuardVars, argId.Name)
									tc.typeGuards[argId.Name] = true
								}
							}
						}
					}
				}
			}
		}
	}

	detectGuard(stmt.Test)

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
	for _, v := range typeGuardVars {
		delete(tc.typeGuards, v)
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

// getDeclaredReturnType extracts the declared return type from a function node
// Supports FunctionDeclaration and FunctionExpression
// Note: ArrowFunctionExpression doesn't currently capture ReturnType in the AST
func (tc *TypeChecker) getDeclaredReturnType(funcNode ast.Node) *types.Type {
	if funcNode == nil {
		return nil
	}

	var returnType *types.Type
	var isAsync bool

	switch fn := funcNode.(type) {
	case *ast.FunctionDeclaration:
		if fn.ReturnType != nil {
			returnType = tc.convertTypeNode(fn.ReturnType)
			isAsync = fn.Async
		}

	case *ast.FunctionExpression:
		if fn.ReturnType != nil {
			returnType = tc.convertTypeNode(fn.ReturnType)
			isAsync = fn.Async
		}

	case *ast.ArrowFunctionExpression:
		// ArrowFunctionExpression in the current AST doesn't have a ReturnType field
		// This would need to be added to the AST and parser to support: (x: number): string => ...
		return nil
	}

	// For async functions, unwrap Promise<T> to get T
	// Because return statements in async functions return T, not Promise<T>
	if returnType != nil && isAsync {
		return tc.unwrapPromiseType(returnType)
	}

	return returnType
}

// unwrapPromiseType extracts T from Promise<T>
func (tc *TypeChecker) unwrapPromiseType(t *types.Type) *types.Type {
	if t == nil {
		return nil
	}

	// Check if this is Promise<T>
	if t.Kind == types.ObjectType && t.Name == "Promise" && len(t.TypeArguments) > 0 {
		return t.TypeArguments[0]
	}

	// Not a Promise type, return as-is
	return t
}
