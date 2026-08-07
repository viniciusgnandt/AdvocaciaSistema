'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gavel, Scale, ShieldCheck, Zap } from 'lucide-react';
import { registrarEscritorio, salvarSessao } from '@/lib/api';

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nome_escritorio: '', nome_admin: '', email: '', senha: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const sessao = await registrarEscritorio(form);
      salvarSessao(sessao);
      router.push('/publicacoes');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar escritório');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 text-white flex-col justify-between p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)', backgroundSize: '20px 20px' }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <Scale size={17} />
          </div>
          <span className="text-lg font-semibold">Trilva</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-3xl font-semibold leading-tight">
            Coloque o escritório no ar em menos de um minuto.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <Gavel size={16} className="mt-0.5 shrink-0 text-brand-200" />
              <p className="text-sm text-brand-50/90">Sem cartão de crédito — comece a usar agora mesmo.</p>
            </div>
            <div className="flex items-start gap-3">
              <Zap size={16} className="mt-0.5 shrink-0 text-brand-200" />
              <p className="text-sm text-brand-50/90">Convide sua equipe e organize processos no mesmo dia.</p>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-200" />
              <p className="text-sm text-brand-50/90">Seus dados isolados por escritório, com backup e exportação.</p>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-brand-100/60">Plataforma de gestão para escritórios de advocacia.</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center mb-3">
              <Scale size={20} className="text-white" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Criar escritório</p>
            <p className="text-sm text-gray-400">Leva menos de um minuto</p>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 hidden lg:block">Criar escritório</p>

          <form onSubmit={criar} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nome do escritório</span>
            <input
              required
              value={form.nome_escritorio}
              onChange={(e) => setForm({ ...form, nome_escritorio: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Seu nome</span>
            <input
              required
              value={form.nome_admin}
              onChange={(e) => setForm({ ...form, nome_admin: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">E-mail</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Senha (mín. 8 caracteres)</span>
            <input
              type="password"
              required
              minLength={8}
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {enviando ? 'Criando…' : 'Criar escritório'}
          </button>
        </form>

          <p className="text-center text-sm text-gray-400 mt-4">
            Já tem conta?{' '}
            <Link href="/login" className="text-brand-600 dark:text-brand-400 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
