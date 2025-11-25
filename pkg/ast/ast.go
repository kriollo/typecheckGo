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

func (f *File) Type() string  { return "File" }
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

func (v *VariableDeclaration) Type() string  { return "VariableDeclaration" }
func (v *VariableDeclaration) Pos() Position { return v.Position }
func (v *VariableDeclaration) End() Position { return v.EndPos }
func (v *VariableDeclaration) stmtNode()     {}

type VariableDeclarator struct {
	ID             *Identifier
	TypeAnnotation TypeNode
	Init           Expression
	Position       Position
	EndPos         Position
}

func (v *VariableDeclarator) Type() string  { return "VariableDeclarator" }
func (v *VariableDeclarator) Pos() Position { return v.Position }
func (v *VariableDeclarator) End() Position { return v.EndPos }

type FunctionDeclaration struct {
	ID        *Identifier
	Params    []*Parameter
	Body      *BlockStatement
	Async     bool
	Generator bool
	Position  Position
	EndPos    Position
}

func (f *FunctionDeclaration) Type() string  { return "FunctionDeclaration" }
func (f *FunctionDeclaration) Pos() Position { return f.Position }
func (f *FunctionDeclaration) End() Position { return f.EndPos }
func (f *FunctionDeclaration) stmtNode()     {}
func (f *FunctionDeclaration) declNode()     {}

type BlockStatement struct {
	Body     []Statement
	Position Position
	EndPos   Position
}

func (b *BlockStatement) Type() string  { return "BlockStatement" }
func (b *BlockStatement) Pos() Position { return b.Position }
func (b *BlockStatement) End() Position { return b.EndPos }
func (b *BlockStatement) stmtNode()     {}

type ReturnStatement struct {
	Argument Expression
	Position Position
	EndPos   Position
}

func (r *ReturnStatement) Type() string  { return "ReturnStatement" }
func (r *ReturnStatement) Pos() Position { return r.Position }
func (r *ReturnStatement) End() Position { return r.EndPos }
func (r *ReturnStatement) stmtNode()     {}

type ExpressionStatement struct {
	Expression Expression
	Position   Position
	EndPos     Position
}

func (e *ExpressionStatement) Type() string  { return "ExpressionStatement" }
func (e *ExpressionStatement) Pos() Position { return e.Position }
func (e *ExpressionStatement) End() Position { return e.EndPos }
func (e *ExpressionStatement) stmtNode()     {}

type IfStatement struct {
	Test       Expression
	Consequent Statement
	Alternate  Statement // can be nil for if without else
	Position   Position
	EndPos     Position
}

func (i *IfStatement) Type() string  { return "IfStatement" }
func (i *IfStatement) Pos() Position { return i.Position }
func (i *IfStatement) End() Position { return i.EndPos }
func (i *IfStatement) stmtNode()     {}

// SwitchStatement represents a switch statement
type SwitchStatement struct {
	Discriminant Expression
	Cases        []*SwitchCase
	Position     Position
	EndPos       Position
}

func (s *SwitchStatement) Type() string  { return "SwitchStatement" }
func (s *SwitchStatement) Pos() Position { return s.Position }
func (s *SwitchStatement) End() Position { return s.EndPos }
func (s *SwitchStatement) stmtNode()     {}

// SwitchCase represents a case or default clause in a switch statement
type SwitchCase struct {
	Test       Expression // nil for default case
	Consequent []Statement
	Position   Position
	EndPos     Position
}

func (s *SwitchCase) Type() string  { return "SwitchCase" }
func (s *SwitchCase) Pos() Position { return s.Position }
func (s *SwitchCase) End() Position { return s.EndPos }
func (s *SwitchCase) stmtNode()     {}

// Import/Export statements
type ImportDeclaration struct {
	Specifiers []ImportSpecifier
	Source     *Literal
	IsTypeOnly bool // import type ...
	Position   Position
	EndPos     Position
}

func (i *ImportDeclaration) Type() string  { return "ImportDeclaration" }
func (i *ImportDeclaration) Pos() Position { return i.Position }
func (i *ImportDeclaration) End() Position { return i.EndPos }
func (i *ImportDeclaration) stmtNode()     {}

type ImportSpecifier struct {
	Imported   *Identifier // the name being imported
	Local      *Identifier // the local binding name
	IsTypeOnly bool        // import { type Foo }
	Position   Position
	EndPos     Position
}

