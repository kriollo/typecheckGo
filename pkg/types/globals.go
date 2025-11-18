package types

import (
	"strings"
)

// GlobalEnvironment contiene los tipos y símbolos globales de JavaScript/TypeScript
type GlobalEnvironment struct {
	Types   map[string]*Type
	Objects map[string]*Type
}

// NewGlobalEnvironment crea un nuevo entorno global con todos los tipos y objetos estándar
func NewGlobalEnvironment() *GlobalEnvironment {
	return NewGlobalEnvironmentWithLibs([]string{"ES2020", "DOM"})
}

// NewGlobalEnvironmentWithLibs creates a global environment with specific library support
func NewGlobalEnvironmentWithLibs(libs []string) *GlobalEnvironment {
	env := &GlobalEnvironment{
		Types:   make(map[string]*Type),
		Objects: make(map[string]*Type),
	}

	// Determine which features are available based on libs
	hasDOM := false
	hasES2015OrLater := false
	hasPromise := false

	for _, lib := range libs {
		libLower := strings.ToLower(lib)
		if strings.Contains(libLower, "dom") {
			hasDOM = true
		}
		if strings.Contains(libLower, "es2015") || strings.Contains(libLower, "es6") ||
			strings.Contains(libLower, "es2016") || strings.Contains(libLower, "es2017") ||
			strings.Contains(libLower, "es2018") || strings.Contains(libLower, "es2019") ||
			strings.Contains(libLower, "es2020") || strings.Contains(libLower, "es2021") ||
			strings.Contains(libLower, "es2022") || strings.Contains(libLower, "esnext") {
			hasES2015OrLater = true
			hasPromise = true
		}
		if strings.Contains(libLower, "promise") {
			hasPromise = true
		}
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
		"log":     NewFunctionType([]*Type{Any}, Void),
		"error":   NewFunctionType([]*Type{Any}, Void),
		"warn":    NewFunctionType([]*Type{Any}, Void),
		"info":    NewFunctionType([]*Type{Any}, Void),
		"debug":   NewFunctionType([]*Type{Any}, Void),
		"trace":   NewFunctionType([]*Type{Any}, Void),
		"assert":  NewFunctionType([]*Type{Boolean, Any}, Void),
		"clear":   NewFunctionType([]*Type{}, Void),
		"count":   NewFunctionType([]*Type{String}, Void),
		"dir":     NewFunctionType([]*Type{Any}, Void),
		"table":   NewFunctionType([]*Type{Any}, Void),
		"time":    NewFunctionType([]*Type{String}, Void),
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
		"PI":     Number,
		"E":      Number,
		"abs":    NewFunctionType([]*Type{Number}, Number),
		"ceil":   NewFunctionType([]*Type{Number}, Number),
		"floor":  NewFunctionType([]*Type{Number}, Number),
		"round":  NewFunctionType([]*Type{Number}, Number),
		"max":    NewFunctionType([]*Type{Number}, Number),
		"min":    NewFunctionType([]*Type{Number}, Number),
		"pow":    NewFunctionType([]*Type{Number, Number}, Number),
		"sqrt":   NewFunctionType([]*Type{Number}, Number),
		"random": NewFunctionType([]*Type{}, Number),
		"sin":    NewFunctionType([]*Type{Number}, Number),
		"cos":    NewFunctionType([]*Type{Number}, Number),
		"tan":    NewFunctionType([]*Type{Number}, Number),
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

	// Crear tipo String with ES2015+ methods
	stringProperties := map[string]*Type{
		"length":      Number,
		"charAt":      NewFunctionType([]*Type{Number}, String),
		"charCodeAt":  NewFunctionType([]*Type{Number}, Number),
		"concat":      NewFunctionType([]*Type{String}, String),
		"indexOf":     NewFunctionType([]*Type{String}, Number),
		"lastIndexOf": NewFunctionType([]*Type{String}, Number),
		"slice":       NewFunctionType([]*Type{Number, Number}, String),
		"substring":   NewFunctionType([]*Type{Number, Number}, String),
		"toLowerCase": NewFunctionType([]*Type{}, String),
		"toUpperCase": NewFunctionType([]*Type{}, String),
		"trim":        NewFunctionType([]*Type{}, String),
		"split":       NewFunctionType([]*Type{String}, NewArrayType(String)),
		"replace":     NewFunctionType([]*Type{String, String}, String),
	}

	// Add ES2015+ methods only if lib includes ES2015 or later
	if hasES2015OrLater {
		stringProperties["includes"] = NewFunctionType([]*Type{String}, Boolean)
		stringProperties["startsWith"] = NewFunctionType([]*Type{String}, Boolean)
		stringProperties["endsWith"] = NewFunctionType([]*Type{String}, Boolean)
		stringProperties["repeat"] = NewFunctionType([]*Type{Number}, String)
		stringProperties["padStart"] = NewFunctionType([]*Type{Number, String}, String)
		stringProperties["padEnd"] = NewFunctionType([]*Type{Number, String}, String)
	}

	stringType := NewObjectType("String", stringProperties)

	// Crear tipo Number
	numberType := NewObjectType("Number", map[string]*Type{
		"toFixed":       NewFunctionType([]*Type{Number}, String),
		"toExponential": NewFunctionType([]*Type{Number}, String),
		"toPrecision":   NewFunctionType([]*Type{Number}, String),
		"toString":      NewFunctionType([]*Type{}, String),
		"valueOf":       NewFunctionType([]*Type{}, Number),
	})

	// Crear tipo Boolean
	booleanType := NewObjectType("Boolean", map[string]*Type{
		"toString": NewFunctionType([]*Type{}, String),
		"valueOf":  NewFunctionType([]*Type{}, Boolean),
	})

	// Crear tipo Date
	dateType := NewObjectType("Date", map[string]*Type{
		"getTime":         NewFunctionType([]*Type{}, Number),
		"getFullYear":     NewFunctionType([]*Type{}, Number),
		"getMonth":        NewFunctionType([]*Type{}, Number),
		"getDate":         NewFunctionType([]*Type{}, Number),
		"getDay":          NewFunctionType([]*Type{}, Number),
		"getHours":        NewFunctionType([]*Type{}, Number),
		"getMinutes":      NewFunctionType([]*Type{}, Number),
		"getSeconds":      NewFunctionType([]*Type{}, Number),
		"getMilliseconds": NewFunctionType([]*Type{}, Number),
		"toISOString":     NewFunctionType([]*Type{}, String),
		"toDateString":    NewFunctionType([]*Type{}, String),
		"toTimeString":    NewFunctionType([]*Type{}, String),
	})

	// Crear tipo RegExp
	regExpType := NewObjectType("RegExp", map[string]*Type{
		"test":       NewFunctionType([]*Type{String}, Boolean),
		"exec":       NewFunctionType([]*Type{String}, Any),
		"source":     String,
		"global":     Boolean,
		"ignoreCase": Boolean,
		"multiline":  Boolean,
	})

	// Crear tipo Error
	errorType := NewObjectType("Error", map[string]*Type{
		"name":    String,
		"message": String,
		"stack":   String,
	})

	// Registrar objetos globales
	env.Objects["console"] = consoleType
	env.Objects["Object"] = objectType
	env.Objects["Array"] = arrayConstructor
	env.Objects["Math"] = mathType
	env.Objects["JSON"] = jsonType
	env.Objects["Promise"] = promiseType
	env.Objects["String"] = stringType
	env.Objects["Number"] = numberType
	env.Objects["Boolean"] = booleanType
	env.Objects["Date"] = dateType
	env.Objects["RegExp"] = regExpType
	env.Objects["Error"] = errorType

	// Funciones globales
	env.Objects["parseInt"] = NewFunctionType([]*Type{String, Number}, Number)
	env.Objects["parseFloat"] = NewFunctionType([]*Type{String}, Number)
	env.Objects["isNaN"] = NewFunctionType([]*Type{Any}, Boolean)
	env.Objects["isFinite"] = NewFunctionType([]*Type{Number}, Boolean)
	env.Objects["setTimeout"] = NewFunctionType([]*Type{Any, Number}, Number)
	env.Objects["setInterval"] = NewFunctionType([]*Type{Any, Number}, Number)
	env.Objects["clearTimeout"] = NewFunctionType([]*Type{Number}, Void)
	env.Objects["clearInterval"] = NewFunctionType([]*Type{Number}, Void)

	// Add Promise only if available in lib
	if hasPromise {
		env.Objects["Promise"] = promiseType
	}

	// DOM and Browser APIs (only if DOM lib is included)
	if hasDOM {
		// Document type
		documentType := NewObjectType("Document", map[string]*Type{
			"addEventListener":       NewFunctionType([]*Type{String, Any}, Void),
			"removeEventListener":    NewFunctionType([]*Type{String, Any}, Void),
			"getElementById":         NewFunctionType([]*Type{String}, Any),
			"getElementsByClassName": NewFunctionType([]*Type{String}, Any),
			"getElementsByTagName":   NewFunctionType([]*Type{String}, Any),
			"querySelector":          NewFunctionType([]*Type{String}, Any),
			"querySelectorAll":       NewFunctionType([]*Type{String}, Any),
			"createElement":          NewFunctionType([]*Type{String}, Any),
			"createTextNode":         NewFunctionType([]*Type{String}, Any),
			"body":                   Any,
			"head":                   Any,
			"title":                  String,
		})

		// Location type - make it mutable by marking href as assignable
		locationType := NewObjectType("Location", map[string]*Type{
			"href":     String,
			"protocol": String,
			"host":     String,
			"hostname": String,
			"port":     String,
			"pathname": String,
			"search":   String,
			"hash":     String,
			"reload":   NewFunctionType([]*Type{}, Void),
		})

		windowType := NewObjectType("Window", map[string]*Type{
			"document":       documentType,
			"location":       locationType,
			"console":        consoleType,
			"alert":          NewFunctionType([]*Type{String}, Void),
			"confirm":        NewFunctionType([]*Type{String}, Boolean),
			"prompt":         NewFunctionType([]*Type{String, String}, String),
			"setTimeout":     NewFunctionType([]*Type{Any, Number}, Number),
			"setInterval":    NewFunctionType([]*Type{Any, Number}, Number),
			"clearTimeout":   NewFunctionType([]*Type{Number}, Void),
			"clearInterval":  NewFunctionType([]*Type{Number}, Void),
			"fetch":          NewFunctionType([]*Type{String, Any}, promiseType),
			"localStorage":   Any,
			"sessionStorage": Any,
			"innerWidth":     Number,
			"innerHeight":    Number,
		})

		// Event type
		eventType := NewObjectType("Event", map[string]*Type{
			"type":                     String,
			"target":                   Any,
			"currentTarget":            Any,
			"preventDefault":           NewFunctionType([]*Type{}, Void),
			"stopPropagation":          NewFunctionType([]*Type{}, Void),
			"stopImmediatePropagation": NewFunctionType([]*Type{}, Void),
		})

		// HTMLElement type
		htmlElementType := NewObjectType("HTMLElement", map[string]*Type{
			"innerHTML":           String,
			"innerText":           String,
			"textContent":         String,
			"className":           String,
			"id":                  String,
			"addEventListener":    NewFunctionType([]*Type{String, Any}, Void),
			"removeEventListener": NewFunctionType([]*Type{String, Any}, Void),
			"setAttribute":        NewFunctionType([]*Type{String, String}, Void),
			"getAttribute":        NewFunctionType([]*Type{String}, String),
			"removeAttribute":     NewFunctionType([]*Type{String}, Void),
			"appendChild":         NewFunctionType([]*Type{Any}, Any),
			"removeChild":         NewFunctionType([]*Type{Any}, Any),
			"classList":           Any,
			"style":               Any,
			"dataset":             Any,
		})

		// HTMLImageElement type
		htmlImageElementType := NewObjectType("HTMLImageElement", map[string]*Type{
			"src":    String,
			"alt":    String,
			"width":  Number,
			"height": Number,
		})

		// Response type (Fetch API)
		responseType := NewObjectType("Response", map[string]*Type{
			"ok":         Boolean,
			"status":     Number,
			"statusText": String,
			"headers":    Any,
			"json":       NewFunctionType([]*Type{}, promiseType),
			"text":       NewFunctionType([]*Type{}, promiseType),
			"blob":       NewFunctionType([]*Type{}, promiseType),
		})

		// IntersectionObserver type
		intersectionObserverType := NewObjectType("IntersectionObserver", map[string]*Type{
			"observe":    NewFunctionType([]*Type{Any}, Void),
			"unobserve":  NewFunctionType([]*Type{Any}, Void),
			"disconnect": NewFunctionType([]*Type{}, Void),
		})

		// Register DOM globals
		env.Objects["document"] = documentType
		env.Objects["window"] = windowType
		env.Objects["fetch"] = NewFunctionType([]*Type{String, Any}, promiseType)
		env.Objects["Event"] = eventType
		env.Objects["HTMLElement"] = htmlElementType
		env.Objects["HTMLImageElement"] = htmlImageElementType
		env.Objects["Response"] = responseType
		env.Objects["IntersectionObserver"] = intersectionObserverType
	}

	// Constantes globales
	env.Objects["undefined"] = Undefined
	env.Objects["null"] = Null
	env.Objects["NaN"] = Number
	env.Objects["Infinity"] = Number

	// Register utility types
	utilityTypes := []string{
		"Partial", "Required", "Readonly", "Pick", "Omit", "Record",
		"Exclude", "Extract", "NonNullable", "ReturnType", "Parameters", "Awaited",
	}
	for _, name := range utilityTypes {
		if ut := GetUtilityType(name); ut != nil {
			env.Types[name] = ut
		}
	}

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
