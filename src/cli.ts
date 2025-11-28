#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { GoTypeChecker, TypeCheckResult } from './index';

const program = new Command();

program
  .name('go-typecheck')
  .description('Type checker for Go written in TypeScript')
  .version('1.0.0');

program
  .command('check <file>')
  .description('Check a Go file or directory for type errors')
  .option('-t, --timeout <ms>', 'Timeout in milliseconds (default: 10000)', '10000')
  .allowUnknownOption()
  .action(async (file: string, options: { timeout: string }, command) => {
    const checker = new GoTypeChecker();
    const timeout = parseInt(options.timeout, 10) || 10000;
    // Recoger opciones adicionales y filtrar --timeout
    let extraArgs = command.parent.rawArgs.slice(command.parent.rawArgs.indexOf('check') + 2);
    extraArgs = extraArgs.filter((arg, idx, arr) => {
      if (arg === '--timeout') return false;
      if (arr[idx - 1] === '--timeout') return false;
      return true;
    });
    // Ejecutar el checker y mostrar la salida tal cual
    const args = ['check', file, ...extraArgs];
    try {
      const proc = await checker['runChecker'](args, timeout);
      // Mostrar la salida tal cual
      console.log(proc);
    } catch (err: any) {
      // Si el checker retorna exit code 1, mostrar solo la salida del checker
      if (err.stdout) {
        console.log(err.stdout);
        process.exit(1);
      } else {
        // Si es otro error, mostrar el stacktrace
        console.error(err);
        process.exit(2);
      }
    }
  });

program
  .command('check-code <code>')
  .description('Check Go code from string')
  .option('-n, --filename <filename>', 'Filename to use for error reporting', 'stdin.go')
  .option('-t, --timeout <ms>', 'Timeout in milliseconds (default: 10000)', '10000')
  .action(async (code: string, options: { filename: string, timeout: string }) => {
    const checker = new GoTypeChecker();
    const timeout = parseInt(options.timeout, 10) || 10000;
    const result = await checker.checkCode(code, { filename: options.filename, timeout });
    reportResult(result);
  });

program
  .command('check-stdin')
  .description('Check Go code from stdin')
  .option('-n, --filename <filename>', 'Filename to use for error reporting', 'stdin.go')
  .option('-t, --timeout <ms>', 'Timeout in milliseconds (default: 10000)', '10000')
  .action(async (options: { filename: string, timeout: string }) => {
    const code = readFileSync(0, 'utf-8'); // Read from stdin
    const checker = new GoTypeChecker();
    const timeout = parseInt(options.timeout, 10) || 10000;
    const result = await checker.checkCode(code, { filename: options.filename, timeout });
    reportResult(result);
  });

function reportResult(result: TypeCheckResult) {
  const allIssues = [...result.errors, ...result.warnings];

  if (allIssues.length === 0) {
    console.log('✓ No type errors found');
    return;
  }

  allIssues.forEach(issue => {
    const prefix = issue.severity === 'error' ? '✗' : '⚠';
    console.log(`${prefix} ${issue.file}:${issue.line}:${issue.column} - ${issue.message} (${issue.code})`);
  });

  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;

  if (errorCount > 0 && warningCount > 0) {
    console.log(`\nFound ${errorCount} errors and ${warningCount} warnings`);
  } else if (errorCount > 0) {
    console.log(`\nFound ${errorCount} errors`);
  } else {
    console.log(`\nFound ${warningCount} warnings`);
  }

  if (errorCount > 0) {
    process.exit(1);
  }
}

program.parse();
