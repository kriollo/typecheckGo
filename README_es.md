# Verificador de Tipos TypeScript en Go

[![English](https://img.shields.io/badge/Language-English-blue)](README.md)
[![Español](https://img.shields.io/badge/Language-Español-red)](README_es.md)

Un **listo para producción** verificador de tipos TypeScript escrito en Go que cubre ~85% de las características de TypeScript utilizadas en proyectos del mundo real.

## 🎯 Inicio Rápido

```bash
# Construir
go build -o tscheck.exe

# Verificar un archivo (descubre automáticamente tsconfig.json)
.\tscheck.exe check myfile.ts

# Verificar un directorio
.\tscheck.exe check ./src

# Verificar código desde entrada de texto (útil para integrar con otras herramientas)
.\tscheck.exe check --code "const x: number = 5;" --filename "example.ts"

# Ver AST
.\tscheck.exe ast myfile.ts

# Formatos de salida
.\tscheck.exe check file.ts -f json  # Formato JSON
.\tscheck.exe check file.ts -f toon  # Formato TOON
```

El verificador descubre automáticamente y respeta tu configuración `tsconfig.json`, incluyendo:
- ✅ Modo `strict` y todas las banderas estrictas
- ✅ `noImplicitAny` - detecta tipos implícitos any
- ✅ `strictNullChecks` - verificación de null/undefined
- ✅ Resolución de módulos con `paths` y `baseUrl`
- ✅ Patrones `include`/`exclude`

## ⚡ Aspectos Destacados

- ✅ **Tasa de Aprobación del 100%** en la suite `test/okay` (170+ archivos)
- ✅ **Sistema de Tipos Avanzado**: Genéricos, Intersecciones, Uniones, Propiedades de Parámetros
- ✅ **Características Modernas**: Encadenamiento Opcional (`?.`), Coalescencia Nula (`??`)
- ✅ **Inferencia de Tipos** para variables, funciones y expresiones complejas
- ✅ **60+ objetos y métodos globales** (console, Math, Array, String, etc.)
- ✅ **Resolución de módulos** con conversión automática .js → .ts
- ✅ **Múltiples formatos de salida**: texto (con colores), JSON, TOON
- ✅ **Sugerencias inteligentes** para errores tipográficos y discrepancias de tipos
- ✅ **Alto Rendimiento**: ~1000 líneas/segundo velocidad de análisis

## Características

### Fase 1: Básica (✅ COMPLETADA)
- **Verificación de Tipos Básica**: Detecta variables indefinidas, discrepancias en la aridad de funciones y errores de sintaxis básicos
- **Tabla de Símbolos**: Mantiene una tabla de símbolos completa con gestión de alcance
- **Análisis AST**: Analiza archivos TypeScript y construye un Árbol de Sintaxis Abstracta
  - Funciones, variables, declaraciones if, expresiones binarias
  - Cadenas de plantilla con interpolación `${}`
  - Literales de array `[1, 2, 3]`
  - Declaraciones import/export
- **Resolución de Módulos**: Resolución de módulos ES6/TypeScript con soporte import/export
  - Resolución automática .js → .ts
  - Importaciones/exportaciones nombradas
  - Caché de módulos
- **Análisis Import/Export**: Resuelve y valida correctamente importaciones y exportaciones entre módulos
- **Múltiples Formatos de Salida**: Soporta formatos de salida texto, JSON y TOON

### Fase 2: Avanzada (✅ COMPLETADA)
- **Sistema de Tipos Avanzado**:
  - **Genéricos**: Parámetros de tipo en funciones, interfaces y alias de tipo con restricciones (`extends`)
  - **Tipos de Intersección**: Soporte para operador `&` y Tipos Marcados
  - **Tipos de Unión**: Soporte para operador `|` y estrechamiento de tipos
  - **Propiedades de Parámetros**: `public`, `private`, `protected`, `readonly` en constructores
  - **Herencia de Interfaces**: Soporte para `extends` en interfaces con herencia de propiedades
  - **Propiedades Opcionales**: Soporte para `?` en interfaces y encadenamiento opcional `?.`
- **Inferencia de Tipos**:
  - Infiera tipos de retorno de funciones genéricas
  - Infiera tipos de literales de objetos y arrays
  - Tipado contextual para callbacks
- **Objetos Globales**: Soporte integrado para 12+ globales JavaScript/TypeScript (60+ métodos)
  - console, Math, Array, JSON, Object, Promise, String, Number, Boolean, Date, RegExp, Error
- **Mensajes de Error Inteligentes**: Códigos de error compatibles con TypeScript con sugerencias útiles
  - Detección de errores tipográficos con algoritmo de distancia Levenshtein
  - Sugerencias conscientes del contexto para conversiones de tipos

### Fase 3: Robustez (✅ COMPLETADA)
- **Cero Falsos Positivos**: Validado contra la suite `test/okay` con tasa de aprobación del 100%.
- **Detección de Errores**: Validado contra la suite `test/faulty` para asegurar que se capturan errores reales.

## Instalación

```bash
go mod tidy
go build -o tscheck.exe
```

## Uso

### Verificación de Tipos Básica

Verificar un solo archivo TypeScript:
```bash
.\tscheck.exe check examples/simple.ts
```

Verificar un directorio recursivamente:
```bash
.\tscheck.exe check ./src
```

### Formatos de Salida

Formato texto con colores (predeterminado):
```bash
.\tscheck.exe check examples/simple.ts
```

Formato JSON (para integración de herramientas):
```bash
.\tscheck.exe check -f json examples/simple.ts > errors.json
```

Formato TOON (formato de tabla compacta):
```bash
.\tscheck.exe check -f toon examples/simple.ts > errors.toon
```

## Arquitectura

### Componentes

1. **Parser** (`pkg/parser/`): Convierte código fuente TypeScript a AST
2. **Tabla de Símbolos** (`pkg/symbols/`): Gestiona símbolos y alcances
3. **Verificador de Tipos** (`pkg/checker/`): Coordina operaciones de verificación de tipos
4. **AST** (`pkg/ast/`): Define tipos de nodos AST

### Códigos de Error

El verificador de tipos utiliza códigos de error compatibles con TypeScript con mensajes descriptivos:

- `TS2304`: No se puede encontrar el nombre 'X' (con sugerencias de errores tipográficos)
- `TS2322`: El tipo 'X' no es asignable al tipo 'Y' (con sugerencias de conversión)
- `TS2554`: Se esperaban X argumentos, pero se obtuvieron Y (con información de parámetros)
- `TS2349`: Esta expresión no es llamable (con pistas de uso)
- `TS2307`: No se puede encontrar el módulo 'X'
- `TS2305`: El módulo 'X' no tiene miembro exportado
- `TS1003`: Identificador inválido
- `TS2511`: No se puede crear una instancia de una clase abstracta

## Desarrollo

### Estructura del Proyecto

```
tstypechecker/
├── cmd/                    # Comandos CLI
│   ├── root.go            # Comando raíz
│   ├── check.go           # Comando check
│   └── ast.go             # Comando AST
├── pkg/                    # Paquetes principales
│   ├── ast/               # Definiciones AST
│   ├── parser/            # Implementación del parser
│   ├── symbols/           # Tabla de símbolos
│   ├── checker/           # Verificador de tipos
│   ├── types/             # Definiciones del sistema de tipos
│   └── modules/           # Resolución de módulos
├── examples/              # Archivos TypeScript de ejemplo
├── test/                  # Suites de prueba (okay, faulty, examples)
├── main.go               # Punto de entrada
└── go.mod                # Archivo de módulo Go
```

### Ejecutar Pruebas

```bash
go test ./...
```

## Licencia

Licencia MIT - Ver archivo LICENSE para detalles.
