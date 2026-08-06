'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Plus, Shield, Trash2, UserRound, Users as UsersIcon, X } from 'lucide-react';
import {
  atualizarGrupo,
  atualizarTime,
  atualizarUsuario,
  CATALOGO_PERMISSOES,
  convidarUsuario,
  criarGrupo,
  criarTime,
  excluirGrupo,
  excluirTime,
  LABEL_PERMISSAO,
  listarGrupos,
  listarTarefas,
  listarTimes,
  listarUsuarios,
  removerUsuario,
  type Grupo,
  type PerfilUsuario,
  type PermissaoChave,
  type Tarefa,
  type TimeTrabalho,
  type Usuario,
} from '@/lib/api';
import { cn } from '@/lib/cn';

const LABEL_PERFIL: Record<PerfilUsuario, string> = { admin: 'Admin', advogado: 'Advogado(a)', assistente: 'Assistente' };

type SubAba = 'usuarios' | 'grupos' | 'times';

export function EquipeAba() {
  const [subAba, setSubAba] = useState<SubAba>('usuarios');

  return (
    <div>
      <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-800 p-0.5 w-fit mb-4">
        {([
          { id: 'usuarios', label: 'Usuários', icon: UserRound },
          { id: 'grupos', label: 'Grupos', icon: Shield },
          { id: 'times', label: 'Times', icon: UsersIcon },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubAba(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              subAba === id ? 'bg-brand-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
            )}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {subAba === 'usuarios' && <UsuariosLista />}
      {subAba === 'grupos' && <GruposLista />}
      {subAba === 'times' && <TimesLista />}
    </div>
  );
}

function UsuariosLista() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [times, setTimes] = useState<TimeTrabalho[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [u, g, t, tf] = await Promise.all([listarUsuarios(), listarGrupos(), listarTimes(), listarTarefas()]);
      setUsuarios(u);
      setGrupos(g);
      setTimes(t);
      setTarefas(tf);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  }, []);

  const cargaTrabalho = (usuarioId: string) =>
    tarefas.filter((t) => t.responsavel_id === usuarioId && t.status !== 'concluida').length;

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

  const handleGrupo = async (id: string, grupoId: string) => {
    setUsuarios((atual) => atual.map((u) => (u._id === id ? { ...u, grupo_id: grupoId || undefined } : u)));
    try {
      await atualizarUsuario(id, { grupo_id: grupoId || null });
    } catch {
      carregar();
    }
  };

  const handleTime = async (id: string, timeId: string) => {
    setUsuarios((atual) => atual.map((u) => (u._id === id ? { ...u, time_id: timeId || undefined } : u)));
    try {
      await atualizarUsuario(id, { time_id: timeId || null });
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Usuários</p>
          <p className="text-xs text-gray-400">Perfil controla o básico; grupo dá permissões extras; time é só organizacional</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition"
        >
          <Plus size={14} /> Convidar usuário
        </button>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {erro}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando…</p>
      ) : (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium">Grupo</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Carga</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u._id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.foto_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-gray-800 dark:text-gray-200 truncate">{u.nome}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        {u.especialidades && u.especialidades.length > 0 && (
                          <p className="text-xs text-gray-400 truncate">{u.especialidades.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </td>
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
                    <select
                      value={u.grupo_id ?? ''}
                      onChange={(e) => handleGrupo(u._id, e.target.value)}
                      className="text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1 text-gray-700 dark:text-gray-300"
                    >
                      <option value="">— nenhum —</option>
                      {grupos.map((g) => (
                        <option key={g._id} value={g._id}>
                          {g.nome}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.time_id ?? ''}
                      onChange={(e) => handleTime(u._id, e.target.value)}
                      className="text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1 text-gray-700 dark:text-gray-300"
                    >
                      <option value="">— nenhum —</option>
                      {times.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.nome}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {cargaTrabalho(u._id)} {cargaTrabalho(u._id) === 1 ? 'tarefa' : 'tarefas'}
                    </span>
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

      {modalAberto && (
        <ConvidarModal
          onFechar={() => setModalAberto(false)}
          onConvidado={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
    </div>
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

function GruposLista() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Grupo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setGrupos(await listarGrupos());
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const remover = async (g: Grupo) => {
    if (!window.confirm(`Excluir o grupo "${g.nome}"? Usuários vinculados perdem essas permissões extras.`)) return;
    try {
      await excluirGrupo(g._id);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao excluir grupo');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Grupos de permissão</p>
          <p className="text-xs text-gray-400">Dão poderes extras a advogados/assistentes — admin já tem tudo por padrão</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition"
        >
          <Plus size={14} /> Novo grupo
        </button>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {erro}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Carregando…</p>
      ) : grupos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-400">
          Nenhum grupo criado ainda.
        </div>
      ) : (
        <ul className="space-y-2">
          {grupos.map((g) => (
            <li
              key={g._id}
              className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 cursor-pointer hover:border-brand-300 dark:hover:border-brand-800"
              onClick={() => setEditando(g)}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Shield size={14} className="text-brand-500" /> {g.nome}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remover(g);
                  }}
                  className="p-1 rounded text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {g.permissoes.length === 0 ? (
                  <span className="text-xs text-gray-400">Nenhuma permissão concedida</span>
                ) : (
                  g.permissoes.map((p) => (
                    <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {LABEL_PERMISSAO[p]}
                    </span>
                  ))
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalAberto && (
        <GrupoModal
          onFechar={() => setModalAberto(false)}
          onSalvo={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
      {editando && (
        <GrupoModal
          grupo={editando}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function GrupoModal({ grupo, onFechar, onSalvo }: { grupo?: Grupo; onFechar: () => void; onSalvo: () => void }) {
  const editando = !!grupo;
  const [nome, setNome] = useState(grupo?.nome ?? '');
  const [permissoes, setPermissoes] = useState<PermissaoChave[]>(grupo?.permissoes ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const alternar = (chave: PermissaoChave) => {
    setPermissoes((atual) => (atual.includes(chave) ? atual.filter((p) => p !== chave) : [...atual, chave]));
  };

  const salvar = async () => {
    if (!nome.trim()) {
      setErro('Informe um nome pro grupo.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      if (editando) await atualizarGrupo(grupo._id, { nome, permissoes });
      else await criarGrupo({ nome, permissoes });
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao salvar grupo');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div onClick={onFechar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{editando ? 'Editar grupo' : 'Novo grupo'}</p>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nome do grupo</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Sócios, Financeiro"
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Permissões</span>
            <div className="space-y-1.5">
              {CATALOGO_PERMISSOES.map((chave) => (
                <label
                  key={chave}
                  className="flex items-center gap-2.5 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={permissoes.includes(chave)}
                    onChange={() => alternar(chave)}
                    className="rounded border-gray-300 dark:border-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{LABEL_PERMISSAO[chave]}</span>
                </label>
              ))}
            </div>
          </div>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar grupo'}
          </button>
        </div>
      </div>
    </div>
  );
}

const CORES_TIME = ['#4f46e5', '#0891b2', '#16a34a', '#ca8a04', '#dc2626', '#c026d3'];

function TimesLista() {
  const [times, setTimes] = useState<TimeTrabalho[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<TimeTrabalho | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([listarTimes(), listarUsuarios()]);
      setTimes(t);
      setUsuarios(u);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar times');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const nomeUsuario = (id: string) => usuarios.find((u) => u._id === id)?.nome ?? '—';

  const remover = async (t: TimeTrabalho) => {
    if (!window.confirm(`Excluir o time "${t.nome}"?`)) return;
    try {
      await excluirTime(t._id);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao excluir time');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Times de trabalho</p>
          <p className="text-xs text-gray-400">Organiza pessoas por equipe/setor — não afeta permissão</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition"
        >
          <Plus size={14} /> Novo time
        </button>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {erro}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Carregando…</p>
      ) : times.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-400">
          Nenhum time criado ainda.
        </div>
      ) : (
        <ul className="space-y-2">
          {times.map((t) => (
            <li
              key={t._id}
              onClick={() => setEditando(t)}
              className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 cursor-pointer hover:border-brand-300 dark:hover:border-brand-800"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.cor ?? '#4f46e5' }} />
                  {t.nome}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remover(t);
                  }}
                  className="p-1 rounded text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {t.membros.length === 0 ? 'Nenhum membro' : t.membros.map(nomeUsuario).join(', ')}
              </p>
            </li>
          ))}
        </ul>
      )}

      {modalAberto && (
        <TimeModal
          usuarios={usuarios}
          onFechar={() => setModalAberto(false)}
          onSalvo={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
      {editando && (
        <TimeModal
          time={editando}
          usuarios={usuarios}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function TimeModal({
  time,
  usuarios,
  onFechar,
  onSalvo,
}: {
  time?: TimeTrabalho;
  usuarios: Usuario[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const editando = !!time;
  const [nome, setNome] = useState(time?.nome ?? '');
  const [cor, setCor] = useState(time?.cor ?? CORES_TIME[0]);
  const [membros, setMembros] = useState<string[]>(time?.membros ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const alternarMembro = (id: string) => {
    setMembros((atual) => (atual.includes(id) ? atual.filter((m) => m !== id) : [...atual, id]));
  };

  const salvar = async () => {
    if (!nome.trim()) {
      setErro('Informe um nome pro time.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      if (editando) await atualizarTime(time._id, { nome, cor, membros });
      else await criarTime({ nome, cor, membros });
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao salvar time');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div onClick={onFechar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{editando ? 'Editar time' : 'Novo time'}</p>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nome do time</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Time Cível, Time Trabalhista"
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Cor</span>
            <div className="flex gap-2">
              {CORES_TIME.map((c) => (
                <button
                  key={c}
                  onClick={() => setCor(c)}
                  className={cn('w-6 h-6 rounded-full transition-transform', cor === c && 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-110')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Membros</span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {usuarios.map((u) => (
                <label
                  key={u._id}
                  className="flex items-center gap-2.5 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={membros.includes(u._id)}
                    onChange={() => alternarMembro(u._id)}
                    className="rounded border-gray-300 dark:border-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{u.nome}</span>
                </label>
              ))}
            </div>
          </div>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <div className="flex items-center gap-2">
            {editando && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Check size={12} /> {membros.length} membro(s)
              </span>
            )}
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex-1 rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar time'}
            </button>
          </div>
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
