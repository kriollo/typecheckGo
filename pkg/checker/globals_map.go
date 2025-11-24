package checker

// getCommonGlobalMap returns a map of common global symbols to their defining library file
func getCommonGlobalMap() map[string]string {
	m := make(map[string]string)

	// DOM globals
	domGlobals := []string{
		"document", "window", "console", "location", "navigator", "history",
		"localStorage", "sessionStorage", "indexedDB", "caches",
		"fetch", "alert", "prompt", "confirm", "open", "close",
		"setTimeout", "clearTimeout", "setInterval", "clearInterval",
		"requestAnimationFrame", "cancelAnimationFrame",
		"HTMLElement", "HTMLDivElement", "HTMLSpanElement", "HTMLInputElement",
		"HTMLButtonElement", "HTMLFormElement", "HTMLAnchorElement", "HTMLImageElement",
		"Event", "MouseEvent", "KeyboardEvent", "TouchEvent", "FocusEvent",
		"Node", "Element", "Document", "Window", "NodeList", "HTMLCollection",
		"XMLHttpRequest", "FormData", "Headers", "Request", "Response", "URL", "URLSearchParams",
		"Blob", "File", "FileReader", "WebSocket", "Worker", "SharedWorker",
	}
	for _, g := range domGlobals {
		m[g] = "lib.dom.d.ts"
	}

	// ES2015+ globals
	esGlobals := []string{
		"Promise", "Map", "Set", "WeakMap", "WeakSet", "Symbol", "Proxy", "Reflect",
		"Intl", "ArrayBuffer", "DataView", "Int8Array", "Uint8Array", "Uint8ClampedArray",
		"Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array",
		"BigInt", "BigInt64Array", "BigUint64Array",
	}
	for _, g := range esGlobals {
		m[g] = "lib.es2015.d.ts"
	}

	// ES5 globals (usually in lib.es5.d.ts, but we map them to es2015 for simplicity as it includes es5)
	es5Globals := []string{
		"Object", "Function", "String", "Boolean", "Number", "Math", "Date", "RegExp",
		"Error", "EvalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError",
		"Error", "EvalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError",
		"JSON", "Array", "parseInt", "parseFloat", "isNaN", "isFinite", "decodeURI", "decodeURIComponent",
		"encodeURI", "encodeURIComponent",
		"NonNullable", "Partial", "Readonly", "Record", "Pick", "Omit", "Exclude", "Extract",
		"Parameters", "ConstructorParameters", "ReturnType", "InstanceType", "Required",
		"ThisParameterType", "OmitThisParameter", "ThisType",
	}
	for _, g := range es5Globals {
		m[g] = "lib.es2015.d.ts" // Or lib.es5.d.ts if we want to be specific
	}

	return m
}
