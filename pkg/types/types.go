package types

import (
	"fmt"
	"strings"
)

// TypeKind representa el tipo de un Type
type TypeKind int

const (
	UnknownType TypeKind = iota
	AnyType
	VoidType
	NeverType
	UndefinedType
	NullType
	BooleanType
	NumberType
	StringType
	SymbolType
	BigIntType
	ObjectType
	FunctionType
	ArrayType
	TupleType
	UnionType
	IntersectionType
	LiteralType
	TypeParameterType
	MappedType
	ConditionalType
	TemplateLiteralType
	IndexedAccessType
)

func (tk TypeKind) String() string {
	switch tk {
	case UnknownType:
		return "unknown"
	case AnyType:
		return "any"
	case VoidType:
		return "void"
	case NeverType:
		return "never"
	case UndefinedType:
		return "undefined"
	case NullType:
		return "null"
	case BooleanType:
		return "boolean"
	case NumberType:
		return "number"
	case StringType:
		return "string"
	case SymbolType:
		return "symbol"
	case BigIntType:
		return "bigint"
	case ObjectType:
		return "object"
	case FunctionType:
		return "function"
	case ArrayType:
		return "array"
	case TupleType:
		return "tuple"
	case UnionType:
		return "union"
	case IntersectionType:
		return "intersection"
	case LiteralType:
		return "literal"
	case TypeParameterType:
		return "type parameter"
	case MappedType:
		return "mapped type"
	case ConditionalType:
		return "conditional type"
	case TemplateLiteralType:
		return "template literal type"
	case IndexedAccessType:
		return "indexed access type"
	default:
		return "unknown"
	}
}

// Type representa un tipo en el sistema de tipos
type Type struct {
	Kind       TypeKind
	Name       string
	Properties map[string]*Type
	ElementType *Type // Para arrays
	Parameters []*Type // Para funciones y type parameters
	ReturnType *Type // Para funciones
	Types      []*Type // Para unions/intersections
	Value      interface{} // Para literal types

	// Para mapped types: { [K in keyof T]: U }
	TypeParameter *Type // K
	Constraint    *Type // keyof T
	MappedType    *Type // U

	// Para conditional types: T extends U ? X : Y
	CheckType *Type // T
	ExtendsType *Type // U
	TrueType  *Type // X
	FalseType *Type // Y

	// Para template literal types
	TemplateParts []string // Las partes literales
	TemplateTypes []*Type  // Los tipos interpolados

	// Para indexed access types: T[K]
	ObjectType *Type // T
	IndexType  *Type // K

	// Para type parameters con constraints
	Default *Type // Tipo por defecto
}

// NewPrimitiveType crea un tipo primitivo
func NewPrimitiveType(kind TypeKind) *Type {
	return &Type{
		Kind: kind,
		Name: kind.String(),
	}
}

// NewObjectType crea un tipo objeto
func NewObjectType(name string, properties map[string]*Type) *Type {
	return &Type{
		Kind:       ObjectType,
		Name:       name,
		Properties: properties,
	}
}

// NewFunctionType crea un tipo función
func NewFunctionType(params []*Type, returnType *Type) *Type {
	return &Type{
		Kind:       FunctionType,
		Parameters: params,
		ReturnType: returnType,
	}
}

// NewArrayType crea un tipo array
func NewArrayType(elementType *Type) *Type {
	return &Type{
		Kind:        ArrayType,
		ElementType: elementType,
	}
}

// NewUnionType crea un tipo union
func NewUnionType(types []*Type) *Type {
	return &Type{
		Kind:  UnionType,
		Types: types,
	}
}

// NewLiteralType crea un tipo literal
func NewLiteralType(value interface{}) *Type {
	return &Type{
		Kind:  LiteralType,
		Value: value,
	}
}

// NewMappedType crea un mapped type { [K in T]: U }
func NewMappedType(typeParam *Type, constraint *Type, mappedType *Type) *Type {
	return &Type{
		Kind:          MappedType,
		TypeParameter: typeParam,
		Constraint:    constraint,
		MappedType:    mappedType,
	}
}

// NewConditionalType crea un conditional type T extends U ? X : Y
func NewConditionalType(checkType *Type, extendsType *Type, trueType *Type, falseType *Type) *Type {
	return &Type{
		Kind:        ConditionalType,
		CheckType:   checkType,
		ExtendsType: extendsType,
		TrueType:    trueType,
		FalseType:   falseType,
	}
}

// NewTemplateLiteralType crea un template literal type
func NewTemplateLiteralType(parts []string, types []*Type) *Type {
	return &Type{
		Kind:          TemplateLiteralType,
		TemplateParts: parts,
		TemplateTypes: types,
	}
}

// NewIndexedAccessType crea un indexed access type T[K]
func NewIndexedAccessType(objectType *Type, indexType *Type) *Type {
	return &Type{
		Kind:       IndexedAccessType,
		ObjectType: objectType,
		IndexType:  indexType,
	}
}

