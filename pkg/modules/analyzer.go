package modules

import (
	"fmt"
	"tstypechecker/pkg/ast"
)

// ModuleAnalyzer analiza los exports de un módulo
type ModuleAnalyzer struct {
	resolver *ModuleResolver
}

// NewModuleAnalyzer crea un nuevo analizador de módulos
func NewModuleAnalyzer(resolver *ModuleResolver) *ModuleAnalyzer {
	return &ModuleAnalyzer{
		resolver: resolver,
	}
}

// AnalyzeModule analiza los exports de un módulo dado su AST
func (a *ModuleAnalyzer) AnalyzeModule(module *ResolvedModule, file *ast.File) error {
	if file == nil {
		return fmt.Errorf("file AST is nil")
	}

	module.ModuleAST = file

	// Recorrer todas las declaraciones del programa
	for _, stmt := range file.Body {
		if err := a.analyzeStatement(module, stmt); err != nil {
			return err
		}
	}

	return nil
}

// analyzeStatement analiza una declaración en busca de exports
func (a *ModuleAnalyzer) analyzeStatement(module *ResolvedModule, stmt ast.Statement) error {
	switch s := stmt.(type) {
	case *ast.ExportDeclaration:
		return a.analyzeExportDeclaration(module, s)
	case *ast.FunctionDeclaration:
		// Verificar si esta función es exportada
		if a.isExported(s.ID.Name) {
			module.Exports[s.ID.Name] = &ExportInfo{
				Name:     s.ID.Name,
				Type:     "named",
				Node:     s,
				Position: s.Pos(),
			}
		}
	case *ast.VariableDeclaration:
		// Verificar si estas variables son exportadas
		for _, decl := range s.Decls {
			if a.isExported(decl.ID.Name) {
				module.Exports[decl.ID.Name] = &ExportInfo{
					Name:     decl.ID.Name,
					Type:     "named",
					Node:     s,
					Position: s.Pos(),
				}
			}
		}
	case *ast.ModuleDeclaration:
		// Process statements inside declare module blocks
		// This handles files like: declare module 'foo' { export type Bar = ... }
		if s.Body != nil {
			for _, innerStmt := range s.Body {
				if err := a.analyzeStatement(module, innerStmt); err != nil {
					return err
				}
			}
		}
	}

	return nil
}

// analyzeExportDeclaration analiza una declaración de export
func (a *ModuleAnalyzer) analyzeExportDeclaration(module *ResolvedModule, export *ast.ExportDeclaration) error {
	// Named exports with specifiers (e.g., export { foo, bar })
	if len(export.Specifiers) > 0 {
		sourceModule := ""
		if export.Source != nil {
			sourceModule = export.Source.Value.(string)
		}

		for _, spec := range export.Specifiers {
			// Find the original declaration for this export
			originalNode := a.findDeclaration(module, spec.Local.Name)
			if originalNode == nil {
				originalNode = export // Fallback to export node if not found
			}

			module.Exports[spec.Exported.Name] = &ExportInfo{
				Name:         spec.Exported.Name,
				Type:         "named",
				Node:         originalNode,
				Position:     spec.Pos(),
				IsReExport:   spec.Local.Name != spec.Exported.Name,
				SourceModule: sourceModule,
			}
		}
		return nil
	}

	// Export de una declaración (e.g., export const foo = 42; export function bar() {})
	if export.Declaration != nil {
		switch decl := export.Declaration.(type) {
		case *ast.FunctionDeclaration:
			module.Exports[decl.ID.Name] = &ExportInfo{
				Name:     decl.ID.Name,
				Type:     "named",
				Node:     decl,
				Position: decl.Pos(),
			}
		case *ast.VariableDeclaration:
			for _, varDecl := range decl.Decls {
				module.Exports[varDecl.ID.Name] = &ExportInfo{
					Name:     varDecl.ID.Name,
					Type:     "named",
					Node:     decl,
					Position: decl.Pos(),
				}
			}
		case *ast.TypeAliasDeclaration:
			module.Exports[decl.ID.Name] = &ExportInfo{
				Name:     decl.ID.Name,
				Type:     "named",
				Node:     decl,
				Position: decl.Pos(),
			}
		case *ast.InterfaceDeclaration:
			module.Exports[decl.ID.Name] = &ExportInfo{
				Name:     decl.ID.Name,
				Type:     "named",
				Node:     decl,
				Position: decl.Pos(),
			}
		default:
			// This might be a default export (e.g., export default expression)
			module.DefaultExport = &ExportInfo{
				Name:     "default",
				Type:     "default",
				Node:     export.Declaration,
				Position: export.Pos(),
			}
		}
	}

	return nil
}

// isExported verifica si un identificador es exportado
func (a *ModuleAnalyzer) isExported(name string) bool {
	// Por ahora, asumimos que los identificadores de nivel superior NO son exportados
	// A menos que estén en una declaración de export
	// Esta función se usará más adelante cuando implementemos análisis más sofisticado
	return false
}

// findDeclaration finds the original declaration of a symbol in the module
func (a *ModuleAnalyzer) findDeclaration(module *ResolvedModule, name string) ast.Node {
	if module.ModuleAST == nil {
		return nil
	}

	// Search through all top-level statements
	for _, stmt := range module.ModuleAST.Body {
		switch s := stmt.(type) {
		case *ast.FunctionDeclaration:
			if s.ID != nil && s.ID.Name == name {
				return s
			}
		case *ast.VariableDeclaration:
			for _, decl := range s.Decls {
				if decl.ID != nil && decl.ID.Name == name {
					return s
				}
			}
		}
	}

	return nil
}
