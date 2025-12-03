package checker

import (
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/modules"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

// resolveImportedType resolves the type of an imported symbol
func (tc *TypeChecker) resolveImportedType(symbol *symbols.Symbol) *types.Type {
	if symbol == nil {
		return types.Any
	}

	// If the symbol already has a resolved type, use it
	if symbol.ResolvedType != nil {
		return symbol.ResolvedType
	}

	// Resolve based on the node type
	if symbol.Node == nil {
		return types.Any
	}

	var resolvedType *types.Type

	switch node := symbol.Node.(type) {
	case *ast.ClassDeclaration:
		// For classes, create an object type representing the class
		// The type of 'new ClassName()' is an instance of the class
		properties := make(map[string]*types.Type)

		// Add class members to properties
		for _, member := range node.Body {
			switch m := member.(type) {
			case *ast.PropertyDefinition:
				if m.Key != nil && m.TypeAnnotation != nil {
					propType := tc.convertTypeNode(m.TypeAnnotation)
					if propType != nil {
						properties[m.Key.Name] = propType
					}
				}
			case *ast.MethodDefinition:
				if m.Key != nil && m.Value != nil {
					// Create function type for method
					var paramTypes []*types.Type
					for _, param := range m.Value.Params {
						if param.ParamType != nil {
							paramTypes = append(paramTypes, tc.convertTypeNode(param.ParamType))
						} else {
							paramTypes = append(paramTypes, types.Any)
						}
					}

					var returnType *types.Type
					if m.Value.ReturnType != nil {
						returnType = tc.convertTypeNode(m.Value.ReturnType)
					} else {
						returnType = types.Void
					}

					methodType := &types.Type{
						Kind:       types.FunctionType,
						Parameters: paramTypes,
						ReturnType: returnType,
					}
					properties[m.Key.Name] = methodType
				}
			}
		}

		resolvedType = types.NewObjectType(node.ID.Name, properties)

	case *ast.FunctionDeclaration:
		// For functions, create a function type
		var paramTypes []*types.Type
		for _, param := range node.Params {
			if param.ParamType != nil {
				paramTypes = append(paramTypes, tc.convertTypeNode(param.ParamType))
			} else {
				paramTypes = append(paramTypes, types.Any)
			}
		}

		var returnType *types.Type
		if node.ReturnType != nil {
			returnType = tc.convertTypeNode(node.ReturnType)
		} else {
			returnType = types.Void
		}

		resolvedType = &types.Type{
			Kind:       types.FunctionType,
			Parameters: paramTypes,
			ReturnType: returnType,
		}

	case *ast.VariableDeclaration:
		// For variables, infer the type from the declaration
		if len(node.Decls) > 0 {
			decl := node.Decls[0]
			if decl.TypeAnnotation != nil {
				resolvedType = tc.convertTypeNode(decl.TypeAnnotation)
			} else if decl.Init != nil {
				resolvedType = tc.inferencer.InferType(decl.Init)
			}
		}

	case *ast.TypeAliasDeclaration:
		if node.TypeAnnotation != nil {
			resolvedType = tc.convertTypeNode(node.TypeAnnotation)
		}

	case *ast.InterfaceDeclaration:
		resolvedType = tc.convertTypeNode(&ast.TypeReference{
			Name:     node.ID.Name,
			Position: node.Position,
			EndPos:   node.EndPos,
		})
	}

	if resolvedType == nil {
		resolvedType = types.Any
	}

	// Cache the resolved type
	if symbol.UpdateCache != nil {
		symbol.UpdateCache(resolvedType)
	}

	return resolvedType
}

// bindImportedSymbols binds imported symbols to the type cache
func (tc *TypeChecker) bindImportedSymbols(importDecl *ast.ImportDeclaration, filename string) {
	if tc.moduleResolver == nil {
		return
	}

	// Create an import resolver for this file
	currentModule, err := tc.moduleResolver.ResolveModule(filename, "")
	if err != nil {
		return
	}

	importResolver := modules.NewImportResolver(tc.moduleResolver, currentModule)

	// Resolve the import
	importedSymbols, err := importResolver.ResolveImport(importDecl)
	if err != nil {
		// Error already reported by checkImportDeclaration
		return
	}

	// Bind each imported symbol to the type cache
	for name, symbol := range importedSymbols {
		// Resolve the type of the imported symbol
		resolvedType := tc.resolveImportedType(symbol)

		// Store in varTypeCache so it can be used in expressions
		tc.varTypeCache[name] = resolvedType

		// Also store in symbol table if not already there
		if _, exists := tc.symbolTable.ResolveSymbol(name); !exists {
			tc.symbolTable.DefineSymbol(name, symbol.Type, symbol.Node, false)
		}
	}
}
// resolveReExportType resolves the type of a re-exported symbol by following the chain
func (tc *TypeChecker) resolveReExportType(exportInfo *modules.ExportInfo, currentModulePath string) *types.Type {
if exportInfo == nil || !exportInfo.IsReExport || exportInfo.SourceModule == "" {
return types.Any
}

// Resolve the source module
sourceModule, err := tc.moduleResolver.ResolveModule(exportInfo.SourceModule, currentModulePath)
if err != nil {
return types.Any
}

// Find the export in the source module
// For re-exports, we need to find the original export name
var sourceExport *modules.ExportInfo
for _, exp := range sourceModule.Exports {
if exp.Name == exportInfo.Name {
sourceExport = exp
break
}
}

if sourceExport == nil {
return types.Any
}

// If the source export is also a re-export, follow the chain recursively
if sourceExport.IsReExport {
return tc.resolveReExportType(sourceExport, sourceModule.AbsolutePath)
}

// Create a temporary symbol to resolve the type
tempSymbol := &symbols.Symbol{
Node:         sourceExport.Node,
ResolvedType: sourceExport.ResolvedType,
}

return tc.resolveImportedType(tempSymbol)
}