func (i *ImportSpecifier) Type() string  { return "ImportSpecifier" }
func (i *ImportSpecifier) Pos() Position { return i.Position }
func (i *ImportSpecifier) End() Position { return i.EndPos }

type ExportDeclaration struct {
	Declaration Statement // can be VariableDeclaration, FunctionDeclaration, etc.
	Specifiers  []ExportSpecifier
	Source      *Literal // for re-exports
	IsWildcard  bool
	Exported    *Identifier // for export * as name
	Position    Position
	EndPos      Position
}

func (e *ExportDeclaration) Type() string  { return "ExportDeclaration" }
func (e *ExportDeclaration) Pos() Position { return e.Position }
func (e *ExportDeclaration) End() Position { return e.EndPos }
func (e *ExportDeclaration) stmtNode()     {}

type ExportSpecifier struct {
	Local    *Identifier // the local name
	Exported *Identifier // the exported name
	Position Position
	EndPos   Position
}

func (e *ExportSpecifier) Type() string  { return "ExportSpecifier" }
func (e *ExportSpecifier) Pos() Position { return e.Position }
func (e *ExportSpecifier) End() Position { return e.EndPos }

// TypeAliasDeclaration represents a type alias (type Name = Type)
type TypeAliasDeclaration struct {
	ID             *Identifier
	TypeAnnotation TypeNode
	TypeParameters []TypeNode // For generics like type Foo<T> = ...
	Position       Position
	EndPos         Position
}

func (t *TypeAliasDeclaration) Type() string  { return "TypeAliasDeclaration" }
func (t *TypeAliasDeclaration) Pos() Position { return t.Position }
func (t *TypeAliasDeclaration) End() Position { return t.EndPos }
func (t *TypeAliasDeclaration) stmtNode()     {}
func (t *TypeAliasDeclaration) declNode()     {}

// InterfaceDeclaration represents an interface declaration
type InterfaceDeclaration struct {
	ID             *Identifier
	Body           []InterfaceProperty
	Extends        []TypeNode
	TypeParameters []TypeNode
	Position       Position
	EndPos         Position
}

func (i *InterfaceDeclaration) Type() string  { return "InterfaceDeclaration" }
func (i *InterfaceDeclaration) Pos() Position { return i.Position }
func (i *InterfaceDeclaration) End() Position { return i.EndPos }
func (i *InterfaceDeclaration) stmtNode()     {}
func (i *InterfaceDeclaration) declNode()     {}

// InterfaceProperty represents a property in an interface
type InterfaceProperty struct {
	Key      *Identifier
	Value    TypeNode
	Optional bool
	Position Position
	EndPos   Position
}

func (i InterfaceProperty) Type() string  { return "InterfaceProperty" }
func (i InterfaceProperty) Pos() Position { return i.Position }
func (i InterfaceProperty) End() Position { return i.EndPos }

// ModuleDeclaration represents an ambient module declaration (declare module 'name' { ... })
type ModuleDeclaration struct {
	Name     string // Module name (from string literal)
	Body     []Statement
	Position Position
	EndPos   Position
}

func (m *ModuleDeclaration) Type() string  { return "ModuleDeclaration" }
func (m *ModuleDeclaration) Pos() Position { return m.Position }
func (m *ModuleDeclaration) End() Position { return m.EndPos }
func (m *ModuleDeclaration) stmtNode()     {}
func (m *ModuleDeclaration) declNode()     {}

// Common expressions
type Identifier struct {
	Name     string
	Position Position
	EndPos   Position
}

func (i *Identifier) Type() string  { return "Identifier" }
func (i *Identifier) Pos() Position { return i.Position }
func (i *Identifier) End() Position { return i.EndPos }
func (i *Identifier) exprNode()     {}

type Literal struct {
	Value    interface{}
	Raw      string
	Position Position
	EndPos   Position
}

func (l *Literal) Type() string  { return "Literal" }
func (l *Literal) Pos() Position { return l.Position }
func (l *Literal) End() Position { return l.EndPos }
func (l *Literal) exprNode()     {}

type CallExpression struct {
	Callee        Expression
	TypeArguments []TypeNode
	Arguments     []Expression
	Position      Position
	EndPos        Position
}

