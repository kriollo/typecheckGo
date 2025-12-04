package checker

import (
	"fmt"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
)

// StaticMemberValidator validates static class members
type StaticMemberValidator struct {
	tc *TypeChecker
}

// NewStaticMemberValidator creates a new static member validator
func NewStaticMemberValidator(tc *TypeChecker) *StaticMemberValidator {
	return &StaticMemberValidator{tc: tc}
}

// ValidateStaticAccess validates access to static members
func (smv *StaticMemberValidator) ValidateStaticAccess(
	member *ast.MemberExpression,
	filename string,
) {
	if smv == nil || smv.tc == nil {
		return
	}

	// Check if object is a class reference (not an instance)
	objId, ok := member.Object.(*ast.Identifier)
	if !ok {
		return
	}

	// Look up the symbol
	symbol, exists := smv.tc.symbolTable.ResolveSymbol(objId.Name)
	if !exists {
		return
	}

	// Check if it's a class
	if symbol.Type != symbols.ClassSymbol {
		return
	}

	classDecl, ok := symbol.Node.(*ast.ClassDeclaration)
	if !ok {
		return
	}

	// Get property name
	var propName string
	if prop, ok := member.Property.(*ast.Identifier); ok {
		propName = prop.Name
	} else {
		return
	}

	// Find the member in the class
	memberFound := false
	isStatic := false

	for _, classMember := range classDecl.Body {
		switch cm := classMember.(type) {
		case *ast.MethodDefinition:
			if cm.Key != nil && cm.Key.Name == propName {
				memberFound = true
				isStatic = cm.Static
			}
		case *ast.PropertyDefinition:
			if cm.Key != nil && cm.Key.Name == propName {
				memberFound = true
				isStatic = cm.Static
			}
		}

		if memberFound {
			break
		}
	}

	if memberFound && !isStatic {
		// Accessing instance member on class
		smv.tc.addError(
			filename,
			member.Property.Pos().Line,
			member.Property.Pos().Column,
			fmt.Sprintf(
				"Property '%s' does not exist on type 'typeof %s'.\n"+
					"  Sugerencia: Accede a '%s' desde una instancia de la clase o decláralo como static",
				propName, objId.Name, propName,
			),
			"TS2339",
			"error",
		)
	}
}

// ValidateStaticMethodCall validates calling a static method
func (smv *StaticMemberValidator) ValidateStaticMethodCall(
	call *ast.CallExpression,
	member *ast.MemberExpression,
	filename string,
) {
	if smv == nil || smv.tc == nil {
		return
	}

	// Check if object is a class reference
	objId, ok := member.Object.(*ast.Identifier)
	if !ok {
		return
	}

	// Look up the symbol
	symbol, exists := smv.tc.symbolTable.ResolveSymbol(objId.Name)
	if !exists || symbol.Type != symbols.ClassSymbol {
		return
	}

	classDecl, ok := symbol.Node.(*ast.ClassDeclaration)
	if !ok {
		return
	}

	// Get method name
	var methodName string
	if prop, ok := member.Property.(*ast.Identifier); ok {
		methodName = prop.Name
	} else {
		return
	}

	// Find static method
	for _, classMember := range classDecl.Body {
		if method, ok := classMember.(*ast.MethodDefinition); ok {
			if method.Key != nil && method.Key.Name == methodName && method.Static {
				// Found static method - validate call
				if method.Value != nil {
					smv.tc.checkArgumentTypes(call.Arguments, method.Value.Params, filename, methodName)
				}
				return
			}
		}
	}
}

