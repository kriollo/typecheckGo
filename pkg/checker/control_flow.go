package checker

import (
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// ControlFlowAnalyzer analyzes control flow for return statements
type ControlFlowAnalyzer struct {
	tc *TypeChecker
}

// NewControlFlowAnalyzer creates a new control flow analyzer
func NewControlFlowAnalyzer(tc *TypeChecker) *ControlFlowAnalyzer {
	return &ControlFlowAnalyzer{tc: tc}
}

// ReturnInfo contains information about return statements
type ReturnInfo struct {
	HasReturn      bool
	ReturnTypes    []*types.Type
	AllPathsReturn bool
}

// AnalyzeReturns analyzes all return statements in a function
func (cfa *ControlFlowAnalyzer) AnalyzeReturns(body *ast.BlockStatement) *ReturnInfo {
	info := &ReturnInfo{
		ReturnTypes: []*types.Type{},
	}

	if cfa == nil || cfa.tc == nil || body == nil {
		return info
	}

	info.AllPathsReturn = cfa.analyzeStatements(body.Body, info)
	info.HasReturn = len(info.ReturnTypes) > 0

	return info
}

// analyzeStatements analyzes a list of statements
func (cfa *ControlFlowAnalyzer) analyzeStatements(
	statements []ast.Statement,
	info *ReturnInfo,
) bool {
	for _, stmt := range statements {
		if cfa.analyzeStatement(stmt, info) {
			return true // Definite return
		}
	}
	return false
}

// analyzeStatement analyzes a single statement
func (cfa *ControlFlowAnalyzer) analyzeStatement(
	stmt ast.Statement,
	info *ReturnInfo,
) bool {
	switch s := stmt.(type) {
	case *ast.ReturnStatement:
		returnType := types.Void
		if s.Argument != nil {
			returnType = cfa.tc.inferencer.InferType(s.Argument)
		}
		info.ReturnTypes = append(info.ReturnTypes, returnType)
		return true

	case *ast.IfStatement:
		return cfa.analyzeIfStatement(s, info)

	case *ast.BlockStatement:
		return cfa.analyzeStatements(s.Body, info)

	case *ast.SwitchStatement:
		return cfa.analyzeSwitchStatement(s, info)

	case *ast.TryStatement:
		return cfa.analyzeTryStatement(s, info)

	case *ast.WhileStatement:
		// While loops don't guarantee execution
		cfa.analyzeStatement(s.Body, info)
		return false

	case *ast.ForStatement:
		// For loops don't guarantee execution
		if s.Body != nil {
			cfa.analyzeStatement(s.Body, info)
		}
		return false

	case *ast.ThrowStatement:
		// Throw is like a return - control flow ends
		return true
	}

	return false
}

// analyzeIfStatement analyzes if-else branches
func (cfa *ControlFlowAnalyzer) analyzeIfStatement(
	ifStmt *ast.IfStatement,
	info *ReturnInfo,
) bool {
	consequentReturns := cfa.analyzeStatement(ifStmt.Consequent, info)

	if ifStmt.Alternate == nil {
		return false // No else branch, not all paths return
	}

	alternateReturns := cfa.analyzeStatement(ifStmt.Alternate, info)

	return consequentReturns && alternateReturns
}

// analyzeSwitchStatement analyzes switch cases
func (cfa *ControlFlowAnalyzer) analyzeSwitchStatement(
	switchStmt *ast.SwitchStatement,
	info *ReturnInfo,
) bool {
	if len(switchStmt.Cases) == 0 {
		return false
	}

	hasDefault := false
	allCasesReturn := true

	for _, caseClause := range switchStmt.Cases {
		if caseClause.Test == nil {
			hasDefault = true
		}

		caseReturns := false
		for _, stmt := range caseClause.Consequent {
			if cfa.analyzeStatement(stmt, info) {
				caseReturns = true
				break
			}
		}

		if !caseReturns {
			allCasesReturn = false
		}
	}

	return hasDefault && allCasesReturn
}

// analyzeTryStatement analyzes try-catch-finally
func (cfa *ControlFlowAnalyzer) analyzeTryStatement(
	tryStmt *ast.TryStatement,
	info *ReturnInfo,
) bool {
	tryReturns := false
	if tryStmt.Block != nil {
		tryReturns = cfa.analyzeStatement(tryStmt.Block, info)
	}

	catchReturns := false
	if tryStmt.Handler != nil && tryStmt.Handler.Body != nil {
		catchReturns = cfa.analyzeStatement(tryStmt.Handler.Body, info)
	}

	// Finally block doesn't affect return analysis (it always executes)
	if tryStmt.Finalizer != nil {
		cfa.analyzeStatement(tryStmt.Finalizer, info)
	}

	// All paths return if both try and catch return
	return tryReturns && catchReturns
}

// UnifyReturnTypes creates a union of all return types
func (cfa *ControlFlowAnalyzer) UnifyReturnTypes(returnTypes []*types.Type) *types.Type {
	if len(returnTypes) == 0 {
		return types.Void
	}

	if len(returnTypes) == 1 {
		return returnTypes[0]
	}

	// Check if all types are the same
	allSame := true
	firstType := returnTypes[0]
	for _, rt := range returnTypes[1:] {
		if !cfa.tc.isAssignableTo(firstType, rt) || !cfa.tc.isAssignableTo(rt, firstType) {
			allSame = false
			break
		}
	}

	if allSame {
		return firstType
	}

	// Create union type
	return types.NewUnionType(returnTypes)
}

// areTypesEqual checks if two types are equal
func (cfa *ControlFlowAnalyzer) areTypesEqual(t1, t2 *types.Type) bool {
	if t1 == nil || t2 == nil {
		return t1 == t2
	}

	if t1.Kind != t2.Kind {
		return false
	}

	if t1.Name != t2.Name {
		return false
	}

	return true
}
