package ast

import (
	"fmt"
)

type Node interface {
	Type() string
	Pos() Position
	End() Position
}

type Position struct {
	Line   int
	Column int
	Offset int
}

func (p Position) String() string {
	return fmt.Sprintf("%d:%d", p.Line, p.Column)
}

type File struct {
	Name     string
	Source   string
	Body     []Statement
	Position Position
	EndPos   Position
}

func (f *File) Type() string { return "File" }
func (f *File) Pos() Position { return f.Position }
func (f *File) End() Position { return f.EndPos }

type Statement interface {
	Node
	stmtNode()
}

type Expression interface {
	Node
	exprNode()
}

type Declaration interface {
	Statement
	declNode()
}

// Common statements
type VariableDeclaration struct {
	Kind     string // "var", "let", "const"
	Decls    []*VariableDeclarator
	Position Position
	EndPos   Position
}

func (v *VariableDeclaration) Type() string { return "VariableDeclaration" }
func (v *VariableDeclaration) Pos() Position { return v.Position }
func (v *VariableDeclaration) End() Position { return v.EndPos }
func (v *VariableDeclaration) stmtNode() {}

type VariableDeclarator struct {
	ID   *Identifier
	Init Expression
	Position Position
	EndPos   Position
}

func (v *VariableDeclarator) Type() string { return "VariableDeclarator" }
func (v *VariableDeclarator) Pos() Position { return v.Position }
func (v *VariableDeclarator) End() Position { return v.EndPos }

type FunctionDeclaration struct {
	ID       *Identifier
	Params   []*Parameter
	Body     *BlockStatement
	Async    bool
	Generator bool
	Position Position
	EndPos   Position
}

func (f *FunctionDeclaration) Type() string { return "FunctionDeclaration" }
func (f *FunctionDeclaration) Pos() Position { return f.Position }
func (f *FunctionDeclaration) End() Position { return f.EndPos }
func (f *FunctionDeclaration) stmtNode() {}
func (f *FunctionDeclaration) declNode() {}

type BlockStatement struct {
	Body     []Statement
	Position Position
	EndPos   Position
}

func (b *BlockStatement) Type() string { return "BlockStatement" }
func (b *BlockStatement) Pos() Position { return b.Position }
func (b *BlockStatement) End() Position { return b.EndPos }
func (b *BlockStatement) stmtNode() {}

type ReturnStatement struct {
	Argument Expression
	Position Position
	EndPos   Position
}

func (r *ReturnStatement) Type() string { return "ReturnStatement" }
func (r *ReturnStatement) Pos() Position { return r.Position }
func (r *ReturnStatement) End() Position { return r.EndPos }
func (r *ReturnStatement) stmtNode() {}

type ExpressionStatement struct {
	Expression Expression
	Position Position
	EndPos   Position
}

func (e *ExpressionStatement) Type() string { return "ExpressionStatement" }
func (e *ExpressionStatement) Pos() Position { return e.Position }
func (e *ExpressionStatement) End() Position { return e.EndPos }
func (e *ExpressionStatement) stmtNode() {}

type IfStatement struct {
	Test       Expression
	Consequent Statement
	Alternate  Statement // can be nil for if without else
	Position   Position
	EndPos     Position
}

func (i *IfStatement) Type() string { return "IfStatement" }
func (i *IfStatement) Pos() Position { return i.Position }
func (i *IfStatement) End() Position { return i.EndPos }
func (i *IfStatement) stmtNode() {}

// Import/Export statements
type ImportDeclaration struct {
	Specifiers []ImportSpecifier
	Source     *Literal
	Position   Position
	EndPos     Position
}

func (i *ImportDeclaration) Type() string { return "ImportDeclaration" }
func (i *ImportDeclaration) Pos() Position { return i.Position }
func (i *ImportDeclaration) End() Position { return i.EndPos }
func (i *ImportDeclaration) stmtNode() {}

type ImportSpecifier struct {
	Imported *Identifier // the name being imported
	Local    *Identifier // the local binding name
	Position Position
	EndPos   Position
}