func (c *CallExpression) Type() string  { return "CallExpression" }
func (c *CallExpression) Pos() Position { return c.Position }
func (c *CallExpression) End() Position { return c.EndPos }
func (c *CallExpression) exprNode()     {}

type MemberExpression struct {
	Object   Expression
	Property Expression
	Computed bool
	Optional bool // true for optional chaining (obj?.prop)
	Position Position
	EndPos   Position
}

func (m *MemberExpression) Type() string  { return "MemberExpression" }
func (m *MemberExpression) Pos() Position { return m.Position }
func (m *MemberExpression) End() Position { return m.EndPos }
func (m *MemberExpression) exprNode()     {}

type AsExpression struct {
	Expression     Expression
	TypeAnnotation TypeNode
	Position       Position
	EndPos         Position
}

func (a *AsExpression) Type() string  { return "AsExpression" }
func (a *AsExpression) Pos() Position { return a.Position }
func (a *AsExpression) End() Position { return a.EndPos }
func (a *AsExpression) exprNode()     {}

type ConditionalExpression struct {
	Test       Expression
	Consequent Expression
	Alternate  Expression
	Position   Position
	EndPos     Position
}

func (c *ConditionalExpression) Type() string  { return "ConditionalExpression" }
func (c *ConditionalExpression) Pos() Position { return c.Position }
func (c *ConditionalExpression) End() Position { return c.EndPos }
func (c *ConditionalExpression) exprNode()     {}

type BinaryExpression struct {
	Left     Expression
	Operator string
	Right    Expression
	Position Position
	EndPos   Position
}

func (b *BinaryExpression) Type() string  { return "BinaryExpression" }
func (b *BinaryExpression) Pos() Position { return b.Position }
func (b *BinaryExpression) End() Position { return b.EndPos }
func (b *BinaryExpression) exprNode()     {}

type Parameter struct {
	ID           *Identifier
	ParamType    TypeNode
	Optional     bool
	Rest         bool   // true if this is a rest parameter (...args)
	OriginalName string // For destructuring: { prop: var } -> OriginalName="prop"
	Position     Position
	EndPos       Position
}

func (p *Parameter) Type() string  { return "Parameter" }
func (p *Parameter) Pos() Position { return p.Position }
func (p *Parameter) End() Position { return p.EndPos }

// Type nodes
type TypeNode interface {
	Node
	typeNode()
}

type TypeReference struct {
	Name          string
	TypeArguments []TypeNode
	Position      Position
	EndPos        Position
}

func (t *TypeReference) Type() string  { return "TypeReference" }
func (t *TypeReference) Pos() Position { return t.Position }
func (t *TypeReference) End() Position { return t.EndPos }
func (t *TypeReference) typeNode()     {}

type UnionType struct {
	Types    []TypeNode
	Position Position
	EndPos   Position
}

func (u *UnionType) Type() string  { return "UnionType" }
func (u *UnionType) Pos() Position { return u.Position }
func (u *UnionType) End() Position { return u.EndPos }
func (u *UnionType) typeNode()     {}

type IntersectionType struct {
	Types    []TypeNode
	Position Position
	EndPos   Position
}

func (i *IntersectionType) Type() string  { return "IntersectionType" }
func (i *IntersectionType) Pos() Position { return i.Position }
func (i *IntersectionType) End() Position { return i.EndPos }
func (i *IntersectionType) typeNode()     {}

type TupleType struct {
	Elements []TypeNode
	Position Position
	EndPos   Position
}

func (t *TupleType) Type() string  { return "TupleType" }
func (t *TupleType) Pos() Position { return t.Position }
func (t *TupleType) End() Position { return t.EndPos }
func (t *TupleType) typeNode()     {}

// LiteralType represents a literal type like 'foo' or 42
type LiteralType struct {
	Value    interface{}
	Position Position
	EndPos   Position
}

func (l *LiteralType) Type() string  { return "LiteralType" }
func (l *LiteralType) Pos() Position { return l.Position }
func (l *LiteralType) End() Position { return l.EndPos }
func (l *LiteralType) typeNode()     {}

type FunctionType struct {
	Params   []*Parameter
	Return   TypeNode
	Position Position
	EndPos   Position
}

