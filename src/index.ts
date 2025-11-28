import { execa } from 'execa';
import fs from 'fs';
import path from 'path';

export interface TypeError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface TypeCheckResult {
  errors: TypeError[];
  warnings: TypeError[];
}

export interface TypeCheckOptions {
  filename?: string;
  format?: 'json' | 'text' | 'toon';
  timeout?: number;
  binPath?: string;
}

export class GoTypeChecker {
  private binPath: string;

  constructor(binPath?: string) {
    // Detectar si estamos en Windows y usar tscheck.exe
    const defaultBin = process.platform === 'win32'
      ? path.resolve(process.cwd(), 'tscheck.exe')
      : path.resolve(process.cwd(), 'tscheck');
    this.binPath = binPath || defaultBin;
  }

  async checkFile(filePath: string, options: TypeCheckOptions = {}): Promise<TypeCheckResult> {
    const format = options.format || 'json';
    const args = ['check', filePath, '-f', format];
    const result = await this.runChecker(args, options.timeout);
    return this.parseResult(result, format);
  }

  async checkCode(code: string, options: TypeCheckOptions = {}): Promise<TypeCheckResult> {
    const format = options.format || 'json';
    const filename = options.filename || 'stdin.ts';
    // Se requiere al menos un argumento de archivo, así que usamos filename como dummy
    const args = ['check', filename, '--code', code, '--filename', filename, '-f', format];
    const result = await this.runChecker(args, options.timeout);
    return this.parseResult(result, format);
  }

  private async runChecker(args: string[], timeout?: number): Promise<string> {
    if (!fs.existsSync(this.binPath)) {
      throw new Error(`Typechecker Go binary not found at: ${this.binPath}`);
    }
    const proc = await execa(this.binPath, args, {
      timeout: timeout || 10000,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    });
    return proc.stdout;
  }

  private parseResult(output: string, format: string): TypeCheckResult {
    if (format === 'json') {
      try {
        const arr = JSON.parse(output);
        const errors = arr.filter((e: any) => e.severity === 'error');
        const warnings = arr.filter((e: any) => e.severity === 'warning');
        return { errors, warnings };
      } catch {
        return { errors: [], warnings: [] };
      }
    }
    // Para otros formatos, solo parsea texto simple
    return { errors: [], warnings: [] };
  }
}

export default GoTypeChecker;
