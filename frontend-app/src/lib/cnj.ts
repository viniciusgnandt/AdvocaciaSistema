// Numero unico de processo (Resolucao CNJ 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO (20 digitos)

/** Aplica a mascara progressivamente enquanto o usuario digita, mantendo so os digitos. */
export function mascararCnjDigitando(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 20);
  const partes = [
    digitos.slice(0, 7),
    digitos.slice(7, 9),
    digitos.slice(9, 13),
    digitos.slice(13, 14),
    digitos.slice(14, 16),
    digitos.slice(16, 20),
  ].filter(Boolean);

  let resultado = partes[0] ?? '';
  if (partes[1]) resultado += `-${partes[1]}`;
  if (partes[2]) resultado += `.${partes[2]}`;
  if (partes[3]) resultado += `.${partes[3]}`;
  if (partes[4]) resultado += `.${partes[4]}`;
  if (partes[5]) resultado += `.${partes[5]}`;
  return resultado;
}

/** Formata um numero ja completo (20 digitos, sem mascara) para exibicao. */
export function formatarNumeroCnj(numero: string): string {
  const digitos = numero.replace(/\D/g, '');
  if (digitos.length !== 20) return numero;
  return `${digitos.slice(0, 7)}-${digitos.slice(7, 9)}.${digitos.slice(9, 13)}.${digitos.slice(13, 14)}.${digitos.slice(14, 16)}.${digitos.slice(16)}`;
}

/**
 * Valida o digito verificador do numero CNJ (modulo 97, base 10 - Resolucao 65/2008,
 * mesmo algoritmo usado por bancos para IBAN). Exige os 20 digitos completos; numeros
 * incompletos (ainda sendo digitados) nao sao tratados como invalidos.
 */
export function validarCnj(numero: string): boolean | null {
  const digitos = numero.replace(/\D/g, '');
  if (digitos.length !== 20) return null;

  const sequencial = digitos.slice(0, 7);
  const dvInformado = digitos.slice(7, 9);
  const resto = digitos.slice(9); // ano + orgao + tribunal + origem, 11 digitos

  const semDv = BigInt(sequencial + resto);
  const dvCalculado = 98n - ((semDv * 100n) % 97n);
  return dvCalculado.toString().padStart(2, '0') === dvInformado;
}
