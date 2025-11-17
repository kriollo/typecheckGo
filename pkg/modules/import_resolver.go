package modules

import (
	"fmt"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/symbols"
)

// ImportResolver maneja la resolución de imports en el type checking
type ImportResolver struct {
	moduleResolver *ModuleResolver
	currentModule  *ResolvedModule
}

// NewImportResolver crea un nuevo resolvedor de imports
func NewImportResolver(moduleResolver *ModuleResolver, currentModule *ResolvedModule) *ImportResolver {
	return &ImportResolver{
		moduleResolver: moduleResolver,
		currentModule:  currentModule,
	}
}

// ResolveImport resuelve un import y retorna los símbolos exportados
func (ir *ImportResolver) ResolveImport(importDecl *ast.ImportDeclaration) (map[string]*symbols.Symbol, error) {
	if importDecl == nil {
		return nil, fmt.Errorf("import declaration is nil")
	}
	
	// Resolver el módulo
	sourceStr := ""
	if importDecl.Source != nil {
		sourceStr = importDecl.Source.Value.(string)
	}
	resolvedModule, err := ir.moduleResolver.ResolveModule(sourceStr, ir.currentModule.AbsolutePath)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve import '%s': %w", importDecl.Source, err)
	}
	
	// Crear mapa de símbolos importados
	importedSymbols := make(map[string]*symbols.Symbol)
	
	// Manejar diferentes tipos de imports
	// Buscar el default specifier en los specifiers
	var defaultSpecifier *ast.ImportSpecifier
	for i, spec := range importDecl.Specifiers {
		// El default specifier es el que no tiene Imported (solo Local)
		if spec.Local != nil && spec.Imported == nil {
			defaultSpecifier = &importDecl.Specifiers[i]
			break
		}
	}
	
	if defaultSpecifier != nil {
		// Import por defecto: import foo from 'module'
		if resolvedModule.DefaultExport != nil {
			symbol := &symbols.Symbol{
				Name: defaultSpecifier.Local.Name,
				Node: resolvedModule.DefaultExport.Node,
			}
			importedSymbols[defaultSpecifier.Local.Name] = symbol
		}
	}
	
	// Manejar named imports
	for _, spec := range importDecl.Specifiers {
		// Saltar el default specifier que ya procesamos
		if spec.Imported == nil || spec.Local == nil {
			continue
		}
		
		if export, exists := resolvedModule.Exports[spec.Imported.Name]; exists {
			symbol := &symbols.Symbol{
				Name:     spec.Local.Name,
				Type:     symbols.VariableSymbol,
				Node:     export.Node,
				DeclSpan: export.Position,
			}
			importedSymbols[spec.Local.Name] = symbol
		} else {
			sourceStr := ""
			if importDecl.Source != nil {
				sourceStr = importDecl.Source.Value.(string)
			}
			return nil, fmt.Errorf("export '%s' not found in module '%s'", spec.Imported.Name, sourceStr)
		}
	}
	
	// Manejar namespace imports: import * as name from 'module'
	// Buscar namespace specifier (import * as name)
	var namespaceSpecifier *ast.ImportSpecifier
	for i, spec := range importDecl.Specifiers {
		if spec.Imported != nil && spec.Local != nil && spec.Imported.Name == "*" {
			namespaceSpecifier = &importDecl.Specifiers[i]
			break
		}
	}
	
	if namespaceSpecifier != nil {
		// Crear un símbolo que represente el namespace completo
		namespaceSymbol := &symbols.Symbol{
			Name:     namespaceSpecifier.Local.Name,
			Type:     symbols.ModuleSymbol,
			Node:     importDecl,
			DeclSpan: importDecl.Pos(),
		}
		importedSymbols[namespaceSpecifier.Local.Name] = namespaceSymbol
	}
	
	return importedSymbols, nil
}

// ResolveExport resuelve una referencia de export
func (ir *ImportResolver) ResolveExport(exportDecl *ast.ExportDeclaration) error {
	if exportDecl == nil {
		return fmt.Errorf("export declaration is nil")
	}
	
	// Manejar re-exports: export { foo } from 'module'
	if exportDecl.Source != nil && len(exportDecl.Specifiers) > 0 {
		sourceModuleStr := exportDecl.Source.Value.(string)
		// Resolver el módulo fuente
		sourceModule, err := ir.moduleResolver.ResolveModule(sourceModuleStr, ir.currentModule.AbsolutePath)
		if err != nil {
			return fmt.Errorf("failed to resolve re-export source '%s': %w", sourceModuleStr, err)
		}
		
		// Verificar que los símbolos existan en el módulo fuente
		for _, spec := range exportDecl.Specifiers {
			if _, exists := sourceModule.Exports[spec.Local.Name]; !exists {
				return fmt.Errorf("export '%s' not found in module '%s'", spec.Local.Name, sourceModuleStr)
			}
		}
	}
	
	return nil
}

// GetExportSymbol obtiene un símbolo exportado de un módulo
func (ir *ImportResolver) GetExportSymbol(module *ResolvedModule, exportName string) (*symbols.Symbol, error) {
	if module == nil {
		return nil, fmt.Errorf("module is nil")
	}
	
	if export, exists := module.Exports[exportName]; exists {
		return &symbols.Symbol{
			Name:     export.Name,
			Type:     ir.getSymbolTypeFromExport(export),
			Node:     export.Node,
			DeclSpan: export.Position,
		}, nil
	}
	
	return nil, fmt.Errorf("export '%s' not found in module '%s'", exportName, module.Specifier)
}

// getSymbolTypeFromExport determina el tipo de símbolo basado en el export
func (ir *ImportResolver) getSymbolTypeFromExport(export *ExportInfo) symbols.SymbolType {
	switch export.Type {
	case "default", "named":
		return symbols.VariableSymbol
	case "namespace":
		return symbols.ModuleSymbol
	default:
		return symbols.VariableSymbol
	}
}