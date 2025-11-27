package checker

import (
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// convertInterfaceToType converts an interface declaration to a types.Type
func (tc *TypeChecker) convertInterfaceToType(decl *ast.InterfaceDeclaration) *types.Type {
	properties := make(map[string]*types.Type)
	for _, member := range decl.Members {
		switch m := member.(type) {
		case ast.InterfaceProperty:
			propType := tc.convertTypeNode(m.Value)
			if m.Readonly && propType != nil {
				// Create a copy to set IsReadonly
				newType := *propType
				newType.IsReadonly = true
				propType = &newType
			}
			properties[m.Key.Name] = propType
		}
	}
	return types.NewObjectType(decl.ID.Name, properties)
}
