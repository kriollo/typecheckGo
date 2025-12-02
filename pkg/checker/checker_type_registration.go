package checker

import (
	"fmt"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// registerClassType registers the type of a class without checking its body
// This is used in the first pass to make class types available for type inference
func (tc *TypeChecker) registerClassType(decl *ast.ClassDeclaration, filename string) {
	// Build instance type with method signatures
	instanceProperties := make(map[string]*types.Type)
	staticProperties := make(map[string]*types.Type)

	// Collect method and property types
	for _, member := range decl.Body {
		switch m := member.(type) {
		case *ast.MethodDefinition:
			// Check if it's a constructor to handle parameter properties
			if m.Kind == "constructor" && m.Value != nil {
				for _, param := range m.Value.Params {
					// If parameter has access modifier or readonly, it's a parameter property
					if param.Public || param.Private || param.Protected || param.Readonly {
						if param.ID != nil {
							var paramType *types.Type
							if param.ParamType != nil {
								paramType = tc.convertTypeNode(param.ParamType)
							} else {
								paramType = types.Any
							}

							if param.Readonly && paramType != nil {
								// Create a copy to set IsReadonly
								newType := *paramType
								newType.IsReadonly = true
								paramType = &newType
							}

							instanceProperties[param.ID.Name] = paramType
						}
					}
				}
			}

			// Build method type
			if m.Value != nil {
				paramTypes := make([]*types.Type, len(m.Value.Params))
				for i, param := range m.Value.Params {
					if param.ParamType != nil {
						paramTypes[i] = tc.convertTypeNode(param.ParamType)
					} else {
						paramTypes[i] = types.Any
					}
				}

				// Use declared return type if available, otherwise infer from body
				var returnType *types.Type
				if m.Value.ReturnType != nil {
					returnType = tc.convertTypeNode(m.Value.ReturnType)
				} else if m.Value.Body != nil {
					returnType = tc.inferencer.InferReturnTypeFromBlock(m.Value.Body)
				} else {
					returnType = types.Void
				}

				methodType := types.NewFunctionType(paramTypes, returnType)

				// Add to appropriate properties map
				if m.Static {
					staticProperties[m.Key.Name] = methodType
				} else {
					instanceProperties[m.Key.Name] = methodType
				}
			}

		case *ast.PropertyDefinition:
			// Determine property type
			var propType *types.Type
			if m.TypeAnnotation != nil {
				propType = tc.convertTypeNode(m.TypeAnnotation)
			} else if m.Value != nil {
				propType = tc.inferencer.InferType(m.Value)
			} else {
				propType = types.Any
			}

			// Add to appropriate properties map
			if m.Static {
				staticProperties[m.Key.Name] = propType
			} else {
				instanceProperties[m.Key.Name] = propType
			}
		}
	}

	// Create and register instance type
	instanceType := types.NewObjectType(decl.ID.Name, instanceProperties)

	// Create constructor type (function that returns instance)
	constructorType := types.NewFunctionType(nil, instanceType)
	constructorType.Properties = staticProperties

	// Register in cache so that 'new ClassName()' returns the instance type
	tc.varTypeCache[decl.ID.Name] = constructorType
	tc.typeCache[decl.ID] = constructorType
}

// registerFunctionType registers the type of a function without checking its body
// This is used in the first pass to make function types available for type inference
func (tc *TypeChecker) registerFunctionType(decl *ast.FunctionDeclaration, filename string) {
	// Construct FunctionType
	paramTypes := make([]*types.Type, len(decl.Params))
	for i, param := range decl.Params {
		if param.ParamType != nil {
			paramTypes[i] = tc.convertTypeNode(param.ParamType)
		} else {
			paramTypes[i] = types.Any
		}
	}

	// Use declared return type if available, otherwise infer from body
	var returnType *types.Type
	if decl.ReturnType != nil {
		returnType = tc.convertTypeNode(decl.ReturnType)
		if decl.Async && debugParserEnabled {
			fmt.Printf("DEBUG: Async function return type: Kind=%s, Name=%s, TypeParameters=%d, Properties=%d\n",
				returnType.Kind, returnType.Name, len(returnType.TypeParameters), len(returnType.Properties))
			if len(returnType.TypeParameters) > 0 {
				fmt.Printf("DEBUG: TypeParameter[0]: Kind=%s, Name=%s\n", returnType.TypeParameters[0].Kind, returnType.TypeParameters[0].Name)
			}
		}
	} else if decl.Body != nil {
		returnType = tc.inferencer.InferReturnTypeFromBlock(decl.Body)
	} else {
		returnType = types.Void
	}

	// If it's an async function, ensure the return type is Promise<T>
	if decl.Async {
		// If the return type is not already a Promise, wrap it
		if returnType.Name != "Promise" {
			// Create Promise<T> type
			if promiseType, exists := tc.globalEnv.Objects["Promise"]; exists {
				// Clone the Promise type and set the type parameter
				wrappedType := &types.Type{
					Kind:           types.ObjectType,
					Name:           "Promise",
					Properties:     promiseType.Properties,
					TypeParameters: []*types.Type{returnType},
				}
				returnType = wrappedType
			} else {
				// Fallback: create a simple Promise<T> type
				returnType = &types.Type{
					Kind:           types.ObjectType,
					Name:           "Promise",
					TypeParameters: []*types.Type{returnType},
				}
			}
		}
	}

	var fnType *types.Type
	if len(decl.TypeParameters) > 0 {
		typeParams := make([]*types.Type, len(decl.TypeParameters))
		for i, tp := range decl.TypeParameters {
			// Convert AST TypeParameter to types.TypeParameter
			if typeParam, ok := tp.(*ast.TypeParameter); ok {
				var constraint *types.Type
				if typeParam.Constraint != nil {
					constraint = tc.convertTypeNode(typeParam.Constraint)
				}
				typeParams[i] = types.NewTypeParameter(typeParam.Name.Name, constraint, nil)
			}
		}
		fnType = types.NewGenericFunctionType(typeParams, paramTypes, returnType)
	} else {
		fnType = types.NewFunctionType(paramTypes, returnType)
	}

	tc.varTypeCache[decl.ID.Name] = fnType
	tc.typeCache[decl.ID] = fnType
}