func (f *FunctionType) Type() string  { return "FunctionType" }
func (f *FunctionType) Pos() Position { return f.Position }
func (f *FunctionType) End() Position { return f.EndPos }
func (f *FunctionType) typeNode()     {}

// ObjectType represents an object type literal like { name: string; age: number }
type ObjectTypeLiteral struct {
	Members  []TypeMember
	Position Position
	EndPos   Position
}

func (o *ObjectTypeLiteral) Type() string  { return "ObjectTypeLiteral" }
func (o *ObjectTypeLiteral) Pos() Position { return o.Position }
func (o *ObjectTypeLiteral) End() Position { return o.EndPos }
func (o *ObjectTypeLiteral) typeNode()     {}

// TypeMember represents a member in an object type literal
type TypeMember struct {
	Key       *Identifier
	ValueType TypeNode
	Optional  bool
	Readonly  bool
	Position  Position
	EndPos    Position
}

func (tm *TypeMember) Type() string  { return "TypeMember" }
func (tm *TypeMember) Pos() Position { return tm.Position }
func (tm *TypeMember) End() Position { return tm.EndPos }

// ArrayExpression represents an array literal [1, 2, 3]
type ArrayExpression struct {
	Elements []Expression
	Position Position
	EndPos   Position
}

func (a *ArrayExpression) Type() string  { return "ArrayExpression" }
func (a *ArrayExpression) Pos() Position { return a.Position }
func (a *ArrayExpression) End() Position { return a.EndPos }
func (a *ArrayExpression) exprNode()     {}

// ObjectExpression represents an object literal { key: value }
type ObjectExpression struct {
	Properties []ObjectPropertyNode
	Position   Position
	EndPos     Position
}

func (o *ObjectExpression) Type() string  { return "ObjectExpression" }
func (o *ObjectExpression) Pos() Position { return o.Position }
func (o *ObjectExpression) End() Position { return o.EndPos }
func (o *ObjectExpression) exprNode()     {}

// ObjectPropertyNode is an interface for nodes that can be a property in an object literal
type ObjectPropertyNode interface {
	Node
	objectPropertyNode()
}

// Property represents a property in an object literal
type Property struct {
	Key      Expression
	Value    Expression
	Position Position
	EndPos   Position
}

func (p *Property) Type() string        { return "Property" }
func (p *Property) Pos() Position       { return p.Position }
func (p *Property) End() Position       { return p.EndPos }
func (p *Property) objectPropertyNode() {}

// SpreadElement represents a spread element in an object literal
type SpreadElement struct {
	Argument Expression
	Position Position
	EndPos   Position
}

func (s *SpreadElement) Type() string        { return "SpreadElement" }
func (s *SpreadElement) Pos() Position       { return s.Position }
func (s *SpreadElement) End() Position       { return s.EndPos }
func (s *SpreadElement) objectPropertyNode() {}
func (s *SpreadElement) exprNode()           {}

// ArrowFunctionExpression represents an arrow function (x) => expr
type ArrowFunctionExpression struct {
	Params   []*Parameter
	Body     Node // Can be Expression or BlockStatement
	Async    bool
	Position Position
	EndPos   Position
}

func (a *ArrowFunctionExpression) Type() string  { return "ArrowFunctionExpression" }
func (a *ArrowFunctionExpression) Pos() Position { return a.Position }
func (a *ArrowFunctionExpression) End() Position { return a.EndPos }
func (a *ArrowFunctionExpression) exprNode()     {}

// ForStatement represents a for loop
type ForStatement struct {
	Init     Node // Can be VariableDeclaration or ExpressionStatement
	Test     Expression
	Update   Expression
	Body     Statement
	Position Position
	EndPos   Position
}

func (f *ForStatement) Type() string  { return "ForStatement" }
func (f *ForStatement) Pos() Position { return f.Position }
func (f *ForStatement) End() Position { return f.EndPos }
func (f *ForStatement) stmtNode()     {}

// WhileStatement represents a while loop
type WhileStatement struct {
	Test     Expression
	Body     Statement
	Position Position
	EndPos   Position
}

func (w *WhileStatement) Type() string  { return "WhileStatement" }
func (w *WhileStatement) Pos() Position { return w.Position }
func (w *WhileStatement) End() Position { return w.EndPos }
func (w *WhileStatement) stmtNode()     {}

