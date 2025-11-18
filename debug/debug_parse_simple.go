package main

import (
	"fmt"
	"io/ioutil"
	"tstypechecker/pkg/parser"
)

func main() {
	source, err := ioutil.ReadFile("test/test_destructuring.ts")
	if err != nil {
		panic(err)
	}

	fmt.Printf("Archivo a parsear:\n%s\n\n", string(source))
	fmt.Println("Iniciando parsing con debugging...")

	_, err = parser.ParseFile("test/test_destructuring.ts")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Println("✓ Éxito")
	}
}