func (i *ImportSpecifier) Type() string { return "ImportSpecifier" }
func (i *ImportSpecifier) Pos() Position { return i.Position }
func (i *ImportSpecifier) End() Position { return i.EndPos }

type ExportDeclaration struct {
	Declaration Statement  // can be VariableDeclaration, FunctionDeclaration, etc.
	Specifiers []ExportSpecifier
	Source     *Literal   // for re-exports
	Position   Position
	EndPos     Position
}

func (e *ExportDeclaration) Type() string { return "ExportDeclaration" }
func (e *ExportDeclaration) Pos() Position { return e.Position }
func (e *ExportDeclaration) End() Position { return e.EndPos }
func (e *ExportDeclaration) stmtNode() {}

type ExportSpecifier struct {
	Local    *Identifier // the local name
	Exported *Identifier // the exported name
	Position Position
	EndPos   Position
}

func (e *ExportSpecifier) Type() string { return "ExportSpecifier" }
func (e *ExportSpecifier) Pos() Position { return e.Position }
func (e *ExportSpecifier) End() Position { return e.EndPos }

// Common expressions
type Identifier struct {
	Name     string
	Position Position
	EndPos   Position
}

func (i *Identifier) Type() string { return "Identifier" }
func (i *Identifier) Pos() Position { return i.Position }
func (i *Identifier) End() Position { return i.EndPos }
func (i *Identifier) exprNode() {}

type Literal struct {
	Value    interface{}
	Raw      string
	Position Position
	EndPos   Position
}

func (l *Literal) Type() string { return "Literal" }
func (l *Literal) Pos() Position { return l.Position }
func (l *Literal) End() Position { return l.EndPos }
func (l *Literal) exprNode() {}

type CallExpression struct {
	Callee    Expression
	Arguments []Expression
	Position  Position
	EndPos    Position
}

func (c *CallExpression) Type() string { return "CallExpression" }
func (c *CallExpression) Pos() Position { return c.Position }
func (c *CallExpression) End() Position { return c.EndPos }
func (c *CallExpression) exprNode() {}

type MemberExpression struct {
	Object   Expression
	Property Expression
	Computed bool
	Position Position
	EndPos   Position
}

type BinaryExpression struct {
	Left     Expression
	Operator string
	Right    Expression
	Position Position
	EndPos   Position
}

func (m *MemberExpression) Type() string { return "MemberExpression" }
func (m *MemberExpression) Pos() Position { return m.Position }
func (m *MemberExpression) End() Position { return m.EndPos }
func (m *MemberExpression) exprNode() {}

func (b *BinaryExpression) Type() string { return "BinaryExpression" }
func (b *BinaryExpression) Pos() Position { return b.Position }
func (b *BinaryExpression) End() Position { return b.EndPos }
func (b *BinaryExpression) exprNode() {}

type Parameter struct {
	ID       *Identifier
	ParamType     TypeNode
	Optional bool
	Position Position
	EndPos   Position
}

func (p *Parameter) Type() string { return "Parameter" }
func (p *Parameter) Pos() Position { return p.Position }
func (p *Parameter) End() Position { return p.EndPos }

// Type nodes
type TypeNode interface {
	Node
	typeNode()
}

type TypeReference struct {
	Name     string
	Position Position
	EndPos   Position
}

func (t *TypeReference) Type() string { return "TypeReference" }
func (t *TypeReference) Pos() Position { return t.Position }
func (t *TypeReference) End() Position { return t.EndPos }
func (t *TypeReference) typeNode() {}

type UnionType struct {
	Types    []TypeNode
	Position Position
	EndPos   Position
}

func (u *UnionType) Type() string { return "UnionType" }
func (u *UnionType) Pos() Position { return u.Position }
func (u *UnionType) End() Position { return u.EndPos }
func (u *UnionType) typeNode() {}

type FunctionType struct {
	Params []TypeNode
	Return TypeNode
	Position Position
	EndPos   Position
}

func (f *FunctionType) Type() string { return "FunctionType" }
func (f *FunctionType) Pos() Position { return f.Position }
func (f *FunctionType) End() Position { return f.EndPos }
func (f *FunctionType) typeNode() {}