// TryStatement represents try-catch-finally
type TryStatement struct {
	Block     *BlockStatement
	Handler   *CatchClause    // can be nil
	Finalizer *BlockStatement // can be nil
	Position  Position
	EndPos    Position
}

func (t *TryStatement) Type() string  { return "TryStatement" }
func (t *TryStatement) Pos() Position { return t.Position }
func (t *TryStatement) End() Position { return t.EndPos }
func (t *TryStatement) stmtNode()     {}

// CatchClause represents catch clause
type CatchClause struct {
	Param    *Identifier // can be nil for catch without parameter
	Body     *BlockStatement
	Position Position
	EndPos   Position
}

func (c *CatchClause) Type() string  { return "CatchClause" }
func (c *CatchClause) Pos() Position { return c.Position }
func (c *CatchClause) End() Position { return c.EndPos }

// ThrowStatement represents throw statement
type ThrowStatement struct {
	Argument Expression
	Position Position
	EndPos   Position
}

func (t *ThrowStatement) Type() string  { return "ThrowStatement" }
func (t *ThrowStatement) Pos() Position { return t.Position }
func (t *ThrowStatement) End() Position { return t.EndPos }
func (t *ThrowStatement) stmtNode()     {}

// BreakStatement represents break statement
type BreakStatement struct {
	Label    *Identifier // optional label
	Position Position
	EndPos   Position
}

func (b *BreakStatement) Type() string  { return "BreakStatement" }
func (b *BreakStatement) Pos() Position { return b.Position }
func (b *BreakStatement) End() Position { return b.EndPos }
func (b *BreakStatement) stmtNode()     {}

// ContinueStatement represents continue statement
type ContinueStatement struct {
	Label    *Identifier // optional label
	Position Position
	EndPos   Position
}

func (c *ContinueStatement) Type() string  { return "ContinueStatement" }
func (c *ContinueStatement) Pos() Position { return c.Position }
func (c *ContinueStatement) End() Position { return c.EndPos }
func (c *ContinueStatement) stmtNode()     {}

// AssignmentExpression represents an assignment x = value
type AssignmentExpression struct {
	Left     Expression
	Operator string // =, +=, -=, *=, /=
	Right    Expression
	Position Position
	EndPos   Position
}

func (a *AssignmentExpression) Type() string  { return "AssignmentExpression" }
func (a *AssignmentExpression) Pos() Position { return a.Position }
func (a *AssignmentExpression) End() Position { return a.EndPos }
func (a *AssignmentExpression) exprNode()     {}

// UnaryExpression represents a unary operation ++x, x++, !x, -x
type UnaryExpression struct {
	Operator string // ++, --, !, -, +
	Argument Expression
	Prefix   bool // true for ++x, false for x++
	Position Position
	EndPos   Position
}

func (u *UnaryExpression) Type() string  { return "UnaryExpression" }
func (u *UnaryExpression) Pos() Position { return u.Position }
func (u *UnaryExpression) End() Position { return u.EndPos }
func (u *UnaryExpression) exprNode()     {}

// MappedType represents { [K in keyof T]: U }
type MappedType struct {
	TypeParameter *Identifier
	Constraint    TypeNode
	NameType      TypeNode // For remapping: [K in T as NewKey]
	MappedType    TypeNode
	Optional      bool // For { [K in T]?: U }
	MinusOptional bool // For { [K in T]-?: U }
	Readonly      bool // For { readonly [K in T]: U }
	MinusReadonly bool // For { -readonly [K in T]: U }
	Position      Position
	EndPos        Position
}

func (m *MappedType) Type() string  { return "MappedType" }
func (m *MappedType) Pos() Position { return m.Position }
func (m *MappedType) End() Position { return m.EndPos }
func (m *MappedType) typeNode()     {}

// ConditionalType represents T extends U ? X : Y or T extends infer U ? X : Y
type ConditionalType struct {
	CheckType    TypeNode
	ExtendsType  TypeNode
	InferredType *Identifier // For infer keyword: T extends infer U ? U : never
	TrueType     TypeNode
	FalseType    TypeNode
	Position     Position
	EndPos       Position
}

func (c *ConditionalType) Type() string  { return "ConditionalType" }
func (c *ConditionalType) Pos() Position { return c.Position }
func (c *ConditionalType) End() Position { return c.EndPos }
func (c *ConditionalType) typeNode()     {}

