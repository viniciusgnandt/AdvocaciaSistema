export type TipoToast = 'sucesso' | 'erro';

export type ToastItem = { id: string; mensagem: string; tipo: TipoToast };

type Ouvinte = (item: ToastItem) => void;

const ouvintes = new Set<Ouvinte>();

/** Dispara um toast padronizado - qualquer tela pode chamar sem precisar montar seu proprio
 * feedback de "salvo com sucesso" / "erro ao salvar". O <Toaster /> (montado uma vez no
 * AppShell) e quem efetivamente renderiza. */
export function toast(mensagem: string, tipo: TipoToast = 'sucesso') {
  const item: ToastItem = { id: crypto.randomUUID(), mensagem, tipo };
  ouvintes.forEach((ouvinte) => ouvinte(item));
}

export function inscrever(ouvinte: Ouvinte) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
