import React, { useState, useEffect } from 'react';
import { X, Cookie, Download, Upload, Trash2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';

interface CookieModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
  profileName: string;
}

export const CookieModal: React.FC<CookieModalProps> = ({ isOpen, onClose, profileId, profileName }) => {
  const [cookies, setCookies] = useState<any[]>([]);
  const [jsonInput, setJsonInput] = useState('');
  const [mode, setMode] = useState<'view' | 'import'>('view');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCookies = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const data = await api.getCookies(profileId);
      setCookies(data || []);
      setJsonInput(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Erro ao buscar cookies: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCookies();
      setMode('view');
    }
  }, [isOpen, profileId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(cookies, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveImport = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      if (!jsonInput.trim()) {
        throw new Error('Por favor, cole os cookies antes de salvar.');
      }

      let payload: any = jsonInput.trim();
      try {
        payload = JSON.parse(payload);
      } catch {
        // Keep as string: backend normalizer handles string headers and Netscape formats!
      }

      const res = await api.setCookies(profileId, payload);
      setFeedback({
        type: 'success',
        message: `${res.count} cookies aplicados com sucesso! Se o Facebook estiver aberto no navegador, a página será atualizada com a sessão ativa.`,
      });
      await fetchCookies();
      setMode('view');
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Tem certeza que deseja apagar todos os cookies deste perfil?')) return;
    setLoading(true);
    try {
      await api.clearCookies(profileId);
      setCookies([]);
      setJsonInput('');
      setFeedback({ type: 'success', message: 'Cookies removidos com sucesso.' });
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Cookie className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gerenciar Cookies da Sessão</h2>
              <p className="text-xs text-slate-400">
                Perfil: <span className="text-blue-400 font-semibold">{profileName}</span> ({cookies.length} cookies armazenados)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 pt-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-900">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('view')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
                mode === 'view'
                  ? 'text-blue-400 border-blue-500 bg-slate-800/40'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              Lista ({cookies.length})
            </button>
            <button
              onClick={() => setMode('import')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
                mode === 'import'
                  ? 'text-blue-400 border-blue-500 bg-slate-800/40'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              Colar / Importar JSON
            </button>
          </div>

          <div className="flex items-center gap-2 pb-1.5">
            <button
              onClick={fetchCookies}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Atualizar"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {cookies.length > 0 && (
              <>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                  title="Copiar cookies no formato JSON"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Download className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado!' : 'Exportar'}
                </button>
                <button
                  onClick={handleClear}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition"
                  title="Apagar todos os cookies"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {mode === 'view' ? (
            cookies.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Cookie className="h-10 w-10 text-slate-600 mx-auto" />
                <div className="text-sm text-slate-300 font-medium">Nenhum cookie salvo neste perfil</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Você pode colar cookies extraídos do Facebook, Google ou qualquer site para já entrar conectado automaticamente.
                </p>
                <button
                  onClick={() => setMode('import')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Colar Cookies JSON
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 mb-2">
                  Estes cookies persistem no volume do perfil e são carregados no Chromium:
                </div>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2">Domínio</th>
                        <th className="px-3 py-2">Nome</th>
                        <th className="px-3 py-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {cookies.slice(0, 100).map((c, i) => (
                        <tr key={i} className="hover:bg-slate-800/40 transition">
                          <td className="px-3 py-2 text-blue-400 truncate max-w-[150px]">{c.domain}</td>
                          <td className="px-3 py-2 text-slate-300 truncate max-w-[150px]">{c.name}</td>
                          <td className="px-3 py-2 text-slate-500 truncate max-w-[200px]">{c.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {cookies.length > 100 && (
                  <div className="text-center text-[11px] text-slate-500 pt-1">
                    Exibindo os primeiros 100 de {cookies.length} cookies.
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Cole os cookies (JSON, formato chave=valor ou Netscape):
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Cookie-Editor / J2Team / c_user=...</span>
              </div>

              {jsonInput.includes('c_user') && jsonInput.includes('xs') && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Sessão do Facebook identificada com sucesso (tokens <b>c_user</b> e <b>xs</b> presentes)!</span>
                </div>
              )}

              {jsonInput.includes('c_user') && !jsonInput.includes('xs') && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Atenção: Cookie <b>c_user</b> encontrado, mas <b>xs</b> está ausente. O Facebook precisa de ambos para login direto.</span>
                </div>
              )}

              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='Cole aqui seu JSON exportado do Cookie-Editor ou EditThisCookie:
[
  {
    "domain": ".facebook.com",
    "name": "c_user",
    "value": "100012345678",
    "path": "/"
  },
  {
    "domain": ".facebook.com",
    "name": "xs",
    "value": "2%3Aabc...",
    "path": "/"
  }
]

Ou formato direto de texto:
c_user=100012345678; xs=2%3Aabc...; datr=xyz;'
                rows={12}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 transition resize-none"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setMode('view')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveImport}
                  disabled={saving || !jsonInput.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-600/25 transition"
                >
                  {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {saving ? 'Aplicando...' : 'Salvar e Injetar Cookies'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
