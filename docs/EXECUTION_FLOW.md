# Flujo de Ejecución Completo del TypeChecker

Este documento detalla el ciclo de vida de una ejecución del comando `check`, desde la invocación inicial hasta el reporte de errores.

## Leyenda de Rendimiento
- 🔴 **Muy Pesado**: Cuello de botella principal (CPU o I/O intensivo).
- 🟠 **Pesado**: Consume recursos significativos.
- 🟢 **Ligero**: Operación rápida.

---

## 1. Inicialización (`cmd/check.go`)

El punto de entrada es el comando `check`.

1.  **`runCheck`**: Función principal del comando.
2.  **`config.LoadTSConfig`** 🟢: Busca y carga `tsconfig.json`.
3.  **`checker.NewWithModuleResolver`** 🟢:
    *   Inicializa `TypeChecker`.
    *   Inicializa `SymbolTable`.
    *   Inicializa `ModuleResolver` (con caches vacíos).
    *   Carga librerías base (si están configuradas).

## 2. Descubrimiento de Archivos (`cmd/check.go`)

Dependiendo de si el argumento es un archivo o directorio:

### Ruta A: Directorio (`checkDirectory`)
1.  **`filepath.Walk`** 🟠: Recorre recursivamente el directorio.
    *   Filtra `node_modules` y directorios ocultos.
    *   Identifica archivos `.ts`.
2.  **Bucle de Procesamiento**: Para cada archivo encontrado:
    *   **`parser.ParseFile`** 🔴:
        *   Lee el archivo del disco (I/O).
        *   Tokeniza y construye el AST (CPU).
        *   *Impacto*: Alto por I/O y asignación de memoria para el AST.
    *   **`tc.CheckFile`** 🔴: Ejecuta la verificación de tipos (ver sección 3).
    *   **`tc.ClearFileCache`** 🟢:
        *   Limpia caches de tipos del archivo.
        *   Resetea scopes locales.
        *   *Optimización*: Previene memory leaks.

### Ruta B: Archivo Único (`checkFile`)
1.  **`parser.ParseFile`** 🔴.
2.  **`tc.CheckFile`** 🔴.

---

## 3. Núcleo del Type Checking (`pkg/checker/checker.go`)

La función `CheckFile` orquesta todo el análisis de un solo archivo.

### Fase 3.1: Preparación
1.  **`tc.symbolTable.ClearErrors`** 🟢.
2.  **`tc.symbolTable.EnterScope`** 🟢: Crea un nuevo scope si es un módulo.

### Fase 3.2: Binding (`pkg/symbols/binder.go`)
1.  **`binder.BindFile`** 🟠:
    *   Recorre el AST.
    *   Registra declaraciones (variables, funciones, clases) en la `SymbolTable`.
    *   No verifica tipos aún, solo existencia de símbolos.

### Fase 3.3: Resolución de Módulos (`pkg/modules/resolver.go`)
1.  **`tc.processImports`** 🟠:
    *   Itera sobre `ImportDeclaration`.
    *   Llama a **`ResolveModule`** 🔴:
        *   Calcula rutas absolutas/relativas.
        *   **`resolveFilePath`** 🔴: Realiza múltiples llamadas `os.Stat` para probar extensiones (`.ts`, `.tsx`, `/index.ts`).
            *   *Optimización*: Ahora usa `fileCache` y `notFoundCache`.
        *   Si encuentra el módulo, lo parsea (recursivo) o carga el `.d.ts`.

### Fase 3.4: Verificación de Tipos (`checkFile` -> `checkStatement`)
Recorre recursivamente el AST verificando reglas semánticas.

1.  **`checkStatement`**: Dispatcher según el tipo de nodo.
2.  **`checkVariableDeclaration`**:
    *   Infiere tipos de inicializadores.
    *   Verifica asignabilidad.
3.  **`checkCallExpression`** 🟠:
    *   Verifica que el identificador sea invocable.
    *   Verifica aridad (número de argumentos).
    *   Verifica tipos de argumentos contra parámetros.
4.  **`checkIdentifier`** 🟠:
    *   **`ResolveSymbol`**: Busca el símbolo en la `SymbolTable` (scope chain).
    *   **Si no encuentra el símbolo**:
        *   Llama a **`findSimilarNames`** 🔴.
        *   Llama a **`levenshteinDistance`** 🔴: Calcula distancia de edición contra TODOS los símbolos en scope.
            *   *Optimización*: Ahora limitado a <50 errores y algoritmo optimizado de memoria.

### Fase 3.5: Finalización
1.  **`tc.ClearFileCache`** 🟢: Libera memoria de tipos intermedios y scopes locales.
2.  Retorna lista de `TypeError`.

---

## Resumen de Puntos Críticos (Hotspots)

1.  **`parser.ParseFile`**: Costoso por lectura de disco y construcción de estructuras de árbol. Inevitable por archivo.
2.  **`ResolveModule` / `resolveFilePath`**: Costoso por múltiples llamadas al sistema de archivos (`os.Stat`) para resolver imports. *Mitigado con caches.*
3.  **`levenshteinDistance`**: Extremadamente costoso en CPU y Memoria cuando hay muchos errores de "símbolo no encontrado", ya que compara contra miles de símbolos. *Mitigado con optimización de algoritmo y throttling.*
4.  **`checkImportDeclaration`**: Dispara la resolución de módulos y carga de dependencias.

## Flujo de Datos de Retorno

1.  `CheckFile` retorna `[]TypeError`.
2.  `checkDirectory` acumula estos errores en `allErrors`.
3.  Al finalizar todos los archivos, `cmd/check.go` imprime los errores formateados a `stdout`.