// TemplateLiteralType represents `prefix${T}suffix`
type TemplateLiteralType struct {
	Parts    []string   // Literal parts
	Types    []TypeNode // Interpolated types
	Position Position
	EndPos   Position
}

func (t *TemplateLiteralType) Type() string  { return "TemplateLiteralType" }
func (t *TemplateLiteralType) Pos() Position { return t.Position }
func (t *TemplateLiteralType) End() Position { return t.EndPos }
func (t *TemplateLiteralType) typeNode()     {}

// IndexedAccessType represents T[K]
type IndexedAccessType struct {
	ObjectType TypeNode
	IndexType  TypeNode
	Position   Position
	EndPos     Position
}

func (i *IndexedAccessType) Type() string  { return "IndexedAccessType" }
func (i *IndexedAccessType) Pos() Position { return i.Position }
func (i *IndexedAccessType) End() Position { return i.EndPos }
func (i *IndexedAccessType) typeNode()     {}

// TypeParameter represents a generic type parameter <T extends U = D>
type TypeParameter struct {
	Name       *Identifier
	Constraint TypeNode // extends clause
	Default    TypeNode // default type
	Position   Position
	EndPos     Position
}

func (t *TypeParameter) Type() string  { return "TypeParameter" }
func (t *TypeParameter) Pos() Position { return t.Position }
func (t *TypeParameter) End() Position { return t.EndPos }
func (t *TypeParameter) typeNode()     {}

// ClassDeclaration represents a class declaration
type ClassDeclaration struct {
	ID             *Identifier
	SuperClass     *Identifier // extends clause
	Implements     []TypeNode  // implements clause
	Body           []ClassMember
	TypeParameters []TypeNode // Generic type parameters
	Position       Position
	EndPos         Position
}

func (c *ClassDeclaration) Type() string  { return "ClassDeclaration" }
func (c *ClassDeclaration) Pos() Position { return c.Position }
func (c *ClassDeclaration) End() Position { return c.EndPos }
func (c *ClassDeclaration) stmtNode()     {}
func (c *ClassDeclaration) declNode()     {}

// ClassMember represents a member of a class
type ClassMember interface {
	Node
	classMemberNode()
}

// MethodDefinition represents a method in a class
type MethodDefinition struct {
	Key            *Identifier
	Value          *FunctionExpression
	Kind           string // "method", "constructor", "get", "set"
	Static         bool
	Async          bool
	Position       Position
	EndPos         Position
	AccessModifier string // "public", "private", "protected", ""
}

func (m *MethodDefinition) Type() string     { return "MethodDefinition" }
func (m *MethodDefinition) Pos() Position    { return m.Position }
func (m *MethodDefinition) End() Position    { return m.EndPos }
func (m *MethodDefinition) classMemberNode() {}

// PropertyDefinition represents a property in a class
type PropertyDefinition struct {
	Key            *Identifier
	Value          Expression // initializer
	TypeAnnotation TypeNode
	Static         bool
	Readonly       bool
	Optional       bool
	Position       Position
	EndPos         Position
	AccessModifier string // "public", "private", "protected", ""
}

func (p *PropertyDefinition) Type() string     { return "PropertyDefinition" }
func (p *PropertyDefinition) Pos() Position    { return p.Position }
func (p *PropertyDefinition) End() Position    { return p.EndPos }
func (p *PropertyDefinition) classMemberNode() {}

// FunctionExpression represents a function expression
type FunctionExpression struct {
	ID        *Identifier // can be nil for anonymous functions
	Params    []*Parameter
	Body      *BlockStatement
	Async     bool
	Generator bool
	Position  Position
	EndPos    Position
}

func (f *FunctionExpression) Type() string  { return "FunctionExpression" }
func (f *FunctionExpression) Pos() Position { return f.Position }
func (f *FunctionExpression) End() Position { return f.EndPos }
func (f *FunctionExpression) exprNode()     {}

// NewExpression represents a new expression (new Class())
type NewExpression struct {
	Callee    Expression
	Arguments []Expression
	Position  Position
	EndPos    Position
}

func (n *NewExpression) Type() string  { return "NewExpression" }
func (n *NewExpression) Pos() Position { return n.Position }
func (n *NewExpression) End() Position { return n.EndPos }
func (n *NewExpression) exprNode()     {}

