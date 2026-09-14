import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { 
  Folder, File, FileText, FileCode, FileJson, 
  ChevronRight, Upload, Trash2, Edit3, Save, 
  RefreshCw, FolderPlus, ArrowLeft, Loader2
} from 'lucide-react';

export const FileManagerPage: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Editor State
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDirectory(currentPath);
  }, [currentPath]);

  const fetchDirectory = async (path: string) => {
    setLoading(true);
    try {
      const res = await api.fsListDirectory(path);
      if (res.success) {
        setItems(res.data);
      } else {
        alert('Erro ao carregar diretório: ' + res.error);
      }
    } catch (err: any) {
      alert('Erro de conexão ao carregar diretório.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (folderName: string) => {
    setCurrentPath(prev => prev ? `${prev}/${folderName}` : folderName);
  };

  const handleNavigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const handleNavigateBreadcrumb = (index: number) => {
    const parts = currentPath.split('/');
    setCurrentPath(parts.slice(0, index + 1).join('/'));
  };

  const handleDelete = async (itemPath: string, type: string) => {
    if (!confirm(`Tem certeza que deseja excluir este ${type === 'directory' ? 'diretório e todo seu conteúdo' : 'arquivo'}?`)) return;
    try {
      const res = await api.fsDeleteItem(itemPath);
      if (res.success) {
        fetchDirectory(currentPath);
      } else {
        alert('Erro ao excluir: ' + res.error);
      }
    } catch (e) {
      alert('Erro de conexão ao excluir.');
    }
  };

  const handleCreateDirectory = async () => {
    const name = prompt('Nome da nova pasta:');
    if (!name) return;
    const newPath = currentPath ? `${currentPath}/${name}` : name;
    try {
      const res = await api.fsCreateDirectory(newPath);
      if (res.success) {
        fetchDirectory(currentPath);
      } else {
        alert('Erro ao criar pasta: ' + res.error);
      }
    } catch (e) {
      alert('Erro de conexão.');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const targetPath = currentPath ? `${currentPath}/${file.name}` : file.name;
      try {
        const res = await api.fsUploadFile(targetPath, base64);
        if (res.success) {
          fetchDirectory(currentPath);
        } else {
          alert('Erro no upload: ' + res.error);
        }
      } catch (err) {
        alert('Erro de conexão durante o upload.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditFile = async (filePath: string) => {
    try {
      setLoading(true);
      const res = await api.fsReadFile(filePath);
      if (res.success) {
        setEditingFile(filePath);
        setFileContent(res.data);
      } else {
        alert('Erro ao ler arquivo (pode não ser um arquivo de texto válido): ' + res.error);
      }
    } catch (e) {
      alert('Erro de conexão ao ler arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    setSaving(true);
    try {
      const res = await api.fsWriteFile(editingFile, fileContent);
      if (res.success) {
        alert('Arquivo salvo com sucesso!');
        setEditingFile(null);
      } else {
        alert('Erro ao salvar: ' + res.error);
      }
    } catch (e) {
      alert('Erro de conexão ao salvar arquivo.');
    } finally {
      setSaving(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith('.js') || name.endsWith('.ts')) return <FileCode className="h-5 w-5 text-yellow-500" />;
    if (name.endsWith('.json')) return <FileJson className="h-5 w-5 text-green-500" />;
    if (name.endsWith('.txt') || name.endsWith('.md')) return <FileText className="h-5 w-5 text-slate-500" />;
    return <File className="h-5 w-5 text-slate-400" />;
  };

  const isEditable = (name: string) => {
    const exts = ['.js', '.ts', '.json', '.txt', '.md', '.html', '.css', '.env', '.csv'];
    return exts.some(ext => name.toLowerCase().endsWith(ext));
  };

  // Se estiver no modo de edição
  if (editingFile) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setEditingFile(null)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"
              title="Voltar sem salvar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-blue-500" /> 
                Editando: {editingFile.split('/').pop()}
              </h2>
              <p className="text-xs text-slate-500">{editingFile}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setEditingFile(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveFile}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center gap-2 shadow-sm disabled:opacity-70"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Alterações
            </button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-hidden">
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            className="w-full h-full bg-slate-900 text-emerald-400 font-mono text-sm p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-inner"
            spellCheck="false"
          />
        </div>
      </div>
    );
  }

  // Explorador normal
  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header and Toolbar */}
      <div className="bg-white border-b border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Gerenciador de Arquivos (FTP)</h1>
            <p className="text-sm text-slate-500">Navegue e edite as pastas de dados locais do servidor</p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleUpload}
            />
            <button 
              onClick={() => fetchDirectory(currentPath)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
              title="Recarregar pasta"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button 
              onClick={handleCreateDirectory}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg transition flex items-center gap-2 border border-indigo-200"
            >
              <FolderPlus className="h-4 w-4" /> Nova Pasta
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center gap-2 shadow-sm disabled:opacity-70"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload Arquivo
            </button>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
          <button 
            onClick={() => setCurrentPath('')}
            className={`font-semibold hover:text-blue-600 transition ${!currentPath ? 'text-blue-600' : 'text-slate-600'}`}
          >
            /raiz
          </button>
          {currentPath.split('/').filter(Boolean).map((part, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <button 
                onClick={() => handleNavigateBreadcrumb(idx)}
                className={`font-semibold hover:text-blue-600 transition ${idx === currentPath.split('/').filter(Boolean).length - 1 ? 'text-blue-600' : 'text-slate-600'}`}
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4 w-32">Tamanho</th>
                  <th className="px-6 py-4 w-48">Modificado em</th>
                  <th className="px-6 py-4 w-32 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentPath && (
                  <tr 
                    className="hover:bg-blue-50/50 cursor-pointer transition group"
                    onClick={handleNavigateUp}
                  >
                    <td className="px-6 py-3 flex items-center gap-3">
                      <Folder className="h-5 w-5 text-blue-400 group-hover:text-blue-600" />
                      <span className="font-semibold text-slate-700">.. (Subir diretório)</span>
                    </td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                )}
                
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                      Esta pasta está vazia.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-slate-50 transition ${item.type === 'directory' ? 'cursor-pointer' : ''}`}
                      onClick={() => item.type === 'directory' && handleNavigate(item.name)}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          {item.type === 'directory' ? (
                            <Folder className="h-5 w-5 text-blue-500 fill-blue-100" />
                          ) : (
                            getFileIcon(item.name)
                          )}
                          <span className={`font-semibold ${item.type === 'directory' ? 'text-slate-800' : 'text-slate-600'}`}>
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {item.type === 'directory' ? '-' : formatSize(item.size)}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {new Date(item.lastModified).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          {item.type === 'file' && isEditable(item.name) && (
                            <button
                              onClick={() => handleEditFile(item.path)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition"
                              title="Editar código"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item.path, item.type)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
