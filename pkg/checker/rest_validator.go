package checker

import (
	"fmt"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// RestParameterValidator validates rest parameters
type RestParameterValidator struct {
	tc *TypeChecker
}

// NewRestParameterValidator creates a new rest parameter validator
func NewRestParameterValidator(tc *TypeChecker) *RestParameterValidator {
	return &RestParameterValidator{tc: tc}
}

// ValidateRestParameter validates a rest parameter declaration
func (rpv *RestParameterValidator) ValidateRestParameter(
	param *ast.Parameter,
	filename string,
) {
	if !param.Rest {
		return
	}

	// Rest parameter must be last
	// This is typically checked by the parser, but we validate here too

	// Rest parameter type must be an array
	if param.ParamType != nil {
		paramType := rpv.tc.convertTypeNode(param.ParamType)

		if paramType.Kind != types.ArrayType && paramType.Kind != types.AnyType {
			rpv.tc.addError(
				filename,
				param.ID.Pos().Line,
				param.ID.Pos().Column,
				fmt.Sprintf(
					"A rest parameter must be of an array type.\n"+
						"  Sugerencia: Cambia el tipo a '%s[]' o 'Array<%s>'",
					paramType.String(), paramType.String(),
				),
				"TS2370",
				"error",
			)
		}
	}
}

// ValidateRestArguments validates arguments passed to a rest parameter
func (rpv *RestParameterValidator) ValidateRestArguments(
	restParam *ast.Parameter,
	args []ast.Expression,
	startIndex int,
	filename string,
) {
	if restParam.ParamType == nil {
		return
	}

	restType := rpv.tc.convertTypeNode(restParam.ParamType)
	if restType.Kind != types.ArrayType {
		return
	}

	elementType := restType.ElementType
	if elementType == nil {
		return
	}

	// Validate each rest argument
	for i := startIndex; i < len(args); i++ {
		arg := args[i]
		argType := rpv.tc.inferencer.InferType(arg)

		if !rpv.tc.isAssignableTo(argType, elementType) {
			rpv.tc.addError(
				filename,
				arg.Pos().Line,
				arg.Pos().Column,
				fmt.Sprintf(
					"Argument of type '%s' is not assignable to rest parameter of type '%s[]'.",
					argType.String(), elementType.String(),
				),
				"TS2345",
				"error",
			)
		}
	}
}

// ValidateSpreadArgument validates spread operator in function calls
func (rpv *RestParameterValidator) ValidateSpreadArgument(
	spreadExpr *ast.SpreadElement,
	expectedType *types.Type,
	filename string,
) {
	if spreadExpr.Argument == nil {
		return
	}

	argType := rpv.tc.inferencer.InferType(spreadExpr.Argument)

	// Spread argument must be iterable (array or tuple)
	if argType.Kind != types.ArrayType && argType.Kind != types.TupleType {
		rpv.tc.addError(
			filename,
			spreadExpr.Pos().Line,
			spreadExpr.Pos().Column,
			fmt.Sprintf(
				"Spread types may only be created from object types.\n"+
					"  Type '%s' is not iterable.",
				argType.String(),
			),
			"TS2698",
			"error",
		)
		return
	}

	// Validate element types if expected type is known
	if expectedType != nil && expectedType.Kind == types.ArrayType {
		if argType.Kind == types.ArrayType && argType.ElementType != nil {
			if !rpv.tc.isAssignableTo(argType.ElementType, expectedType.ElementType) {
				rpv.tc.addError(
					filename,
					spreadExpr.Pos().Line,
					spreadExpr.Pos().Column,
					fmt.Sprintf(
						"Type '%s[]' is not assignable to type '%s[]'.",
						argType.ElementType.String(),
						expectedType.ElementType.String(),
					),
					"TS2345",
					"error",
				)
			}
		}
	}
}

// GetRestParameterIndex finds the index of the rest parameter
func (rpv *RestParameterValidator) GetRestParameterIndex(params []*ast.Parameter) int {
	for i, param := range params {
		if param.Rest {
			return i
		}
	}
	return -1
}

// CountRequiredParameters counts non-optional, non-rest parameters
func (rpv *RestParameterValidator) CountRequiredParameters(params []*ast.Parameter) int {
	count := 0
	for _, param := range params {
		if !param.Optional && !param.Rest {
			count++
		}
	}
	return count
}

// ValidateFunctionWithRest validates a function call with rest parameters
func (rpv *RestParameterValidator) ValidateFunctionWithRest(
	params []*ast.Parameter,
	args []ast.Expression,
	filename string,
	funcName string,
) {
	restIndex := rpv.GetRestParameterIndex(params)
	if restIndex == -1 {
		return // No rest parameter
	}

	requiredCount := rpv.CountRequiredParameters(params)

	// Check minimum argument count
	if len(args) < requiredCount {
		rpv.tc.addError(
			filename,
			args[0].Pos().Line,
			args[0].Pos().Column,
			fmt.Sprintf(
				"Expected at least %d arguments, but got %d.\n"+
					"  Sugerencia: La función '%s' requiere al menos %d argumento(s)",
				requiredCount, len(args), funcName, requiredCount,
			),
			"TS2554",
			"error",
		)
		return
	}

	// Validate regular parameters
	for i := 0; i < restIndex && i < len(args); i++ {
		if params[i].ParamType == nil {
			continue
		}

		expectedType := rpv.tc.convertTypeNode(params[i].ParamType)
		actualType := rpv.tc.inferencer.InferType(args[i])

		if !rpv.tc.isAssignableTo(actualType, expectedType) {
			rpv.tc.addError(
				filename,
				args[i].Pos().Line,
				args[i].Pos().Column,
				fmt.Sprintf(
					"Argument of type '%s' is not assignable to parameter of type '%s'.",
					actualType.String(), expectedType.String(),
				),
				"TS2345",
				"error",
			)
		}
	}

	// Validate rest arguments
	if restIndex < len(params) {
		rpv.ValidateRestArguments(params[restIndex], args, restIndex, filename)
	}
}

// InferRestParameterType infers the element type of a rest parameter
func (rpv *RestParameterValidator) InferRestParameterType(
	args []ast.Expression,
	startIndex int,
) *types.Type {
	if startIndex >= len(args) {
		return types.NewArrayType(types.Any)
	}

	// Infer common type from all rest arguments
	var elementTypes []*types.Type
	for i := startIndex; i < len(args); i++ {
		elementTypes = append(elementTypes, rpv.tc.inferencer.InferType(args[i]))
	}

	// Find common type
	if len(elementTypes) == 0 {
		return types.NewArrayType(types.Any)
	}

	// If all types are the same, use that
	allSame := true
	firstType := elementTypes[0]
	for _, t := range elementTypes[1:] {
		if t.Kind != firstType.Kind || t.Name != firstType.Name {
			allSame = false
			break
		}
	}

	if allSame {
		return types.NewArrayType(firstType)
	}

	// Otherwise, create union
	return types.NewArrayType(types.NewUnionType(elementTypes))
}