// ThisExpression represents 'this' keyword
type ThisExpression struct {
	Position Position
	EndPos   Position
}

func (t *ThisExpression) Type() string  { return "ThisExpression" }
func (t *ThisExpression) Pos() Position { return t.Position }
func (t *ThisExpression) End() Position { return t.EndPos }
func (t *ThisExpression) exprNode()     {}

// SuperExpression represents 'super' keyword
type SuperExpression struct {
	Position Position
	EndPos   Position
}

func (s *SuperExpression) Type() string  { return "SuperExpression" }
func (s *SuperExpression) Pos() Position { return s.Position }
func (s *SuperExpression) End() Position { return s.EndPos }
func (s *SuperExpression) exprNode()     {}

// YieldExpression represents 'yield' keyword in generator functions
type YieldExpression struct {
	Argument Expression // The value to yield (can be nil for yield without value)
	Delegate bool       // true for yield* (delegate to another generator)
	Position Position
	EndPos   Position
}

func (y *YieldExpression) Type() string  { return "YieldExpression" }
func (y *YieldExpression) Pos() Position { return y.Position }
func (y *YieldExpression) End() Position { return y.EndPos }
func (y *YieldExpression) exprNode()     {}

// TaggedTemplateExpression represents tagged template literals like String.raw`template`
type TaggedTemplateExpression struct {
	Tag      Expression
	Quasi    *TemplateLiteral
	Position Position
	EndPos   Position
}

func (t *TaggedTemplateExpression) Type() string  { return "TaggedTemplateExpression" }
func (t *TaggedTemplateExpression) Pos() Position { return t.Position }
func (t *TaggedTemplateExpression) End() Position { return t.EndPos }
func (t *TaggedTemplateExpression) exprNode()     {}

// TemplateLiteral represents template literals with ${} expressions
type TemplateLiteral struct {
	Quasis      []TemplateElement
	Expressions []Expression
	Position    Position
	EndPos      Position
}

func (t *TemplateLiteral) Type() string  { return "TemplateLiteral" }
func (t *TemplateLiteral) Pos() Position { return t.Position }
func (t *TemplateLiteral) End() Position { return t.EndPos }
func (t *TemplateLiteral) exprNode()     {}

// TemplateElement represents a part of a template literal
type TemplateElement struct {
	Value    TemplateElementValue
	Position Position
	EndPos   Position
}

func (t TemplateElement) Type() string  { return "TemplateElement" }
func (t TemplateElement) Pos() Position { return t.Position }
func (t TemplateElement) End() Position { return t.EndPos }

// TemplateElementValue contains the raw and cooked string values
type TemplateElementValue struct {
	Raw    string
	Cooked string
}

// EnumDeclaration represents an enum declaration
type EnumDeclaration struct {
	Name     *Identifier
	Members  []*EnumMember
	Position Position
	EndPos   Position
}

func (e *EnumDeclaration) Type() string  { return "EnumDeclaration" }
func (e *EnumDeclaration) Pos() Position { return e.Position }
func (e *EnumDeclaration) End() Position { return e.EndPos }
func (e *EnumDeclaration) stmtNode()     {}
func (e *EnumDeclaration) declNode()     {}

// EnumMember represents a member of an enum
type EnumMember struct {
	Name     *Identifier
	Value    Expression // can be nil
	Position Position
	EndPos   Position
}

func (e *EnumMember) Type() string  { return "EnumMember" }
func (e *EnumMember) Pos() Position { return e.Position }
func (e *EnumMember) End() Position { return e.EndPos }

// TypeQuery represents typeof T
type TypeQuery struct {
	ExprName Expression
	Position Position
	EndPos   Position
}

func (t *TypeQuery) Type() string  { return "TypeQuery" }
func (t *TypeQuery) Pos() Position { return t.Position }
func (t *TypeQuery) End() Position { return t.EndPos }
func (t *TypeQuery) typeNode()     {}

// TypeOperator represents keyof T, readonly T, etc.
type TypeOperator struct {
	Operator string
	Target   TypeNode
	Position Position
	EndPos   Position
}

func (t *TypeOperator) Type() string  { return "TypeOperator" }
func (t *TypeOperator) Pos() Position { return t.Position }
func (t *TypeOperator) End() Position { return t.EndPos }
func (t *TypeOperator) typeNode()     {}
