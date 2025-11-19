---
applyTo: '**'
---

# Memoria del Proyecto TypeChecker

## Idioma
- El idioma predeterminado para todas las respuestas al usuario es **Español**, a menos que se solicite explícitamente lo contrario.

## Contexto del Proyecto
Este es un **type checker de TypeScript** escrito en Go que parsea archivos TypeScript y verifica tipos.

### Arquitectura
- **Lenguaje**: Go 1.21+
- **Componentes**:
  - `pkg/parser/parser.go`: Parser recursivo de TypeScript (~3700 líneas)
  - `pkg/ast/ast.go`: Definiciones de AST
  - `pkg/checker/checker.go`: Type checker
  - `pkg/symbols/`: Tabla de símbolos
  - `pkg/modules/`: Resolución de módulos

### Problema Resuelto (Diciembre 2024)
**Infinite Loop al parsear `test/functions.ts`**:
- **Causa**: Destructuring patterns (`const { a, b = 'default' } = obj`) y for-in/of loops sin protección
- **Solución**:
  1. Agregados límites de iteración (`maxParserIterations = 100000`) en 15+ loops críticos
  2. Detección y skip temporal de destructuring patterns y for-in/of
  3. Implementadas 10+ features nuevas de TypeScript

### Features Implementadas Recientemente
1. **async arrow functions**: `async (params) => {}`
2. **shorthand properties**: `{ url, method }` en objetos
3. **instanceof operator**: `data instanceof FormData`
4. **optional chaining**: `obj?.prop?.method`
5. **await operator**: `await fetch(url)`
6. **regex literals**: `/pattern/flags`
7. **try-catch-finally**: Temporalmente se hace skip del bloque completo
8. **arrow functions con return type vacío**: `(): string => {}`
9. **Protección anti-infinite-loop**: Todos los loops del parser tienen límites
10. **Detección de destructuring y for-in/of**: Se detectan y se hace skip temporal

### Constantes de Seguridad
```go
const maxParserIterations = 100000  // Límite de iteraciones por loop
const maxNestedDepth = 1000         // Profundidad máxima de anidación
```

### Limitaciones Conocidas
- **Destructuring**: Se detecta y se hace skip (no se parsea al AST)
- **For-in/for-of**: Se detecta y se hace skip del header
- **Try-catch**: Se hace skip completo del bloque (no se genera AST)
- **Caracteres Unicode**: `ñ`, `á`, etc. en identificadores causan errores
- **Regex context**: Detección simple (puede fallar en edge cases)

### Rendimiento
- `test/functions.ts` (719 líneas): ~0.6 segundos (antes: timeout infinito)
- Simple test files: <10ms

### Comandos Útiles
```powershell
# Compilar
go build -o typecheker.exe main.go

# Probar un archivo
.\typecheker.exe check test/functions.ts

# Ver AST
.\typecheker.exe check test/functions.ts -a

# Con timeout
$timeout = 5; $job = Start-Job -ScriptBlock { & ".\typecheker.exe" check test/functions.ts 2>&1 }; Wait-Job $job -Timeout $timeout | Out-Null; if ($job.State -eq 'Running') { Stop-Job $job; Remove-Job $job; Write-Host "TIMEOUT" } else { Receive-Job $job; Remove-Job $job }
```

### Testing
Archivos de test creados:
- `test/test_destructuring.ts`: Destructuring patterns
- `test/test_for_in.ts`: For-in loops
- `test/test_async_arrow.ts`: Async arrow functions
- `test/test_instanceof.ts`: Instanceof operator
- `test/test_optional_chaining.ts`: Optional chaining
- `test/test_ternary_await.ts`: Ternary con await
- `test/test_try_catch.ts`: Try-catch blocks
- `test/test_arrow_return_type.ts`: Arrow con return type

### Progreso del Parser
El parser ahora puede manejar construcciones complejas de TypeScript sin entrar en loops infinitos. La estrategia general es:
1. **Detectar**: Identificar construcciones problemáticas
2. **Proteger**: Agregar límites de iteración
3. **Skip temporal**: Para features no implementadas, hacer skip sin error
4. **Iterar**: Continuar agregando soporte completo progresivamente

### Próximos Pasos Sugeridos
1. Implementar parsing completo de destructuring (actualmente skip)
2. Implementar AST nodes para try-catch-finally
3. Agregar soporte completo para for-in/for-of
4. Mejorar detección de regex literals (contexto léxico)
5. Agregar soporte para caracteres Unicode en identificadores
6. Implementar optional call `?.()` y optional indexed access `?.[...]`
