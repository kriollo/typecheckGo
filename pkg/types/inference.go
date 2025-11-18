package types

import (
	"tstypechecker/pkg/ast"
)

// TypeInferencer infiere tipos de expresiones
type TypeInferencer struct {
	globalEnv *GlobalEnvironment
	typeCache map[ast.Node]*Type
	depth     int // Para evitar recursión infinita
}

// NewTypeInferencer crea un nuevo inferenciador de tipos
func NewTypeInferencer(globalEnv *GlobalEnvironment) *TypeInferencer {
	return &TypeInferencer{
		globalEnv: globalEnv,
		typeCache: make(map[ast.Node]*Type),
	}
}

// SetTypeCache sets the type cache (shared with checker)
func (ti *TypeInferencer) SetTypeCache(cache map[ast.Node]*Type) {
	ti.typeCache = cache
}

// InferType infiere el tipo de una expresión
func (ti *TypeInferencer) InferType(expr ast.Expression) *Type {
	if expr == nil {
		return Unknown
	}

	// Evitar recursión infinita
	if ti.depth > 10 {
		return Unknown
	}
	ti.depth++

	defer func() { ti.depth-- }()

	switch e := expr.(type) {
	case *ast.Literal:
		return ti.inferLiteralType(e)
	case *ast.Identifier:
		// Por ahora retornamos unknown, necesitaríamos la symbol table
		return Unknown
	case *ast.BinaryExpression:
		return ti.inferBinaryExpressionType(e)
	case *ast.CallExpression:
		// Por ahora retornamos unknown
		return Unknown
	case *ast.ArrayExpression:
		return ti.inferArrayType(e)
	case *ast.ArrowFunctionExpression:
		return ti.inferArrowFunctionType(e)
	default:
		return Unknown
	}
}

// inferLiteralType infiere el tipo de un literal
func (ti *TypeInferencer) inferLiteralType(lit *ast.Literal) *Type {
	if lit.Value == nil {
		return Null
	}

	switch v := lit.Value.(type) {
	case bool:
		return Boolean
	case string:
		// Check if it's actually a number stored as a string
		if len(lit.Raw) > 0 {
			firstChar := lit.Raw[0]
			// If it starts with a digit or minus, it's a number
			if (firstChar >= '0' && firstChar <= '9') || firstChar == '-' {
				return Number
			}
			// If it starts with a quote, it's a string
			if firstChar == '"' || firstChar == '\'' || firstChar == '`' {
				return String
			}
		}
		// Default to string
		return String
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		return Number
	default:
		_ = v
		return Unknown
	}
}

// inferBinaryExpressionType infiere el tipo de una expresión binaria
func (ti *TypeInferencer) inferBinaryExpressionType(expr *ast.BinaryExpression) *Type {
	leftType := ti.InferType(expr.Left)
	rightType := ti.InferType(expr.Right)

	switch expr.Operator {
	case "+":
		// Si alguno es string, el resultado es string
		if leftType.Kind == StringType || rightType.Kind == StringType {
			return String
		}
		// Si ambos son números, el resultado es número
		if leftType.Kind == NumberType && rightType.Kind == NumberType {
			return Number
		}
		return Unknown

	case "-", "*", "/", "%":
		// Operadores aritméticos siempre retornan número
		return Number

	case "===", "!==", "==", "!=", "<", ">", "<=", ">=":
		// Operadores de comparación siempre retornan boolean
		return Boolean

	case "&&", "||":
		// Operadores lógicos retornan el tipo de uno de los operandos
		// Por simplicidad, retornamos boolean
		return Boolean

	default:
		return Unknown
	}
}

// inferArrayType infiere el tipo de un array
func (ti *TypeInferencer) inferArrayType(arr *ast.ArrayExpression) *Type {
	if len(arr.Elements) == 0 {
		// Array vacío, tipo any[]
		return NewArrayType(Any)
	}

	// Inferir el tipo del primer elemento
	// En una implementación completa, haríamos union de todos los tipos
	firstType := ti.InferType(arr.Elements[0])
	return NewArrayType(firstType)
}

// inferArrowFunctionType infiere el tipo de una arrow function
func (ti *TypeInferencer) inferArrowFunctionType(arrow *ast.ArrowFunctionExpression) *Type {
	// Por ahora, retornamos un tipo función genérico
	// En una implementación completa, analizaríamos los parámetros y el return
	params := make([]*Type, len(arrow.Params))
	for i := range params {
		params[i] = Any
	}

	return NewFunctionType(params, Any)
}
