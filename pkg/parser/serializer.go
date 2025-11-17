package parser

import (
	"encoding/json"
	"fmt"
	"strings"

	"tstypechecker/pkg/ast"
)

// ASTToJSON converts AST to JSON format
func ASTToJSON(file *ast.File) (string, error) {
	data, err := json.MarshalIndent(file, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal AST to JSON: %w", err)
	}
	return string(data), nil
}

// ASTToTOON converts AST to TOON format (custom format from instructions)
func ASTToTOON(file *ast.File) (string, error) {
	var builder strings.Builder
	builder.WriteString(fmt.Sprintf("file: %s\n", file.Name))
	builder.WriteString("nodes[\n")
	
	for i, stmt := range file.Body {
		if i > 0 {
			builder.WriteString(",\n")
		}
		nodeStr, err := nodeToTOON(stmt, 1)
		if err != nil {
			return "", err
		}
		builder.WriteString(nodeStr)
	}
	
	builder.WriteString("\n]\n")
	return builder.String(), nil
}

func nodeToTOON(node ast.Node, indent int) (string, error) {
	var builder strings.Builder
	indentStr := strings.Repeat("  ", indent)
	
	switch n := node.(type) {
	case *ast.FunctionDeclaration:
		builder.WriteString(fmt.Sprintf("%s{id:%d, type:%s, span:%s-%s}", 
			indentStr, 1, n.Type(), n.Pos(), n.End()))
		if n.ID != nil {
			builder.WriteString(fmt.Sprintf("\n%s  name: %s", indentStr, n.ID.Name))
		}
		if len(n.Params) > 0 {
			builder.WriteString(fmt.Sprintf("\n%s  params: %d", indentStr, len(n.Params)))
		}
		
	case *ast.VariableDeclaration:
		builder.WriteString(fmt.Sprintf("%s{id:%d, type:%s, span:%s-%s, kind:%s}", 
			indentStr, 1, n.Type(), n.Pos(), n.End(), n.Kind))
		for _, decl := range n.Decls {
			declStr, err := nodeToTOON(decl, indent+1)
			if err != nil {
				return "", err
			}
			builder.WriteString("\n" + declStr)
		}
		
	case *ast.VariableDeclarator:
		builder.WriteString(fmt.Sprintf("%s{id:%d, type:%s, span:%s-%s}", 
			indentStr, 1, n.Type(), n.Pos(), n.End()))
		if n.ID != nil {
			builder.WriteString(fmt.Sprintf("\n%s  id: %s", indentStr, n.ID.Name))
		}
		
	case *ast.ReturnStatement:
		builder.WriteString(fmt.Sprintf("%s{id:%d, type:%s, span:%s-%s}", 
			indentStr, 1, n.Type(), n.Pos(), n.End()))
		
	case *ast.ExpressionStatement:
		builder.WriteString(fmt.Sprintf("%s{id:%d, type:%s, span:%s-%s}", 
			indentStr, 1, n.Type(), n.Pos(), n.End()))
		
	case *ast.IfStatement:
		builder.WriteString(fmt.Sprintf("%s{id:%d, type:%s, span:%s-%s}", 
			indentStr, 1, n.Type(), n.Pos(), n.End()))
		
	case *ast.CallExpression:
		builder.WriteString(fmt.Sprintf("%s{id:%d, type:%s, span:%s-%s}", 
			indentStr, 1, n.Type(), n.Pos(), n.End()))
		
	case *ast.BinaryExpression:
		builder.WriteString(fmt.Sprintf("%s{id:%d, type:%s, span:%s-%s, operator:%s}", 
			indentStr, 1, n.Type(), n.Pos(), n.End(), n.Operator))
		
	case *ast.Identifier:
		builder.WriteString(fmt.Sprintf("%s{id:%d, type:%s, span:%s-%s, name:%s}", 
			indentStr, 1, n.Type(), n.Pos(), n.End(), n.Name))
		
	case *ast.Literal:
		builder.WriteString(fmt.Sprintf("%s{id:%d, type:%s, span:%s-%s, raw:%s}", 
			indentStr, 1, n.Type(), n.Pos(), n.End(), n.Raw))
		
	default:
		builder.WriteString(fmt.Sprintf("%s{id:%d, type:%s, span:%s-%s}", 
			indentStr, 1, n.Type(), n.Pos(), n.End()))
	}
	
	return builder.String(), nil
}

// DiagnosticToTOON converts diagnostic information to TOON format
func DiagnosticToTOON(file string, line, col int, msg, code, severity string) string {
	return fmt.Sprintf("diags[1]{file:%s,line:%d,col:%d,msg:%s,code:%s,severity:%s}:",
		file, line, col, msg, code, severity)
}