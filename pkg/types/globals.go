package types

// GlobalEnvironment contiene los tipos y símbolos globales de JavaScript/TypeScript
type GlobalEnvironment struct {
	Types   map[string]*Type
	Objects map[string]*Type
}

// NewGlobalEnvironment crea un nuevo entorno global con todos los tipos y objetos estándar
func NewGlobalEnvironment() *GlobalEnvironment {
	env := &GlobalEnvironment{
		Types:   make(map[string]*Type),
		Objects: make(map[string]*Type),
	}

	// Registrar tipos primitivos
	env.Types["any"] = Any
	env.Types["unknown"] = Unknown
	env.Types["void"] = Void
	env.Types["never"] = Never
	env.Types["undefined"] = Undefined
	env.Types["null"] = Null
	env.Types["boolean"] = Boolean
	env.Types["number"] = Number
	env.Types["string"] = String
	env.Types["symbol"] = Symbol
	env.Types["bigint"] = BigInt

	// Crear tipo Console
	consoleType := NewObjectType("Console", map[string]*Type{
		"log":   NewFunctionType([]*Type{Any}, Void),
		"error": NewFunctionType([]*Type{Any}, Void),
		"warn":  NewFunctionType([]*Type{Any}, Void),
		"info":  NewFunctionType([]*Type{Any}, Void),
		"debug": NewFunctionType([]*Type{Any}, Void),
		"trace": NewFunctionType([]*Type{Any}, Void),
		"assert": NewFunctionType([]*Type{Boolean, Any}, Void),
		"clear": NewFunctionType([]*Type{}, Void),
		"count": NewFunctionType([]*Type{String}, Void),
		"dir":   NewFunctionType([]*Type{Any}, Void),
		"table": NewFunctionType([]*Type{Any}, Void),
		"time":  NewFunctionType([]*Type{String}, Void),
		"timeEnd": NewFunctionType([]*Type{String}, Void),
	})

	// Crear tipo Object
	objectType := NewObjectType("Object", map[string]*Type{
		"toString":       NewFunctionType([]*Type{}, String),
		"valueOf":        NewFunctionType([]*Type{}, Any),
		"hasOwnProperty": NewFunctionType([]*Type{String}, Boolean),
	})

	// Crear tipo Array
	arrayConstructor := NewObjectType("ArrayConstructor", map[string]*Type{
		"isArray": NewFunctionType([]*Type{Any}, Boolean),
		"from":    NewFunctionType([]*Type{Any}, NewArrayType(Any)),
		"of":      NewFunctionType([]*Type{Any}, NewArrayType(Any)),
	})

	// Crear tipo Math
	mathType := NewObjectType("Math", map[string]*Type{
		"PI":    Number,
		"E":     Number,
		"abs":   NewFunctionType([]*Type{Number}, Number),
		"ceil":  NewFunctionType([]*Type{Number}, Number),
		"floor": NewFunctionType([]*Type{Number}, Number),
		"round": NewFunctionType([]*Type{Number}, Number),
		"max":   NewFunctionType([]*Type{Number}, Number),
		"min":   NewFunctionType([]*Type{Number}, Number),
		"pow":   NewFunctionType([]*Type{Number, Number}, Number),
		"sqrt":  NewFunctionType([]*Type{Number}, Number),
		"random": NewFunctionType([]*Type{}, Number),
		"sin":   NewFunctionType([]*Type{Number}, Number),
		"cos":   NewFunctionType([]*Type{Number}, Number),
		"tan":   NewFunctionType([]*Type{Number}, Number),
	})

	// Crear tipo JSON
	jsonType := NewObjectType("JSON", map[string]*Type{
		"parse":     NewFunctionType([]*Type{String}, Any),
		"stringify": NewFunctionType([]*Type{Any}, String),
	})

	// Crear tipo Promise
	promiseType := NewObjectType("Promise", map[string]*Type{
		"then":    NewFunctionType([]*Type{Any}, Any),
		"catch":   NewFunctionType([]*Type{Any}, Any),
		"finally": NewFunctionType([]*Type{Any}, Any),
	})

	// Registrar objetos globales
	env.Objects["console"] = consoleType
	env.Objects["Object"] = objectType
	env.Objects["Array"] = arrayConstructor
	env.Objects["Math"] = mathType
	env.Objects["JSON"] = jsonType
	env.Objects["Promise"] = promiseType

	// Funciones globales
	env.Objects["parseInt"] = NewFunctionType([]*Type{String, Number}, Number)
	env.Objects["parseFloat"] = NewFunctionType([]*Type{String}, Number)
	env.Objects["isNaN"] = NewFunctionType([]*Type{Any}, Boolean)
	env.Objects["isFinite"] = NewFunctionType([]*Type{Number}, Boolean)
	env.Objects["setTimeout"] = NewFunctionType([]*Type{Any, Number}, Number)
	env.Objects["setInterval"] = NewFunctionType([]*Type{Any, Number}, Number)
	env.Objects["clearTimeout"] = NewFunctionType([]*Type{Number}, Void)
	env.Objects["clearInterval"] = NewFunctionType([]*Type{Number}, Void)

	// Constantes globales
	env.Objects["undefined"] = Undefined
	env.Objects["null"] = Null
	env.Objects["NaN"] = Number
	env.Objects["Infinity"] = Number

	return env
}

// GetType retorna un tipo por nombre
func (env *GlobalEnvironment) GetType(name string) (*Type, bool) {
	typ, exists := env.Types[name]
	return typ, exists
}

// GetObject retorna un objeto global por nombre
func (env *GlobalEnvironment) GetObject(name string) (*Type, bool) {
	obj, exists := env.Objects[name]
	return obj, exists
}

// HasGlobal verifica si un nombre es un global conocido
func (env *GlobalEnvironment) HasGlobal(name string) bool {
	_, existsType := env.Types[name]
	_, existsObj := env.Objects[name]
	return existsType || existsObj
}
