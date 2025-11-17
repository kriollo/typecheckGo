package main

import (
	"fmt"
	"io/ioutil"
	"log"
)

func main() {
	fmt.Println("=== Verificación de contenido del archivo ===")
	
	// Leer el archivo
	content, err := ioutil.ReadFile("test/ultra_simple.ts")
	if err != nil {
		log.Printf("Error al leer archivo: %v", err)
		return
	}
	
	fmt.Printf("Contenido del archivo:\n")
	fmt.Printf("'%s'\n", string(content))
	fmt.Printf("Longitud: %d\n", len(content))
	fmt.Printf("Bytes: %v\n", content)
	
	// Verificar si hay caracteres especiales
	for i, b := range content {
		if b < 32 || b > 126 {
			fmt.Printf("Caracter no ASCII en posición %d: %d\n", i, b)
		}
	}
}