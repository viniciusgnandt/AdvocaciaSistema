function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function validarCpf(valor: string): boolean {
  const cpf = apenasDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (base: string): number => {
    let soma = 0;
    let peso = base.length + 1;
    for (const digito of base) {
      soma += Number(digito) * peso;
      peso -= 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const digito1 = calcularDigito(cpf.slice(0, 9));
  const digito2 = calcularDigito(cpf.slice(0, 9) + digito1);
  return cpf === cpf.slice(0, 9) + String(digito1) + String(digito2);
}

export function validarCnpj(valor: string): boolean {
  const cnpj = apenasDigitos(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcularDigito = (base: string): number => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const digito1 = calcularDigito(cnpj.slice(0, 12));
  const digito2 = calcularDigito(cnpj.slice(0, 12) + digito1);
  return cnpj === cnpj.slice(0, 12) + String(digito1) + String(digito2);
}
