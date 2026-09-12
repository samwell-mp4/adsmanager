import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export interface ExtensionMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  icon?: string;
  hasManifest: boolean;
  sizeBytes: number;
  isOfficial?: boolean;
}

export class ExtensionService {
  /**
   * Unzips an extension buffer into target folder and parses manifest.json
   */
  static async extractAndInstallExtension(
    targetBaseDir: string,
    filename: string,
    zipBuffer: Buffer
  ): Promise<ExtensionMetadata> {
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    if (zipEntries.length === 0) {
      throw new Error('O arquivo .zip está vazio.');
    }

    // Find manifest.json to detect root folder inside zip
    let manifestEntry = zipEntries.find((e) => e.entryName.toLowerCase() === 'manifest.json');
    let prefix = '';

    if (!manifestEntry) {
      // Check if it's nested (e.g. "extension-folder/manifest.json")
      manifestEntry = zipEntries.find(
        (e) => e.entryName.toLowerCase().endsWith('/manifest.json')
      );
      if (manifestEntry) {
        prefix = manifestEntry.entryName.substring(0, manifestEntry.entryName.toLowerCase().lastIndexOf('/manifest.json') + 1);
      }
    }

    if (!manifestEntry) {
      throw new Error('Arquivo manifest.json não encontrado no .zip. Certifique-se de que é uma extensão válida do Chromium.');
    }

    // Parse manifest
    let manifest: any = {};
    try {
      const manifestStr = manifestEntry.getData().toString('utf8');
      manifest = JSON.parse(manifestStr);
    } catch (e: any) {
      throw new Error('Falha ao ler o manifest.json da extensão: ' + e.message);
    }

    const rawName = manifest.name || filename.replace(/\.zip$/i, '');
    const cleanId = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 40) || 'ext-' + Date.now();
    const extDir = path.join(targetBaseDir, cleanId);

    // Ensure target directory exists
    if (!fs.existsSync(extDir)) {
      fs.mkdirSync(extDir, { recursive: true, mode: 0o777 });
    }

    // Extract entries
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      
      let relativePath = entry.entryName;
      if (prefix && relativePath.startsWith(prefix)) {
        relativePath = relativePath.slice(prefix.length);
      }
      
      if (!relativePath) continue;

      const fullDest = path.join(extDir, relativePath);
      const destDir = path.dirname(fullDest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true, mode: 0o777 });
      }

      fs.writeFileSync(fullDest, entry.getData(), { mode: 0o777 });
    }

    return {
      id: cleanId,
      name: manifest.name || rawName,
      version: manifest.version || '1.0.0',
      description: manifest.description || '',
      author: manifest.author || '',
      hasManifest: true,
      sizeBytes: zipBuffer.length,
    };
  }

  /**
   * Lists all extensions in a directory
   */
  static listExtensions(baseDir: string): ExtensionMetadata[] {
    if (!fs.existsSync(baseDir)) {
      return [];
    }

    const results: ExtensionMetadata[] = [];
    const items = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        if (item.name.startsWith('__') && item.name !== '__crm_collector') continue;
        const extDir = path.join(baseDir, item.name);
        const manifestPath = path.join(extDir, 'manifest.json');
        const isOfficial = item.name === '__crm_collector';
        
        let meta: ExtensionMetadata = {
          id: item.name,
          name: isOfficial ? 'Ads Manager CRM Collector (Oficial)' : item.name,
          version: '1.2.1',
          description: isOfficial ? 'Sincronizador automático de mensagens do Facebook Marketplace e OLX' : '',
          hasManifest: false,
          sizeBytes: 0,
          isOfficial,
        };

        if (fs.existsSync(manifestPath)) {
          try {
            const raw = fs.readFileSync(manifestPath, 'utf8');
            const parsed = JSON.parse(raw);
            meta.name = isOfficial ? 'Ads Manager CRM Collector (Oficial)' : (parsed.name || item.name);
            meta.version = parsed.version || '1.2.1';
            meta.description = parsed.description || meta.description;
            meta.author = parsed.author || '';
            meta.hasManifest = true;
          } catch {
            // invalid json, keep default
          }
        }

        results.push(meta);
      }
    }

    return results;
  }

  /**
   * Deletes an extension directory
   */
  static deleteExtension(baseDir: string, extId: string): boolean {
    const extDir = path.join(baseDir, extId);
    if (fs.existsSync(extDir)) {
      fs.rmSync(extDir, { recursive: true, force: true });
      return true;
    }
    return false;
  }
}
