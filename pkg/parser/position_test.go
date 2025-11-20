package parser

import (
	"testing"

	"tstypechecker/pkg/ast"
)

func TestLiteralPositions(t *testing.T) {
	code := `error = true;`

	file, err := ParseCode(code, "test.ts")
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	if len(file.Body) == 0 {
		t.Fatal("Expected at least one statement")
	}

	// Get the assignment expression
	exprStmt, ok := file.Body[0].(*ast.ExpressionStatement)
	if !ok {
		t.Fatalf("Expected ExpressionStatement, got %T", file.Body[0])
	}

	assignExpr, ok := exprStmt.Expression.(*ast.AssignmentExpression)
	if !ok {
		t.Fatalf("Expected AssignmentExpression, got %T", exprStmt.Expression)
	}

	// Check the position of the right side (true)
	t.Logf("Code: %s", code)
	t.Logf("Right side type: %T", assignExpr.Right)

	if lit, ok := assignExpr.Right.(*ast.Literal); ok {
		t.Logf("Literal value: %v", lit.Value)
		t.Logf("Literal raw: %s", lit.Raw)
	}

	t.Logf("Right side position: Line=%d, Column=%d", assignExpr.Right.Pos().Line, assignExpr.Right.Pos().Column)
	t.Logf("Right side end position: Line=%d, Column=%d", assignExpr.Right.End().Line, assignExpr.Right.End().Column)

	// The position should point to the start of "true" which is at column 9 (1-indexed)
	// error = true;
	// 123456789012
	//         ^
	expectedCol := 9
	if assignExpr.Right.Pos().Column != expectedCol {
		t.Errorf("Expected column %d, got %d", expectedCol, assignExpr.Right.Pos().Column)
	}
}
