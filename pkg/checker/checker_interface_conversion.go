package checker

import (
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

// convertInterfaceToType converts an interface declaration to a types.Type
func (tc *TypeChecker) convertInterfaceToType(decl *ast.InterfaceDeclaration) *types.Type {
	properties := make(map[string]*types.Type)
	var callSignatures []*types.Type
	var stringIndexType *types.Type
	var numberIndexType *types.Type

	// First, process extended interfaces to inherit their properties
	for _, extendType := range decl.Extends {
		if typeRef, ok := extendType.(*ast.TypeReference); ok {
			// Resolve the parent interface
			if symbol, exists := tc.symbolTable.ResolveSymbol(typeRef.Name); exists {
				if symbol.Type == symbols.InterfaceSymbol && symbol.Node != nil {
					if parentDecl, ok := symbol.Node.(*ast.InterfaceDeclaration); ok {
						// Recursively convert parent interface
						parentType := tc.convertInterfaceToType(parentDecl)
						// Copy all properties from parent
						for propName, propType := range parentType.Properties {
							properties[propName] = propType
						}
						// Copy call signatures and index signatures
						callSignatures = append(callSignatures, parentType.CallSignatures...)
						if parentType.StringIndexType != nil {
							stringIndexType = parentType.StringIndexType
						}
						if parentType.NumberIndexType != nil {
							numberIndexType = parentType.NumberIndexType
						}
					}
				}
			}
		}
	}

	// Then, process own members (which can override inherited properties)
	for _, member := range decl.Members {
		switch m := member.(type) {
		case ast.InterfaceProperty:
			propType := tc.convertTypeNode(m.Value)

			// Handle optional properties: make them a union with undefined
			if m.Optional && propType != nil {
				propType = types.NewUnionType([]*types.Type{propType, types.Undefined})
			}

			// Handle readonly modifier
			if m.Readonly && propType != nil {
				// Create a copy to set IsReadonly
				newType := *propType
				newType.IsReadonly = true
				propType = &newType
			}
			properties[m.Key.Name] = propType
		case *ast.CallSignature:
			// Convert call signature to FunctionType
			params := make([]*types.Type, len(m.Parameters))
			for i, param := range m.Parameters {
				if param.ParamType != nil {
					params[i] = tc.convertTypeNode(param.ParamType)
				} else {
					params[i] = types.Any
				}
			}
			returnType := tc.convertTypeNode(m.ReturnType)
			callSignatures = append(callSignatures, types.NewFunctionType(params, returnType))
		case *ast.IndexSignature:
			valueType := tc.convertTypeNode(m.ValueType)
			keyType := tc.convertTypeNode(m.KeyType)

			if keyType.Kind == types.StringType {
				stringIndexType = valueType
			} else if keyType.Kind == types.NumberType {
				numberIndexType = valueType
			}
		default:
			// Unknown member type
		}
	}

	objType := types.NewObjectType(decl.ID.Name, properties)
	objType.CallSignatures = callSignatures
	objType.StringIndexType = stringIndexType
	objType.NumberIndexType = numberIndexType
	return objType
}
