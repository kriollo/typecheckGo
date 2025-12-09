package checker

import (
	"fmt"
	"strings"

	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/modules"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

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
					// Excess property checking for object literals
					// TypeScript only applies this in very specific contexts to avoid false positives
					// We skip excess property checking if:
					// 1. The type has an index signature (string or number)
					// 2. The type name suggests it's generic or flexible (contains '<', '&', '|')
					// 3. The type has no properties at all (likely unresolved or 'any'-like)
					if objLit, ok := declarator.Init.(*ast.ObjectExpression); ok && declaredType.Kind == types.ObjectType {
						// Skip excess property checking if type has index signatures
						hasIndexSignature := declaredType.StringIndexType != nil || declaredType.NumberIndexType != nil

						// Validate that properties comply with index signature
						if hasIndexSignature {
							tc.validateIndexSignature(objLit, declaredType, filename)
						}

						// Skip if type name suggests it's generic, union, or intersection
						isFlexibleType := strings.Contains(declaredType.Name, "<") ||
							strings.Contains(declaredType.Name, "|") ||
							strings.Contains(declaredType.Name, "&")

						// Skip if type has no properties (likely unresolved or flexible)
						hasNoProperties := len(declaredType.Properties) == 0

						// Only apply excess property checking if type is clearly closed/strict
						if !hasIndexSignature && !isFlexibleType && !hasNoProperties {
							// Check for properties in the literal that don't exist in the declared type
							for _, propNode := range objLit.Properties {
								if prop, ok := propNode.(*ast.Property); ok && prop.Key != nil {
									// Get property name from the key
									var propName string
									if ident, ok := prop.Key.(*ast.Identifier); ok {
										propName = ident.Name
									} else if lit, ok := prop.Key.(*ast.Literal); ok {
										propName = fmt.Sprintf("%v", lit.Value)
									}

									if propName != "" {
										if _, exists := declaredType.Properties[propName]; !exists {
											tc.addError(filename, prop.Key.Pos().Line, prop.Key.Pos().Column,
												fmt.Sprintf("Object literal may only specify known properties, and '%s' does not exist in type '%s'.", propName, declaredType.String()),
												"TS2353", "error")
										}
									}
								}
							}
						}
					}

					// Special handling for literal assignments to union types
					typeToCheck := inferredType
					if tc.needsLiteralType(declaredType) {
						typeToCheck = tc.inferLiteralType(declarator.Init)
					}

					// Special handling for array literals assigned to tuple types
					if declaredType.Kind == types.TupleType {
						if arrayExpr, ok := declarator.Init.(*ast.ArrayExpression); ok {
							// Re-infer as tuple
							elementTypes := make([]*types.Type, len(arrayExpr.Elements))
							for i, elem := range arrayExpr.Elements {
								elementTypes[i] = tc.inferencer.InferType(elem)
							}
							typeToCheck = &types.Type{Kind: types.TupleType, Types: elementTypes}
						}
					}

					// Validate generic class instantiation
					if newExpr, ok := declarator.Init.(*ast.NewExpression); ok {
						tc.validateGenericClassInstantiation(newExpr, declarator, filename)
					}
					// Now check assignability
					if !tc.isAssignableTo(typeToCheck, declaredType) {
						tc.addError(filename, declarator.Init.Pos().Line, declarator.Init.Pos().Column,
							fmt.Sprintf("Type '%s' is not assignable to type '%s'.", typeToCheck.String(), declaredType.String()),
							"TS2322", "error")
					}
					// Store the declared type (not the inferred type) in the cache
					tc.typeCache[declarator] = declaredType
					tc.typeCache[declarator.ID] = declaredType
					tc.varTypeCache[declarator.ID.Name] = declaredType
				} else {
					// No type annotation, store the inferred type
					finalType := inferredType

					// Apply widening for literal types if it's not a const declaration
					// let x = false; -> x is boolean, not false
					// let y = "hello"; -> y is string, not "hello"
					if decl.Kind != "const" && inferredType.Kind == types.LiteralType {
						switch inferredType.Value.(type) {
						case bool:
							finalType = types.Boolean
						case string:
							finalType = types.String
						case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
							finalType = types.Number
						}
					}

					tc.typeCache[declarator] = finalType
					tc.typeCache[declarator.ID] = finalType
					tc.varTypeCache[declarator.ID.Name] = finalType
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

	// Ensure the function type is registered (in case this wasn't called in first pass)
	if _, exists := tc.varTypeCache[decl.ID.Name]; !exists {
		tc.registerFunctionType(decl, filename)
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

			// Store parameter type in varTypeCache if it has a type annotation
			if param.ParamType != nil {
				paramType := tc.convertTypeNode(param.ParamType)
				if paramType != nil {
					tc.varTypeCache[param.ID.Name] = paramType
					tc.typeCache[param.ID] = paramType
				}
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

		// Análisis de flujo de control para returns
		returnInfo := tc.controlFlow.AnalyzeReturns(decl.Body)
		if decl.ReturnType != nil && len(returnInfo.ReturnTypes) > 0 {
			declaredReturnType := tc.convertTypeNode(decl.ReturnType)
			unifiedReturnType := tc.controlFlow.UnifyReturnTypes(returnInfo.ReturnTypes)

			if declaredReturnType != nil && unifiedReturnType != nil {
				// For async functions, unwrap Promise<T> to get T
				expectedType := declaredReturnType
				if decl.Async && declaredReturnType.Kind == types.ObjectType && declaredReturnType.Name == "Promise" {
					// Extract the type parameter T from Promise<T>
					if len(declaredReturnType.TypeParameters) > 0 {
						expectedType = declaredReturnType.TypeParameters[0]
					} else {
						// Promise with no type parameter means Promise<any>
						expectedType = types.Any
					}
				}

				if !tc.isAssignableTo(unifiedReturnType, expectedType) {
					msg := fmt.Sprintf("Type '%s' is not assignable to type '%s'.", unifiedReturnType.String(), declaredReturnType.String())
					tc.addError(filename, decl.ReturnType.Pos().Line, decl.ReturnType.Pos().Column, msg, "TS2322", "error")
				}
			}
		}

		// Check assertion functions
		if decl.ReturnType != nil {
			if typePredicate, ok := decl.ReturnType.(*ast.TypePredicate); ok && typePredicate.Asserts {
				// Get the parameter name being asserted
				paramName := typePredicate.ParameterName.Name

				// Get the target type
				targetType := tc.convertTypeNode(typePredicate.TargetType)

				// Start with the parameter's declared type
				var currentParamType *types.Type
				if paramType, exists := tc.varTypeCache[paramName]; exists {
					currentParamType = paramType
				} else {
					currentParamType = types.Any // Should not happen if param exists
				}

				// Scan for type guards that exit the function
				if decl.Body != nil {
					for _, stmt := range decl.Body.Body {
						if ifStmt, ok := stmt.(*ast.IfStatement); ok {
							// Check if the if statement throws or returns in all paths
							info := tc.controlFlow.AnalyzeReturns(&ast.BlockStatement{Body: []ast.Statement{ifStmt.Consequent}})

							// Also check if it's a throw statement directly
							hasThrow := false
							if block, ok := ifStmt.Consequent.(*ast.BlockStatement); ok {
								for _, s := range block.Body {
									if _, isThrow := s.(*ast.ThrowStatement); isThrow {
										hasThrow = true
										break
									}
								}
							} else if _, isThrow := ifStmt.Consequent.(*ast.ThrowStatement); isThrow {
								hasThrow = true
							}

							if info.AllPathsReturn || hasThrow {
								// This if statement exits the function.
								// Analyze the condition to see what type remains in the else branch (main path)
								_, elseNarrowing := tc.typeNarrowing.AnalyzeCondition(ifStmt.Test)

								if narrowedType, exists := elseNarrowing[paramName]; exists {
									// Update current parameter type
									currentParamType = narrowedType
								}
							}
						}
					}
				}

				// At the end of the function, the parameter type must be assignable to the target type
				if !tc.isAssignableTo(currentParamType, targetType) {
					tc.addError(filename, decl.ReturnType.Pos().Line, decl.ReturnType.Pos().Column,
						fmt.Sprintf("Assertion function wrong implementation. Type '%s' is not assignable to type '%s'.", currentParamType.String(), targetType.String()),
						"TS2322", "error") // Using TS2322 as generic assignment error, though TS might use a specific one
				}
			}
		}

		// Validate return type matches declaration
		if decl.ReturnType != nil {
			declaredReturnType := tc.convertTypeNode(decl.ReturnType)
			actualReturnType, hasReturn := tc.typeCache[decl]

			if hasReturn && declaredReturnType != nil {
				// Check if actual return type is assignable to declared return type
				if !tc.isAssignableTo(actualReturnType, declaredReturnType) {
					msg := fmt.Sprintf("Type '%s' is not assignable to type '%s'.", actualReturnType.String(), declaredReturnType.String())
					tc.addError(filename, decl.ReturnType.Pos().Line, decl.ReturnType.Pos().Column, msg, "TS2322", "error")
				}
			}
		}

		// Restore previous function
		tc.currentFunction = previousFunction
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
		return
	}

	// Bind imported symbols to the type cache
	tc.bindImportedSymbols(importDecl, filename)
}

// checkExportDeclaration checks export statements
func (tc *TypeChecker) checkExportDeclaration(exportDecl *ast.ExportDeclaration, filename string) {
	// First, check the exported declaration itself (e.g., export default class, export class, etc.)
	if exportDecl.Declaration != nil {
		tc.checkStatement(exportDecl.Declaration, filename)
	}

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

		// Ensure the symbol exists and has the AST node attached
		// This is critical for generic type aliases which need the node for instantiation
		// Only do this for builtin types to avoid interfering with user code
		if filename == "builtins.d.ts" {
			symbol, exists := tc.symbolTable.ResolveSymbol(decl.ID.Name)
			if !exists {
				// Symbol doesn't exist yet, create it with the node
				// This happens for builtin types loaded before the binder runs
				tc.symbolTable.DefineSymbol(decl.ID.Name, symbols.TypeAliasSymbol, decl, false)
			} else if symbol.Node == nil {
				// Symbol exists (from optimized loader) but doesn't have a node
				// Attach the node so generic instantiation works
				symbol.Node = decl
			}
		}
		// For user code, the binder will have already created the symbol with the node

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

func (tc *TypeChecker) checkClassDeclaration(decl *ast.ClassDeclaration, filename string) {
	// Check class name
	if !isValidIdentifier(decl.ID.Name) {
		tc.addError(filename, decl.ID.Pos().Line, decl.ID.Pos().Column,
			fmt.Sprintf("Invalid class name: '%s'", decl.ID.Name), "TS1003", "error")
	}

	// Ensure the class type is registered (in case this wasn't called in first pass)
	if _, exists := tc.varTypeCache[decl.ID.Name]; !exists {
		tc.registerClassType(decl, filename)
	}

	// Find the class scope
	classScope := tc.findScopeForNode(decl)

	// Save current scope
	originalScope := tc.symbolTable.Current

	// Enter class scope if available
	if classScope != nil {
		tc.symbolTable.Current = classScope
	}

	// Find constructor
	var constructor *ast.MethodDefinition
	for _, member := range decl.Body {
		if m, ok := member.(*ast.MethodDefinition); ok && m.Kind == "constructor" {
			constructor = m
			break
		}
	}

	// Check members first to populate typeCache
	for _, member := range decl.Body {
		switch m := member.(type) {
		case *ast.MethodDefinition:
			// Check method body
			if m.Value != nil && m.Value.Body != nil {
				// Find method scope
				methodScope := tc.findScopeForNode(m)
				if methodScope != nil {
					// Set current function for return type checking
					previousFunction := tc.currentFunction
					tc.currentFunction = m.Value // Set to FunctionExpression for return validation

					// Enter method scope
					tc.symbolTable.Current = methodScope

					// Store parameter types in varTypeCache so they can be resolved in the method body
					for _, param := range m.Value.Params {
						if param.ID != nil && param.ParamType != nil {
							paramType := tc.convertTypeNode(param.ParamType)
							if paramType != nil {
								tc.varTypeCache[param.ID.Name] = paramType
								tc.typeCache[param.ID] = paramType
							}
						}
					}

					tc.checkBlockStatement(m.Value.Body, filename)

					// Validate method return type
					if m.Value.ReturnType != nil {
						declaredReturnType := tc.convertTypeNode(m.Value.ReturnType)
						actualReturnType, hasReturn := tc.typeCache[m.Value]

						if hasReturn && declaredReturnType != nil {
							if !tc.isAssignableTo(actualReturnType, declaredReturnType) {
								msg := fmt.Sprintf("Type '%s' is not assignable to type '%s'.", actualReturnType.String(), declaredReturnType.String())
								tc.addError(filename, m.Value.ReturnType.Pos().Line, m.Value.ReturnType.Pos().Column, msg, "TS2322", "error")
							}
						}
					}

					// Restore class scope (or original if no class scope)
					if classScope != nil {
						tc.symbolTable.Current = classScope
					} else {
						tc.symbolTable.Current = originalScope
					}

					tc.currentFunction = previousFunction
				}
			}

		case *ast.PropertyDefinition:
			// Check property initializer
			if m.Value != nil {
				tc.checkExpression(m.Value, filename)
			} else if m.TypeAnnotation != nil && !m.Optional {
				// Property has no initializer and is not optional - check strictPropertyInitialization
				if tc.GetConfig().StrictPropertyInitialization {
					// Check if it's initialized in constructor
					if m.Key != nil {
						propName := m.Key.Name
						if propName != "" {
							isAssigned := false
							if constructor != nil {
								isAssigned = tc.isPropertyAssignedInConstructor(propName, constructor)
							}

							if !isAssigned {
								msg := fmt.Sprintf("Property '%s' has no initializer and is not definitely assigned in the constructor.", propName)
								tc.addError(filename, m.Key.Pos().Line, m.Key.Pos().Column, msg, "TS2564", "error")
							}
						}
					}
				}
			}
		}
	}

	// After checking all members, validate interface implementation
	if decl.Implements != nil && len(decl.Implements) > 0 {
		for _, impl := range decl.Implements {
			if typeRef, ok := impl.(*ast.TypeReference); ok {
				interfaceType := tc.convertTypeNode(typeRef)
				if interfaceType != nil && interfaceType.Kind == types.ObjectType {
					// Check that class has all required interface properties
					for propName, propType := range interfaceType.Properties {
						// Find matching property or method in class
						found := false
						var methodNode *ast.MethodDefinition
						for _, member := range decl.Body {
							switch m := member.(type) {
							case *ast.MethodDefinition:
								if m.Key != nil && m.Key.Name == propName {
									found = true
									methodNode = m
									break
								}
							case *ast.PropertyDefinition:
								if m.Key != nil && m.Key.Name == propName {
									found = true
									break
								}
							}
							if found {
								break
							}
						}

						if !found {
							msg := fmt.Sprintf("Class '%s' incorrectly implements interface '%s'. Property '%s' is missing.", decl.ID.Name, typeRef.Name, propName)
							tc.addError(filename, decl.ID.Pos().Line, decl.ID.Pos().Column, msg, "TS2420", "error")
						} else if methodNode != nil && methodNode.Value != nil {
							// Validate method signature against interface
							if propType.Kind == types.FunctionType {
								var methodReturnType *types.Type

								// Get the method's return type - only validate if explicitly declared
								if methodNode.Value.ReturnType != nil {
									methodReturnType = tc.convertTypeNode(methodNode.Value.ReturnType)
								} else {
									// Infer return type from body if not explicitly declared
									if methodNode.Value.Body != nil {
										methodReturnType = tc.inferencer.InferReturnTypeFromBlock(methodNode.Value.Body)
									}

									// If still nil (couldn't infer), skip validation
									if methodReturnType == nil {
										continue
									}
								}

								// Validate return type compatibility
								if methodReturnType != nil && propType.ReturnType != nil {
									// Interface expects void but method returns a value
									if propType.ReturnType.Kind == types.VoidType && methodReturnType.Kind != types.VoidType {
										msg := fmt.Sprintf("Property '%s' in type '%s' is not assignable to the same property in base type '%s'.\n  Type '%s' is not assignable to type 'void'.",
											propName, decl.ID.Name, typeRef.Name, methodReturnType.String())
										tc.addError(filename, methodNode.Key.Pos().Line, methodNode.Key.Pos().Column, msg, "TS2416", "error")
									} else if methodReturnType.Kind != types.VoidType && propType.ReturnType.Kind != types.VoidType {
										// Both have non-void returns - check assignability
										if !tc.isAssignableTo(methodReturnType, propType.ReturnType) {
											msg := fmt.Sprintf("Property '%s' in type '%s' is not assignable to the same property in base type '%s'.\n  Type '%s' is not assignable to type '%s'.",
												propName, decl.ID.Name, typeRef.Name, methodReturnType.String(), propType.ReturnType.String())
											tc.addError(filename, methodNode.Key.Pos().Line, methodNode.Key.Pos().Column, msg, "TS2416", "error")
										}
									} else if methodReturnType.Kind == types.VoidType && propType.ReturnType.Kind != types.VoidType {
										// Method returns void but interface expects a value
										msg := fmt.Sprintf("Property '%s' in type '%s' is not assignable to the same property in base type '%s'.\n  Type 'void' is not assignable to type '%s'.",
											propName, decl.ID.Name, typeRef.Name, propType.ReturnType.String())
										tc.addError(filename, methodNode.Key.Pos().Line, methodNode.Key.Pos().Column, msg, "TS2416", "error")
									}
								}

								// Validate parameter count and types
								if len(methodNode.Value.Params) != len(propType.Parameters) {
									msg := fmt.Sprintf("Property '%s' in type '%s' is not assignable to the same property in base type '%s'.\n  Type has %d parameter(s) but interface has %d parameter(s).",
										propName, decl.ID.Name, typeRef.Name, len(methodNode.Value.Params), len(propType.Parameters))
									tc.addError(filename, methodNode.Key.Pos().Line, methodNode.Key.Pos().Column, msg, "TS2416", "error")
								}
							}
						}
					}
				}
			}
		}
	}

	// Validate getter/setter pairs have compatible types
	getters := make(map[string]*ast.MethodDefinition)
	setters := make(map[string]*ast.MethodDefinition)

	for _, member := range decl.Body {
		if method, ok := member.(*ast.MethodDefinition); ok {
			if method.Key != nil {
				propName := method.Key.Name
				if method.Kind == "get" {
					getters[propName] = method
				} else if method.Kind == "set" {
					setters[propName] = method
				}
			}
		}
	}

	// Check each getter/setter pair
	for propName, getter := range getters {
		if setter, hasSetter := setters[propName]; hasSetter {
			// Get getter return type
			var getterReturnType *types.Type
			if getter.Value != nil && getter.Value.ReturnType != nil {
				getterReturnType = tc.convertTypeNode(getter.Value.ReturnType)
			}

			// Get setter parameter type
			var setterParamType *types.Type
			if setter.Value != nil && len(setter.Value.Params) > 0 {
				if setter.Value.Params[0].ParamType != nil {
					setterParamType = tc.convertTypeNode(setter.Value.Params[0].ParamType)
				}
			}

			// Validate compatibility: setter param type should be assignable to getter return type
			if getterReturnType != nil && setterParamType != nil {
				if !tc.isAssignableTo(setterParamType, getterReturnType) && !tc.isAssignableTo(getterReturnType, setterParamType) {
					msg := fmt.Sprintf("Getter and setter for '%s' have incompatible types. Getter returns '%s' but setter accepts '%s'.",
						propName, getterReturnType.String(), setterParamType.String())
					tc.addError(filename, setter.Key.Pos().Line, setter.Key.Pos().Column, msg, "TS2380", "error")
				}
			}
		}
	}

	// Restore original scope
	tc.symbolTable.Current = originalScope
}

func (tc *TypeChecker) checkEnumDeclaration(decl *ast.EnumDeclaration, filename string) {
	// Check enum name is valid
	if decl.Name != nil && !isValidIdentifier(decl.Name.Name) {
		tc.addError(filename, decl.Name.Pos().Line, decl.Name.Pos().Column,
			fmt.Sprintf("Invalid enum name: '%s'", decl.Name.Name), "TS1003", "error")
	}

	// Check enum members
	enumValues := make(map[string]bool)
	for _, member := range decl.Members {
		if member.Name == nil {
			continue
		}

		// Check for duplicate member names
		if enumValues[member.Name.Name] {
			tc.addError(filename, member.Name.Pos().Line, member.Name.Pos().Column,
				fmt.Sprintf("Duplicate enum member name: '%s'", member.Name.Name), "TS2300", "error")
		}
		enumValues[member.Name.Name] = true

		// If member has an initializer, check it
		if member.Value != nil {
			tc.checkExpression(member.Value, filename)

			// Enum members should be initialized with number or string literals
			initType := tc.inferencer.InferType(member.Value)
			isValid := false
			if initType.Kind == types.NumberType || initType.Kind == types.StringType {
				isValid = true
			} else if initType.Kind == types.LiteralType {
				switch initType.Value.(type) {
				case string, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
					isValid = true
				}
			}

			if !isValid {
				tc.addError(filename, member.Value.Pos().Line, member.Value.Pos().Column,
					"Enum member must have initializer of type string or number", "TS1066", "error")
			}
		}
	}

	// Create enum type and cache it
	if decl.Name != nil {
		// Create properties map for the enum object
		properties := make(map[string]*types.Type)

		// Create the enum type
		enumType := types.NewObjectType(decl.Name.Name, properties)

		// Populate properties with the enum type itself (simplification)
		// In TypeScript, enum members are of type Enum.Member, which is a subtype of Enum
		for _, member := range decl.Members {
			if member.Name != nil {
				// Each member is of type Enum
				properties[member.Name.Name] = enumType
			}
		}

		// Register as a type (for 'var s: Status')
		tc.typeAliasCache[decl.Name.Name] = enumType

		// Register as a value (for 'Status.Active')
		// Enums are real objects at runtime
		tc.varTypeCache[decl.Name.Name] = enumType
	}
}

func (tc *TypeChecker) checkNamespaceDeclaration(decl *ast.NamespaceDeclaration, filename string) {
	// Check namespace name is valid
	if decl.Name != nil && !isValidIdentifier(decl.Name.Name) {
		tc.addError(filename, decl.Name.Pos().Line, decl.Name.Pos().Column,
			fmt.Sprintf("Invalid namespace name: '%s'", decl.Name.Name), "TS1003", "error")
	}

	// Find the namespace scope
	namespaceScope := tc.findScopeForNode(decl)
	if namespaceScope != nil {
		// Save current scope
		originalScope := tc.symbolTable.Current

		// Enter namespace scope
		tc.symbolTable.Current = namespaceScope

		// Check all statements in the namespace
		for _, stmt := range decl.Body {
			tc.checkStatement(stmt, filename)
		}

		// Restore original scope
		tc.symbolTable.Current = originalScope
	} else {
		// Fallback: check without scope change
		for _, stmt := range decl.Body {
			tc.checkStatement(stmt, filename)
		}
	}

	// Collect exported members to create a namespace type
	if decl.Name != nil {
		namespaceMembers := make(map[string]*types.Type)

		for _, stmt := range decl.Body {
			// Check if statement is an export declaration
			if exportDecl, ok := stmt.(*ast.ExportDeclaration); ok && exportDecl.Declaration != nil {
				// Handle exported function
				if funcDecl, ok := exportDecl.Declaration.(*ast.FunctionDeclaration); ok {
					if funcDecl.ID != nil {
						// Create function type
						var paramTypes []*types.Type
						for _, param := range funcDecl.Params {
							if param.ParamType != nil {
								paramTypes = append(paramTypes, tc.convertTypeNode(param.ParamType))
							} else {
								paramTypes = append(paramTypes, types.Any)
							}
						}
						var returnType *types.Type
						if funcDecl.ReturnType != nil {
							returnType = tc.convertTypeNode(funcDecl.ReturnType)
						} else {
							returnType = types.Void
						}
						namespaceMembers[funcDecl.ID.Name] = types.NewFunctionType(paramTypes, returnType)
					}
				}
				// Handle exported variable/const
				if varDecl, ok := exportDecl.Declaration.(*ast.VariableDeclaration); ok {
					for _, declarator := range varDecl.Decls {
						if declarator.ID != nil {
							var varType *types.Type
							if declarator.TypeAnnotation != nil {
								varType = tc.convertTypeNode(declarator.TypeAnnotation)
							} else if declarator.Init != nil {
								varType = tc.inferencer.InferType(declarator.Init)
							} else {
								varType = types.Any
							}
							namespaceMembers[declarator.ID.Name] = varType
						}
					}
				}
				// Handle exported class
				if classDecl, ok := exportDecl.Declaration.(*ast.ClassDeclaration); ok {
					if classDecl.ID != nil {
						// For now, just mark it as an object type
						// In a full implementation, we'd create a proper class type
						namespaceMembers[classDecl.ID.Name] = types.NewObjectType(classDecl.ID.Name, nil)
					}
				}
			}
		}

		// Create namespace type as an ObjectType with the exported members
		namespaceType := types.NewObjectType("typeof "+decl.Name.Name, namespaceMembers)
		tc.varTypeCache[decl.Name.Name] = namespaceType
	}
}

// isPropertyAssignedInConstructor checks if a property is assigned in the constructor
func (tc *TypeChecker) isPropertyAssignedInConstructor(propName string, constructor *ast.MethodDefinition) bool {
	if constructor == nil || constructor.Value == nil || constructor.Value.Body == nil {
		return false
	}
	return tc.isAssignedInBlock(propName, constructor.Value.Body)
}

// isAssignedInBlock checks if a property is assigned in a block statement
func (tc *TypeChecker) isAssignedInBlock(propName string, block *ast.BlockStatement) bool {
	for _, stmt := range block.Body {
		if exprStmt, ok := stmt.(*ast.ExpressionStatement); ok {
			if assign, ok := exprStmt.Expression.(*ast.AssignmentExpression); ok {
				if member, ok := assign.Left.(*ast.MemberExpression); ok {
					if _, isThis := member.Object.(*ast.ThisExpression); isThis {
						if id, ok := member.Property.(*ast.Identifier); ok && id.Name == propName {
							return true
						}
					}
				}
			}
		}
		// Also check if statements, loops, etc. (simplified for now)
		if ifStmt, ok := stmt.(*ast.IfStatement); ok {
			// If assigned in both branches, it's definitely assigned
			// For now, we'll be conservative and only check top-level assignments
			// or if it's assigned in at least one branch (which is not strictly correct but better than nothing)
			// A proper implementation requires control flow analysis
			if consequent, ok := ifStmt.Consequent.(*ast.BlockStatement); ok {
				if tc.isAssignedInBlock(propName, consequent) {
					// If there's an else block, we need to check that too
					if ifStmt.Alternate != nil {
						if altBlock, ok := ifStmt.Alternate.(*ast.BlockStatement); ok {
							if tc.isAssignedInBlock(propName, altBlock) {
								return true
							}
						}
					} else {
						// No else block, so not definitely assigned
					}
				}
			}
		}
	}
	return false
}
