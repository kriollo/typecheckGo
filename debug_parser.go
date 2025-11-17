package main

import (
	"fmt"
	"log"
	"tstypechecker/pkg/parser"
)

func main() {
	fmt.Println("=== Test de parsing paso a paso ===")
	
	// Crear un parser manualmente para depurar
	source := `import { add } from "./math.js";`
	fmt.Printf("Fuente: %s\n", source)
	
	// Vamos a crear un parser manual para ver qué pasa
	p := &parser{
		source:   source,
		filename: "test.ts",
		pos:      0,
		line:     1,
		column:   1,
	}
	
	// Avanzar hasta 'from'
	for i := 0; i < len(source); i++ {
		if i+4 < len(source) && source[i:i+4] == "from" {
			fmt.Printf("Encontrado 'from' en posición %d\n", i)
			p.pos = i + 4
			break
		}
	}
	
	// Ver qué hay después de 'from'
	p.skipWhitespaceAndComments()
	fmt.Printf("Después de 'from', pos=%d, caracter='%c'\n", p.pos, source[p.pos])
	
	// Intentar parsear string literal
	result, err := p.parseStringLiteral()
	if err != nil {
		log.Printf("Error al parsear string literal: %v", err)
	} else {
		fmt.Printf("String literal parseado: '%s'\n", result)
	}
}