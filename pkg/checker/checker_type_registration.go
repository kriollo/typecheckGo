package checker

import (
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
	} else if decl.Body != nil {
		returnType = tc.inferencer.InferReturnTypeFromBlock(decl.Body)
	} else {
		returnType = types.Void
	}

	fnType := types.NewFunctionType(paramTypes, returnType)
	tc.varTypeCache[decl.ID.Name] = fnType
	tc.typeCache[decl.ID] = fnType
}