// NewTypeParameter crea un type parameter
func NewTypeParameter(name string, constraint *Type, defaultType *Type) *Type {
	return &Type{
		Kind:       TypeParameterType,
		Name:       name,
		Constraint: constraint,
		Default:    defaultType,
	}
}

// String retorna una representación en string del tipo
func (t *Type) String() string {
	if t == nil {
		return "unknown"
	}

	switch t.Kind {
	case FunctionType:
		params := make([]string, len(t.Parameters))
		for i, p := range t.Parameters {
			params[i] = p.String()
		}
		returnType := "void"
		if t.ReturnType != nil {
			returnType = t.ReturnType.String()
		}
		return fmt.Sprintf("(%s) => %s", strings.Join(params, ", "), returnType)

	case ArrayType:
		if t.ElementType != nil {
			return t.ElementType.String() + "[]"
		}
		return "any[]"

	case UnionType:
		types := make([]string, len(t.Types))
		for i, typ := range t.Types {
			types[i] = typ.String()
		}
		return strings.Join(types, " | ")

	case IntersectionType:
		types := make([]string, len(t.Types))
		for i, typ := range t.Types {
			types[i] = typ.String()
		}
		return strings.Join(types, " & ")

	case LiteralType:
		if str, ok := t.Value.(string); ok {
			return fmt.Sprintf("'%s'", str)
		}
		return fmt.Sprintf("%v", t.Value)

	case MappedType:
		return fmt.Sprintf("{ [%s in %s]: %s }",
			t.TypeParameter.String(),
			t.Constraint.String(),
			t.MappedType.String())

	case ConditionalType:
		return fmt.Sprintf("%s extends %s ? %s : %s",
			t.CheckType.String(),
			t.ExtendsType.String(),
			t.TrueType.String(),
			t.FalseType.String())

	case TemplateLiteralType:
		result := "`"
		for i, part := range t.TemplateParts {
			result += part
			if i < len(t.TemplateTypes) {
				result += "${" + t.TemplateTypes[i].String() + "}"
			}
		}
		result += "`"
		return result

	case IndexedAccessType:
		return fmt.Sprintf("%s[%s]", t.ObjectType.String(), t.IndexType.String())

	case TypeParameterType:
		if t.Constraint != nil {
			return fmt.Sprintf("%s extends %s", t.Name, t.Constraint.String())
		}
		return t.Name

	case ObjectType:
		if t.Name != "" {
			return t.Name
		}
		return "object"

	default:
		if t.Name != "" {
			return t.Name
		}
		return t.Kind.String()
	}
}

// IsAssignableTo verifica si este tipo es asignable a otro tipo
func (t *Type) IsAssignableTo(target *Type) bool {
	if t == nil || target == nil {
		return false
	}

	// any es asignable a todo y todo es asignable a any
	if t.Kind == AnyType || target.Kind == AnyType {
		return true
	}

	// unknown solo es asignable a unknown y any
	if t.Kind == UnknownType {
		return target.Kind == UnknownType || target.Kind == AnyType
	}

	// never es asignable a todo
	if t.Kind == NeverType {
		return true
	}

	// Tipos primitivos deben coincidir exactamente
	if t.Kind == target.Kind && t.Kind <= BigIntType {
		return true
	}

	// Union types
	if t.Kind == UnionType {
		// Todos los tipos en la union deben ser asignables al target
		for _, typ := range t.Types {
			if !typ.IsAssignableTo(target) {
				return false
			}
		}
		return true
	}

	if target.Kind == UnionType {
		// El tipo debe ser asignable a al menos uno de los tipos en la union
		for _, typ := range target.Types {
			if t.IsAssignableTo(typ) {
				return true
			}
		}
		return false
	}

	// Arrays
	if t.Kind == ArrayType && target.Kind == ArrayType {
		if t.ElementType != nil && target.ElementType != nil {
			return t.ElementType.IsAssignableTo(target.ElementType)
		}
		return true
	}

	// Functions - simplificado por ahora
	if t.Kind == FunctionType && target.Kind == FunctionType {
		return true // TODO: implementar contravariance/covariance
	}

	return false
}

// Tipos primitivos predefinidos
var (
	Any       = NewPrimitiveType(AnyType)
	Unknown   = NewPrimitiveType(UnknownType)
	Void      = NewPrimitiveType(VoidType)
	Never     = NewPrimitiveType(NeverType)
	Undefined = NewPrimitiveType(UndefinedType)
	Null      = NewPrimitiveType(NullType)
	Boolean   = NewPrimitiveType(BooleanType)
	Number    = NewPrimitiveType(NumberType)
	String    = NewPrimitiveType(StringType)
	Symbol    = NewPrimitiveType(SymbolType)
	BigInt    = NewPrimitiveType(BigIntType)
)