// ValidateConstructorInstantiation validates 'new' expressions
func (smv *StaticMemberValidator) ValidateConstructorInstantiation(
	newExpr *ast.NewExpression,
	filename string,
) {
	if smv == nil || smv.tc == nil {
		return
	}

	// Get class identifier
	classId, ok := newExpr.Callee.(*ast.Identifier)
	if !ok {
		return
	}

	// Look up class
	symbol, exists := smv.tc.symbolTable.ResolveSymbol(classId.Name)
	if !exists {
		return
	}

	// Check if trying to instantiate something that's not a class
	if symbol.Type != symbols.ClassSymbol {
		// Allow variables (like Promise, Error, etc.) which might be constructors
		if symbol.Type == symbols.VariableSymbol {
			if symbol.ResolvedType != nil {
				// Prevent primitives from being instantiated
				switch symbol.ResolvedType.Kind {
				case types.NumberType, types.StringType, types.BooleanType, types.NullType, types.UndefinedType, types.VoidType, types.NeverType:
					// Fall through to error
				default:
					// Allow Object, Function, Any, Unknown
					return
				}
			} else {
				// If type not resolved yet, allow it (conservative)
				return
			}
		}

		smv.tc.addError(
			filename,
			newExpr.Callee.Pos().Line,
			newExpr.Callee.Pos().Column,
			fmt.Sprintf("Cannot use 'new' with non-constructor type '%s'.", classId.Name),
			"TS2351",
			"error",
		)
		return
	}

	classDecl, ok := symbol.Node.(*ast.ClassDeclaration)
	if !ok {
		return
	}

	// Check for abstract class
	if classDecl.Abstract {
		smv.tc.addError(
			filename,
			newExpr.Callee.Pos().Line,
			newExpr.Callee.Pos().Column,
			fmt.Sprintf("Cannot create an instance of an abstract class '%s'.", classId.Name),
			"TS2511",
			"error",
		)
		return
	}

	// Find and validate constructor
	smv.validateConstructorCall(newExpr, classDecl, filename)
}

// validateConstructorCall validates constructor parameter types
func (smv *StaticMemberValidator) validateConstructorCall(
	newExpr *ast.NewExpression,
	classDecl *ast.ClassDeclaration,
	filename string,
) {
	// Find constructor
	var constructor *ast.MethodDefinition
	for _, member := range classDecl.Body {
		if method, ok := member.(*ast.MethodDefinition); ok {
			if method.Kind == "constructor" {
				constructor = method
				break
			}
		}
	}

	if constructor == nil {
		// No explicit constructor - check if arguments provided
		if len(newExpr.Arguments) > 0 {
			smv.tc.addError(
				filename,
				newExpr.Callee.Pos().Line,
				newExpr.Callee.Pos().Column,
				fmt.Sprintf("Expected 0 arguments, but got %d.", len(newExpr.Arguments)),
				"TS2554",
				"error",
			)
		}
		return
	}

	// Validate constructor arguments
	if constructor.Value != nil {
		smv.tc.checkArgumentTypes(
			newExpr.Arguments,
			constructor.Value.Params,
			filename,
			"constructor",
		)
	}
}

// GetStaticMembers returns all static members of a class
func (smv *StaticMemberValidator) GetStaticMembers(
	classDecl *ast.ClassDeclaration,
) map[string]*types.Type {
	staticMembers := make(map[string]*types.Type)

	for _, member := range classDecl.Body {
		switch m := member.(type) {
		case *ast.MethodDefinition:
			if m.Static && m.Key != nil {
				// Create function type for method
				paramTypes := make([]*types.Type, len(m.Value.Params))
				for i, param := range m.Value.Params {
					if param.ParamType != nil {
						paramTypes[i] = smv.tc.convertTypeNode(param.ParamType)
					} else {
						paramTypes[i] = types.Any
					}
				}

				returnType := types.Void
				if m.Value.ReturnType != nil {
					returnType = smv.tc.convertTypeNode(m.Value.ReturnType)
				}

				staticMembers[m.Key.Name] = types.NewFunctionType(paramTypes, returnType)
			}

		case *ast.PropertyDefinition:
			if m.Static && m.Key != nil {
				propType := types.Any
				if m.TypeAnnotation != nil {
					propType = smv.tc.convertTypeNode(m.TypeAnnotation)
				}
				staticMembers[m.Key.Name] = propType
			}
		}
	}

	return staticMembers
}
