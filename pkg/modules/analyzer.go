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
	}
	
	return nil
}

// analyzeExportDeclaration analiza una declaración de export
func (a *ModuleAnalyzer) analyzeExportDeclaration(module *ResolvedModule, export *ast.ExportDeclaration) error {
	// Export por defecto - se detecta si no hay especificadores ni source
	if len(export.Specifiers) == 0 && export.Source == nil && export.Declaration != nil {
		module.DefaultExport = &ExportInfo{
			Name:     "default",
			Type:     "default",
			Node:     export.Declaration,
			Position: export.Pos(),
		}
		return nil
	}
	
	// Named exports
	if len(export.Specifiers) > 0 {
		sourceModule := ""
		if export.Source != nil {
			sourceModule = export.Source.Value.(string)
		}
		
		for _, spec := range export.Specifiers {
			module.Exports[spec.Exported.Name] = &ExportInfo{
				Name:         spec.Exported.Name,
				Type:         "named",
				Node:         export, // Usar el export completo como nodo
				Position:     spec.Pos(),
				IsReExport:   spec.Local.Name != spec.Exported.Name,
				SourceModule: sourceModule,
			}
		}
		return nil
	}
	
	// Export de una declaración
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