'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gavel, Scale, ShieldCheck, Zap } from 'lucide-react';
import { login, salvarSessao } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      const sessao = await login(email, senha);
      salvarSessao(sessao);
      router.push('/publicacoes');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setEntrando(false);
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
            Gestão de escritório sem fricção, do jeito que a advocacia precisa.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <Gavel size={16} className="mt-0.5 shrink-0 text-brand-200" />
              <p className="text-sm text-brand-50/90">Processos, prazos e publicações monitorados automaticamente.</p>
            </div>
            <div className="flex items-start gap-3">
              <Zap size={16} className="mt-0.5 shrink-0 text-brand-200" />
              <p className="text-sm text-brand-50/90">Financeiro, tarefas e clientes num só lugar.</p>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-200" />
              <p className="text-sm text-brand-50/90">Multi-escritório, com trilha de auditoria e permissões por perfil.</p>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-brand-100/60">Plataforma de gestão para escritórios de advocacia.</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center mb-3">
              <Scale size={20} className="text-white" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Trilva</p>
          </div>
          <div className="mb-6 hidden lg:block">
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">Entre na sua conta</p>
          </div>
          <p className="text-sm text-gray-400 mb-6 lg:hidden">Entre na sua conta</p>

          <form onSubmit={entrar} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">E-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Senha</span>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>

            {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

            <button
              type="submit"
              disabled={entrando}
              className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
            >
              {entrando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-4">
            Ainda não tem escritório cadastrado?{' '}
            <Link href="/registro" className="text-brand-600 dark:text-brand-400 hover:underline">
              Criar escritório
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
