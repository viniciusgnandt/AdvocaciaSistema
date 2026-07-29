'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  FileText,
  Gavel,
  Landmark,
  Link2,
  Mail,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import {
  atualizarCliente,
  baixarDocumento,
  criarCliente,
  desvincularProcessoDoCliente,
  documentosDosProcessosDoCliente,
  excluirCliente,
  listarClientes,
  listarProcessos,
  processosDoCliente,
  vincularProcessoAoCliente,
  type Cliente,
  type DocumentoProcesso,
  type NovoCliente,
  type Processo,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { ArquivosProcesso } from '@/components/processos/ArquivosProcesso';

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [documentosProcessos, setDocumentosProcessos] = useState<DocumentoProcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const dados = await listarClientes(busca || undefined);
      setClientes(dados);
      setSelecionado((atual) => (atual && dados.some((c) => c._id === atual._id) ? atual : dados[0] ?? null));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [busca]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const carregarProcessosEArquivos = useCallback(async (clienteId: string) => {
    try {
      const [proc, docs] = await Promise.all([
        processosDoCliente(clienteId),
        documentosDosProcessosDoCliente(clienteId),
      ]);
      setProcessos(proc);
      setDocumentosProcessos(docs);
    } catch {
      setProcessos([]);
      setDocumentosProcessos([]);
    }
  }, []);

  useEffect(() => {
    if (!selecionado) {
      setProcessos([]);
      setDocumentosProcessos([]);
      return;
    }
    carregarProcessosEArquivos(selecionado._id);
  }, [selecionado, carregarProcessosEArquivos]);

  const handleSalvo = async (cliente: Cliente) => {
    setModal(null);
    await carregar();
    setSelecionado(cliente);
  };

  const handleVincularProcesso = async (numeroCnj: string) => {
    if (!selecionado) return;
    try {
      await vincularProcessoAoCliente(selecionado._id, numeroCnj);
      await carregarProcessosEArquivos(selecionado._id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao vincular processo');
    }
  };

  const handleDesvincularProcesso = async (numeroCnj: string) => {
    if (!selecionado) return;
    try {
      await desvincularProcessoDoCliente(selecionado._id, numeroCnj);
      await carregarProcessosEArquivos(selecionado._id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao desvincular processo');
    }
  };

  const handleDownloadDocProcesso = async (documento: DocumentoProcesso) => {
    const { url } = await baixarDocumento(documento._id);
    window.open(url, '_blank', 'noopener');
  };

  const handleExcluir = async () => {
    if (!selecionado) return;
    if (!window.confirm(`Excluir "${selecionado.nome}"? Os processos vinculados não serão apagados.`)) return;
    try {
      await excluirCliente(selecionado._id);
      setSelecionado(null);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao excluir cliente');
    }
  };

  return (
    <>
      <Topbar titulo="Clientes" subtitulo="Cadastro de clientes, vinculado automaticamente aos processos" />

      <main className="flex-1 px-6 py-6">
        {erro && (
          <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </div>
        )}

        <div className="mb-4 flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 flex-1 min-w-[200px]">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CPF, CNPJ ou e-mail…"
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            onClick={() => setModal('novo')}
            className="shrink-0 flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition"
          >
            <Plus size={14} /> Novo cliente
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando…</p>
        ) : clientes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-16 text-center text-gray-400 text-sm">
            {busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
            <ul className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              {clientes.map((c) => (
                <li
                  key={c._id}
                  onClick={() => setSelecionado(c)}
                  className={cn(
                    'rounded-xl border p-3 cursor-pointer transition-all',
                    selecionado?._id === c._id
                      ? 'border-brand-400 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-900/10'
                      : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700',
                  )}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.nome}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {c.tipo === 'pf' ? 'Pessoa física' : 'Pessoa jurídica'}
                    {c.cpf && ` · ${c.cpf}`}
                    {c.cnpj && ` · ${c.cnpj}`}
                  </p>
                </li>
              ))}
            </ul>

            {selecionado && (
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-6">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold shrink-0">
                    {selecionado.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selecionado.nome}</p>
                    <p className="text-sm text-gray-400">{selecionado.tipo === 'pf' ? 'Pessoa física' : 'Pessoa jurídica'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setModal('editar')}
                      className="p-2 rounded-lg text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={handleExcluir}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(selecionado.cpf || selecionado.cnpj) && (
                    <InfoCard icon={UserRound} label={selecionado.cpf ? 'CPF' : 'CNPJ'} valor={selecionado.cpf ?? selecionado.cnpj} />
                  )}
                  {selecionado.email && <InfoCard icon={Mail} label="E-mail" valor={selecionado.email} />}
                  {selecionado.telefone && <InfoCard icon={Phone} label="Telefone" valor={selecionado.telefone} />}
                  {selecionado.whatsapp && <InfoCard icon={Phone} label="WhatsApp" valor={selecionado.whatsapp} />}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1">
                      <Gavel size={12} /> Processos vinculados ({processos.length})
                    </p>
                  </div>

                  <VincularProcessoBusca jaVinculados={processos.map((p) => p.numero_cnj)} onVincular={handleVincularProcesso} />

                  {processos.length === 0 ? (
                    <p className="text-sm text-gray-400 mt-3">
                      Nenhum processo vinculado ainda — isso acontece automaticamente quando o nome do cliente bate
                      com o reclamante/reclamado de um processo já enriquecido, ou manualmente pela busca acima.
                    </p>
                  ) : (
                    <ul className="space-y-2 mt-3">
                      {processos.map((p) => (
                        <li
                          key={p._id}
                          className="flex items-center gap-2.5 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 text-sm hover:border-brand-300 dark:hover:border-brand-800"
                        >
                          <Landmark size={13} className="text-gray-400 shrink-0" />
                          <div
                            onClick={() => router.push(`/processos?numero=${p.numero_cnj}`)}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <p className="text-gray-700 dark:text-gray-300 truncate">{p.classe ?? 'Classe não identificada'}</p>
                            <p className="text-xs text-gray-400 font-mono">{p.numero_cnj}</p>
                          </div>
                          <button
                            onClick={() => handleDesvincularProcesso(p.numero_cnj)}
                            className="p-1 rounded text-gray-300 hover:text-red-600 dark:hover:text-red-400 shrink-0"
                            title="Desvincular"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {documentosProcessos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1">
                      <FileText size={12} /> Arquivos dos processos vinculados ({documentosProcessos.length})
                    </p>
                    <ul className="space-y-1.5">
                      {documentosProcessos.map((d) => (
                        <li
                          key={d._id}
                          className="flex items-center gap-2.5 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 text-sm"
                        >
                          <FileText size={14} className="text-gray-400 shrink-0" />
                          <span className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-300">{d.nome}</span>
                          <button
                            onClick={() => handleDownloadDocProcesso(d)}
                            className="p-1 rounded text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 shrink-0"
                            title="Baixar"
                          >
                            <Download size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1">
                    <Paperclip size={12} /> Arquivos do cliente
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    Documentos enviados diretamente pelo cliente, antes ou independente de um processo.
                  </p>
                  <ArquivosProcesso escopo={{ clienteId: selecionado._id }} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {modal && (
        <ClienteModal
          clienteEditando={modal === 'editar' ? selecionado : null}
          onFechar={() => setModal(null)}
          onSalvo={handleSalvo}
        />
      )}
    </>
  );
}

function InfoCard({ icon: Icon, label, valor }: { icon: typeof Mail; label: string; valor?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
      <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mb-1">
        <Icon size={11} /> {label}
      </p>
      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{valor ?? '—'}</p>
    </div>
  );
}

function VincularProcessoBusca({
  jaVinculados,
  onVincular,
}: {
  jaVinculados: string[];
  onVincular: (numeroCnj: string) => void;
}) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Processo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (busca.trim().length < 3) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const timeout = setTimeout(() => {
      listarProcessos({ busca: busca.trim() })
        .then((resposta) => setResultados(resposta.itens.filter((p) => !jaVinculados.includes(p.numero_cnj))))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 px-3 py-1.5">
        <Link2 size={13} className="text-gray-400 shrink-0" />
        <input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          placeholder="Vincular processo já existente (busque por número ou nome da parte)…"
          className="bg-transparent text-sm outline-none flex-1 placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
        />
      </div>

      {aberto && busca.trim().length >= 3 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl max-h-60 overflow-y-auto">
            {buscando ? (
              <p className="text-xs text-gray-400 px-3 py-2">Buscando…</p>
            ) : resultados.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-2">Nenhum processo encontrado.</p>
            ) : (
              resultados.map((p) => (
                <button
                  key={p._id}
                  onClick={() => {
                    onVincular(p.numero_cnj);
                    setBusca('');
                    setAberto(false);
                  }}
                  className="flex flex-col items-start w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span className="text-sm text-gray-800 dark:text-gray-200">{p.classe ?? 'Classe não identificada'}</span>
                  <span className="text-xs text-gray-400 font-mono">{p.numero_cnj}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ClienteModal({
  clienteEditando,
  onFechar,
  onSalvo,
}: {
  clienteEditando: Cliente | null;
  onFechar: () => void;
  onSalvo: (c: Cliente) => void;
}) {
  const editando = !!clienteEditando;
  const [form, setForm] = useState<NovoCliente>(
    clienteEditando
      ? {
          tipo: clienteEditando.tipo,
          nome: clienteEditando.nome,
          cpf: clienteEditando.cpf,
          cnpj: clienteEditando.cnpj,
          email: clienteEditando.email,
          telefone: clienteEditando.telefone,
          whatsapp: clienteEditando.whatsapp,
        }
      : { tipo: 'pf', nome: '' },
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    if (!form.nome.trim()) {
      setErro('Informe o nome.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const cliente = editando ? await atualizarCliente(clienteEditando._id, form) : await criarCliente(form);
      onSalvo(cliente);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao salvar cliente');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{editando ? 'Editar cliente' : 'Novo cliente'}</p>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-2">
            {(['pf', 'pj'] as const).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setForm({ ...form, tipo })}
                className={cn(
                  'flex-1 text-sm py-1.5 rounded-lg border transition-colors',
                  form.tipo === tipo
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300',
                )}
              >
                {tipo === 'pf' ? 'Pessoa física' : 'Pessoa jurídica'}
              </button>
            ))}
          </div>

          <Campo label="Nome">
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              placeholder="Nome completo (deve bater com o nome no processo para vincular)"
            />
          </Campo>

          <Campo label={form.tipo === 'pf' ? 'CPF' : 'CNPJ'}>
            <input
              value={form.tipo === 'pf' ? (form.cpf ?? '') : (form.cnpj ?? '')}
              onChange={(e) =>
                setForm(form.tipo === 'pf' ? { ...form, cpf: e.target.value } : { ...form, cnpj: e.target.value })
              }
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </Campo>

          <Campo label="E-mail">
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Telefone">
              <input
                value={form.telefone ?? ''}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </Campo>
            <Campo label="WhatsApp">
              <input
                value={form.whatsapp ?? ''}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
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
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar cliente'}
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
