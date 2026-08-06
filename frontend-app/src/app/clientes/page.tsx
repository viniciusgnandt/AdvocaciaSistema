'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileSignature,
  FileText,
  Gavel,
  Globe,
  Landmark,
  Link2,
  Mail,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import {
  ativarPortalCliente,
  atualizarCliente,
  baixarDocumento,
  criarCliente,
  desativarPortalCliente,
  desvincularProcessoDoCliente,
  documentosDosProcessosDoCliente,
  excluirCliente,
  listarClientes,
  listarProcessos,
  processosDoCliente,
  verificarConflitosCliente,
  verificarDuplicidadeCliente,
  vincularProcessoAoCliente,
  type Cliente,
  type ClienteDuplicado,
  type DocumentoProcesso,
  type NovoCliente,
  type Processo,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { ArquivosProcesso } from '@/components/processos/ArquivosProcesso';
import HistoricoAmigavel from '@/components/common/HistoricoAmigavel';
import { GerarProcuracaoModal } from '@/components/clientes/GerarProcuracaoModal';
import { OnboardingClienteModal } from '@/components/clientes/OnboardingClienteModal';
import { validarCpf, validarCnpj } from '@/lib/documento';
import { BotaoFavorito } from '@/components/common/BotaoFavorito';
import { useFavoritos } from '@/lib/useFavoritos';

const LABEL_ESTADO_CIVIL: Record<string, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
  uniao_estavel: 'União estável',
};

function enderecoFormatado(endereco?: Cliente['endereco']): string | undefined {
  if (!endereco) return undefined;
  const linha1 = [endereco.logradouro, endereco.numero].filter(Boolean).join(', ');
  const linha2 = [endereco.bairro, endereco.cidade && endereco.uf ? `${endereco.cidade}/${endereco.uf}` : endereco.cidade]
    .filter(Boolean)
    .join(' — ');
  const texto = [linha1, linha2].filter(Boolean).join(' · ');
  return texto || undefined;
}

export default function ClientesPage() {
  return (
    <Suspense fallback={null}>
      <ClientesPageConteudo />
    </Suspense>
  );
}

function ClientesPageConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idBuscado = searchParams.get('id');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [documentosProcessos, setDocumentosProcessos] = useState<DocumentoProcesso[]>([]);
  const [conflitos, setConflitos] = useState<{ numeroCnj: string; clienteConflitante: { id: string; nome: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [somenteFavoritos, setSomenteFavoritos] = useState(false);
  const { ehFavorito, alternar } = useFavoritos();
  const [modalProcuracao, setModalProcuracao] = useState(false);
  const [modalOnboarding, setModalOnboarding] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const dados = await listarClientes(busca || undefined);
      setClientes(dados);
      const alvo = idBuscado ? dados.find((c) => c._id === idBuscado) : undefined;
      setSelecionado((atual) => alvo ?? (atual && dados.some((c) => c._id === atual._id) ? atual : dados[0] ?? null));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [busca, idBuscado]);

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
      setConflitos([]);
      return;
    }
    carregarProcessosEArquivos(selecionado._id);
    verificarConflitosCliente(selecionado._id)
      .then(setConflitos)
      .catch(() => setConflitos([]));
  }, [selecionado, carregarProcessosEArquivos]);

  const handleSalvo = async (cliente: Cliente) => {
    const eraNovo = modal === 'novo';
    setModal(null);
    await carregar();
    setSelecionado(cliente);
    if (eraNovo) setModalOnboarding(true);
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
          {clientes.length > 0 && (
            <button
              onClick={() => setSomenteFavoritos((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border shrink-0',
                somenteFavoritos
                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                  : 'border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700',
              )}
            >
              <Star size={12} fill={somenteFavoritos ? 'currentColor' : 'none'} />
              Favoritos
            </button>
          )}
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
              {[...clientes]
                .filter((c) => !somenteFavoritos || ehFavorito('cliente', c._id))
                .sort((a, b) => Number(ehFavorito('cliente', b._id)) - Number(ehFavorito('cliente', a._id)))
                .map((c) => (
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
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                    <span className="truncate flex-1">{c.nome}</span>
                    <BotaoFavorito favorito={ehFavorito('cliente', c._id)} onClick={() => alternar('cliente', c._id)} />
                  </p>
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
                {conflitos.length > 0 && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 space-y-1.5">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Possível conflito de interesses
                    </p>
                    {conflitos.map((c) => (
                      <p key={c.numeroCnj} className="text-xs text-red-600 dark:text-red-400">
                        <span className="font-medium">{c.clienteConflitante.nome}</span> também é cliente deste escritório e
                        aparece como parte contrária no processo <span className="font-mono">{c.numeroCnj}</span>.
                      </p>
                    ))}
                  </div>
                )}

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
                  {selecionado.profissao && <InfoCard icon={UserRound} label="Profissão" valor={selecionado.profissao} />}
                  {selecionado.estado_civil && (
                    <InfoCard icon={UserRound} label="Estado civil" valor={LABEL_ESTADO_CIVIL[selecionado.estado_civil]} />
                  )}
                  {selecionado.razao_social && <InfoCard icon={Landmark} label="Razão social" valor={selecionado.razao_social} />}
                  {selecionado.nome_fantasia && <InfoCard icon={Landmark} label="Nome fantasia" valor={selecionado.nome_fantasia} />}
                  {selecionado.origem_lead && <InfoCard icon={Link2} label="Origem" valor={selecionado.origem_lead} />}
                  {enderecoFormatado(selecionado.endereco) && (
                    <InfoCard icon={Landmark} label="Endereço" valor={enderecoFormatado(selecionado.endereco)} />
                  )}
                </div>

                {selecionado.observacoes && (
                  <div className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Observações</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selecionado.observacoes}</p>
                  </div>
                )}

                <PortalCliente
                  id="secao-portal-cliente"
                  cliente={selecionado}
                  onAtualizado={(c) => {
                    setSelecionado(c);
                    setClientes((atual) => atual.map((x) => (x._id === c._id ? c : x)));
                  }}
                />

                <button
                  onClick={() => setModalProcuracao(true)}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 w-fit"
                >
                  <FileSignature size={14} /> Gerar procuração
                </button>

                <div id="secao-processos-vinculados">
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

                <div id="secao-arquivos-cliente">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1">
                    <Paperclip size={12} /> Arquivos do cliente
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    Documentos enviados diretamente pelo cliente, antes ou independente de um processo.
                  </p>
                  <ArquivosProcesso escopo={{ clienteId: selecionado._id }} />
                </div>

                <div className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                  <HistoricoAmigavel entidade="cliente" entidadeId={selecionado._id} />
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

      {modalOnboarding && selecionado && (
        <OnboardingClienteModal
          cliente={selecionado}
          onFechar={() => setModalOnboarding(false)}
          onGerarProcuracao={() => setModalProcuracao(true)}
        />
      )}

      {modalProcuracao && selecionado && (
        <GerarProcuracaoModal
          cliente={selecionado}
          processosVinculados={processos.map((p) => ({ numero_cnj: p.numero_cnj }))}
          onFechar={() => setModalProcuracao(false)}
        />
      )}
    </>
  );
}

function PortalCliente({
  cliente,
  onAtualizado,
  id,
}: {
  cliente: Cliente;
  onAtualizado: (c: Cliente) => void;
  id?: string;
}) {
  const [carregando, setCarregando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const link = cliente.portal_token && typeof window !== 'undefined' ? `${window.location.origin}/portal/${cliente.portal_token}` : '';

  const ativar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      onAtualizado(await ativarPortalCliente(cliente._id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao ativar portal');
    } finally {
      setCarregando(false);
    }
  };

  const desativar = async () => {
    if (!window.confirm('Desativar o portal? O link atual deixará de funcionar.')) return;
    setCarregando(true);
    setErro(null);
    try {
      onAtualizado(await desativarPortalCliente(cliente._id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao desativar portal');
    } finally {
      setCarregando(false);
    }
  };

  const copiar = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <div id={id} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1">
          <Globe size={12} /> Portal do cliente
        </p>
        {cliente.portal_ativo ? (
          <button onClick={desativar} disabled={carregando} className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50">
            Desativar
          </button>
        ) : (
          <button onClick={ativar} disabled={carregando} className="text-xs text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50">
            {carregando ? 'Ativando…' : 'Ativar'}
          </button>
        )}
      </div>

      {erro && <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{erro}</p>}

      {cliente.portal_ativo && link ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            readOnly
            value={link}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="flex-1 min-w-0 text-xs font-mono rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1.5 text-gray-600 dark:text-gray-300"
          />
          <button
            onClick={copiar}
            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Copiar link"
          >
            {copiado ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mt-1">
          Ative para gerar um link somente leitura — sem senha — para o cliente acompanhar processos, documentos e financeiro.
        </p>
      )}
    </div>
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
          profissao: clienteEditando.profissao,
          estado_civil: clienteEditando.estado_civil,
          razao_social: clienteEditando.razao_social,
          nome_fantasia: clienteEditando.nome_fantasia,
          observacoes: clienteEditando.observacoes,
          origem_lead: clienteEditando.origem_lead,
          endereco: clienteEditando.endereco,
        }
      : { tipo: 'pf', nome: '' },
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const documentoAtual = form.tipo === 'pf' ? form.cpf : form.cnpj;
  const documentoInvalido = !!documentoAtual?.trim() && !(form.tipo === 'pf' ? validarCpf(documentoAtual) : validarCnpj(documentoAtual));

  const [duplicados, setDuplicados] = useState<ClienteDuplicado[]>([]);
  useEffect(() => {
    const nome = form.nome.trim();
    const doc = (form.tipo === 'pf' ? form.cpf : form.cnpj)?.trim();
    if (nome.length < 3 && !doc) {
      setDuplicados([]);
      return;
    }
    const timeout = setTimeout(() => {
      verificarDuplicidadeCliente({
        nome: nome.length >= 3 ? nome : undefined,
        cpf: form.tipo === 'pf' ? doc : undefined,
        cnpj: form.tipo === 'pj' ? doc : undefined,
        ignorarId: clienteEditando?._id,
      })
        .then(setDuplicados)
        .catch(() => setDuplicados([]));
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.nome, form.cpf, form.cnpj, form.tipo]);

  const salvar = async () => {
    if (!form.nome.trim()) {
      setErro('Informe o nome.');
      return;
    }
    if (documentoInvalido) {
      setErro(form.tipo === 'pf' ? 'CPF inválido.' : 'CNPJ inválido.');
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
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{editando ? 'Editar cliente' : 'Novo cliente'}</p>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {duplicados.length > 0 && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 space-y-1">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Possível cliente duplicado</p>
              {duplicados.map((d) => (
                <p key={d.id} className="text-xs text-amber-600 dark:text-amber-400">
                  <span className="font-medium">{d.nome}</span> já cadastrado
                  {d.motivo === 'cpf' ? ' com este CPF' : d.motivo === 'cnpj' ? ' com este CNPJ' : ' com nome igual'}.
                </p>
              ))}
            </div>
          )}

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
              className={cn(
                'w-full text-sm rounded-lg border bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100',
                documentoInvalido ? 'border-red-400 dark:border-red-700' : 'border-gray-200 dark:border-gray-800',
              )}
            />
            {documentoInvalido && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {form.tipo === 'pf' ? 'CPF inválido — confira os dígitos.' : 'CNPJ inválido — confira os dígitos.'}
              </p>
            )}
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

          {form.tipo === 'pf' ? (
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Profissão">
                <input
                  value={form.profissao ?? ''}
                  onChange={(e) => setForm({ ...form, profissao: e.target.value })}
                  className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                />
              </Campo>
              <Campo label="Estado civil">
                <select
                  value={form.estado_civil ?? ''}
                  onChange={(e) => setForm({ ...form, estado_civil: (e.target.value || undefined) as NovoCliente['estado_civil'] })}
                  className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                >
                  <option value="">—</option>
                  <option value="solteiro">Solteiro(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="divorciado">Divorciado(a)</option>
                  <option value="viuvo">Viúvo(a)</option>
                  <option value="uniao_estavel">União estável</option>
                </select>
              </Campo>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Razão social">
                <input
                  value={form.razao_social ?? ''}
                  onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                  className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                />
              </Campo>
              <Campo label="Nome fantasia">
                <input
                  value={form.nome_fantasia ?? ''}
                  onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                  className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                />
              </Campo>
            </div>
          )}

          <Campo label="Origem">
            <input
              value={form.origem_lead ?? ''}
              onChange={(e) => setForm({ ...form, origem_lead: e.target.value })}
              placeholder="Indicação, site, parceria…"
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </Campo>

          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 pt-1">Endereço</p>
          <div className="grid grid-cols-3 gap-3">
            <Campo label="CEP">
              <input
                value={form.endereco?.cep ?? ''}
                onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, cep: e.target.value } })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </Campo>
            <Campo label="Cidade">
              <input
                value={form.endereco?.cidade ?? ''}
                onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, cidade: e.target.value } })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </Campo>
            <Campo label="UF">
              <input
                value={form.endereco?.uf ?? ''}
                maxLength={2}
                onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, uf: e.target.value.toUpperCase() } })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </Campo>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Campo label="Logradouro">
              <input
                value={form.endereco?.logradouro ?? ''}
                onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, logradouro: e.target.value } })}
                className="col-span-2 w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </Campo>
            <Campo label="Número">
              <input
                value={form.endereco?.numero ?? ''}
                onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, numero: e.target.value } })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Bairro">
              <input
                value={form.endereco?.bairro ?? ''}
                onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, bairro: e.target.value } })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </Campo>
            <Campo label="Complemento">
              <input
                value={form.endereco?.complemento ?? ''}
                onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, complemento: e.target.value } })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </Campo>
          </div>

          <Campo label="Observações">
            <textarea
              value={form.observacoes ?? ''}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={3}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 resize-none"
            />
          </Campo>

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
