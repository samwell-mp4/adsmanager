import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

export interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  size: number;
  lastModified: Date;
  path: string; // relative to root
}

export class FileSystemService {
  private readonly rootDir: string;

  constructor() {
    this.rootDir = path.resolve(config.profilesDataDir);
    // Garantir que a raiz existe
    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true, mode: 0o777 });
    }
  }

  /**
   * Resolve e valida o caminho absoluto garantindo que está dentro do rootDir
   */
  private getAbsolutePath(relativePath: string): string {
    const cleanPath = relativePath.replace(/^(\/|\\)+/, ''); // Remove barras iniciais
    const absolute = path.resolve(this.rootDir, cleanPath);
    if (!absolute.startsWith(this.rootDir)) {
      throw new Error('Acesso negado: Tentativa de sair do diretório raiz.');
    }
    return absolute;
  }

  public listDirectory(relativePath: string): FileInfo[] {
    const dirPath = this.getAbsolutePath(relativePath);
    if (!fs.existsSync(dirPath)) {
      throw new Error('Diretório não encontrado.');
    }

    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      throw new Error('O caminho especificado não é um diretório.');
    }

    const items = fs.readdirSync(dirPath);
    return items.map(item => {
      const fullPath = path.join(dirPath, item);
      const itemStat = fs.statSync(fullPath);
      return {
        name: item,
        type: (itemStat.isDirectory() ? 'directory' : 'file') as 'directory' | 'file',
        size: itemStat.size,
        lastModified: itemStat.mtime,
        // Calculate relative path for frontend usage
        path: path.relative(this.rootDir, fullPath).replace(/\\/g, '/'),
      };
    }).sort((a, b) => {
      // Pastas primeiro
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  }

  public readFile(relativePath: string): string {
    const filePath = this.getAbsolutePath(relativePath);
    if (!fs.existsSync(filePath)) {
      throw new Error('Arquivo não encontrado.');
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  public writeFile(relativePath: string, content: string): void {
    const filePath = this.getAbsolutePath(relativePath);
    // Garante que a pasta pai exista
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  public uploadFile(relativePath: string, base64Data: string): void {
    const filePath = this.getAbsolutePath(relativePath);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
    }
    const buffer = Buffer.from(base64Data.replace(/^data:.*?;base64,/, ''), 'base64');
    fs.writeFileSync(filePath, buffer);
  }

  public deleteItem(relativePath: string): void {
    const targetPath = this.getAbsolutePath(relativePath);
    if (!fs.existsSync(targetPath)) {
      throw new Error('Item não encontrado.');
    }
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
  }

  public createDirectory(relativePath: string): void {
    const targetPath = this.getAbsolutePath(relativePath);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true, mode: 0o777 });
    }
  }
}

export const fsService = new FileSystemService();
