'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, UserRound, X } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import {
  atualizarUsuario,
  convidarUsuario,
  listarUsuarios,
  removerUsuario,
  type PerfilUsuario,
  type Usuario,
} from '@/lib/api';
import { cn } from '@/lib/cn';

const LABEL_PERFIL: Record<PerfilUsuario, string> = { admin: 'Admin', advogado: 'Advogado(a)', assistente: 'Assistente' };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setUsuarios(await listarUsuarios());
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handlePerfil = async (id: string, perfil: PerfilUsuario) => {
    setUsuarios((atual) => atual.map((u) => (u._id === id ? { ...u, perfil } : u)));
    try {
      await atualizarUsuario(id, { perfil });
    } catch {
      carregar();
    }
  };

  const handleRemover = async (usuario: Usuario) => {
    if (!window.confirm(`Desativar "${usuario.nome}"? Ele não conseguirá mais entrar no sistema.`)) return;
    try {
      await removerUsuario(usuario._id);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao desativar usuário');
    }
  };

  return (
    <>
      <Topbar titulo="Equipe" subtitulo="Usuários com acesso ao escritório" />

      <main className="flex-1 px-6 py-6">
        {erro && (
          <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </div>
        )}

        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition"
          >
            <Plus size={14} /> Convidar usuário
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando…</p>
        ) : (
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Perfil</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u._id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {u.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-gray-800 dark:text-gray-200">{u.nome}</p>
                        {u.oab && <p className="text-xs text-gray-400">OAB {u.oab}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.perfil}
                        onChange={(e) => handlePerfil(u._id, e.target.value as PerfilUsuario)}
                        className="text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1 text-gray-700 dark:text-gray-300"
                      >
                        {Object.entries(LABEL_PERFIL).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                          u.status === 'ativo'
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
                        )}
                      >
                        {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.status === 'ativo' && (
                        <button
                          onClick={() => handleRemover(u)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                          title="Desativar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modalAberto && (
        <ConvidarModal
          onFechar={() => setModalAberto(false)}
          onConvidado={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
    </>
  );
}

function ConvidarModal({ onFechar, onConvidado }: { onFechar: () => void; onConvidado: () => void }) {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'advogado' as PerfilUsuario, oab: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await convidarUsuario(form);
      onConvidado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao convidar usuário');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <UserRound size={15} /> Convidar usuário
          </p>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Campo label="Nome">
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </Campo>
          <Campo label="E-mail">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </Campo>
          <Campo label="Senha provisória (mín. 8 caracteres)">
            <input
              type="password"
              minLength={8}
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Perfil">
              <select
                value={form.perfil}
                onChange={(e) => setForm({ ...form, perfil: e.target.value as PerfilUsuario })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              >
                <option value="admin">Admin</option>
                <option value="advogado">Advogado(a)</option>
                <option value="assistente">Assistente</option>
              </select>
            </Campo>
            <Campo label="OAB (opcional)">
              <input
                value={form.oab}
                onChange={(e) => setForm({ ...form, oab: e.target.value })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </Campo>
          </div>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Convidar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
