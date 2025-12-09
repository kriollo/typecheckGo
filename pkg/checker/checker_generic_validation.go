package checker

import (
	"fmt"
	"tstypechecker/pkg/ast"
)

// validateGenericClassInstantiation validates that a NewExpression with a generic class
// has type arguments that match the inferred types from constructor arguments.
// This catches errors like: var gc: GenericClass<string> = new GenericClass(456);
func (tc *TypeChecker) validateGenericClassInstantiation(
	newExpr *ast.NewExpression,
	declarator *ast.VariableDeclarator,
	filename string,
) {
	// Check if the callee is an identifier
	id, ok := newExpr.Callee.(*ast.Identifier)
	if !ok {
		return
	}

	// Resolve the class symbol
	symbol, exists := tc.symbolTable.ResolveSymbol(id.Name)
	if !exists {
		return
	}

	// Check if it's a class declaration
	classDecl, ok := symbol.Node.(*ast.ClassDeclaration)
	if !ok || classDecl == nil {
		return
	}

	// Check if the class is generic
	if len(classDecl.TypeParameters) == 0 {
		return
	}

	// Find constructor parameters
	var constructorParams []*ast.Parameter
	for _, member := range classDecl.Body {
		if method, ok := member.(*ast.MethodDefinition); ok {
			if method.Kind == "constructor" && method.Value != nil {
				constructorParams = method.Value.Params
				break
			}
		}
	}

	// Convert TypeParameters to []*ast.TypeParameter
	var typeParams []*ast.TypeParameter
	for _, tp := range classDecl.TypeParameters {
		if typeParam, ok := tp.(*ast.TypeParameter); ok {
			typeParams = append(typeParams, typeParam)
		}
	}

	// If no type parameters could be extracted, return
	if len(typeParams) == 0 {
		return
	}

	// Infer type arguments from constructor arguments
	typeMap := tc.genericInferencer.InferTypeArguments(
		typeParams,
		constructorParams,
		newExpr.Arguments,
	)

	// If no types were inferred, return
	if len(typeMap) == 0 {
		return
	}

	// Check if there's a type annotation on the variable
	if declarator.TypeAnnotation == nil {
		return
	}

	// Get the type annotation as TypeReference to extract type arguments
	typeRef, ok := declarator.TypeAnnotation.(*ast.TypeReference)
	if !ok {
		return
	}

	// Check if it's the same class and has type arguments
	if typeRef.Name != id.Name || len(typeRef.TypeArguments) == 0 {
		return
	}

	// Compare each inferred type parameter with declared type argument
	for i, typeParam := range typeParams {
		if i >= len(typeRef.TypeArguments) {
			break
		}

		inferredType, exists := typeMap[typeParam.Name.Name]
		if !exists || inferredType == nil {
			continue
		}

		declaredTypeArg := tc.convertTypeNode(typeRef.TypeArguments[i])
		if declaredTypeArg == nil {
			continue
		}

		// Check if the inferred type is assignable to the declared type
		if !tc.isAssignableTo(inferredType, declaredTypeArg) {
			tc.addError(
				filename,
				declarator.Init.Pos().Line,
				declarator.Init.Pos().Column,
				fmt.Sprintf(
					"Type '%s<%s>' is not assignable to type '%s<%s>'.",
					id.Name,
					inferredType.String(),
					id.Name,
					declaredTypeArg.String(),
				),
				"TS2322",
				"error",
			)
		}
	}
}

// validateGenericConstraints validates that inferred type arguments satisfy
// the constraints defined on the type parameters of a generic class.
// e.g., class Container<T extends { id: number }> should reject { name: "John" }
func (tc *TypeChecker) validateGenericConstraints(
	classDecl *ast.ClassDeclaration,
	newExpr *ast.NewExpression,
	constructorParams []*ast.Parameter,
	filename string,
) {
	// Convert TypeParameters to []*ast.TypeParameter
	var typeParams []*ast.TypeParameter
	for _, tp := range classDecl.TypeParameters {
		if typeParam, ok := tp.(*ast.TypeParameter); ok {
			typeParams = append(typeParams, typeParam)
		}
	}

	if len(typeParams) == 0 {
		return
	}

	// Infer type arguments from constructor arguments
	typeMap := tc.genericInferencer.InferTypeArguments(
		typeParams,
		constructorParams,
		newExpr.Arguments,
	)

	// Check each type parameter's constraint
	for _, typeParam := range typeParams {
		if typeParam.Constraint == nil {
			continue // No constraint to check
		}

		// Get the inferred type for this parameter
		inferredType, exists := typeMap[typeParam.Name.Name]
		if !exists || inferredType == nil {
			continue
		}

		// Convert the constraint to a type
		constraintType := tc.convertTypeNode(typeParam.Constraint)
		if constraintType == nil {
			continue
		}

		// Check if inferred type satisfies the constraint
		if !tc.isAssignableTo(inferredType, constraintType) {
			tc.addError(
				filename,
				newExpr.Pos().Line,
				newExpr.Pos().Column,
				fmt.Sprintf(
					"Type '%s' does not satisfy the constraint '%s'.",
					inferredType.String(),
					constraintType.String(),
				),
				"TS2344",
				"error",
			)
		}
	}
}
