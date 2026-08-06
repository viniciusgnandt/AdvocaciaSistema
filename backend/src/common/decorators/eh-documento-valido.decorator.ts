import { registerDecorator, ValidationOptions } from 'class-validator';
import { validarCpf, validarCnpj } from '../documento.util';

/** Valida CPF (11 digitos) ou CNPJ (14 digitos) pelo digito verificador - so roda quando o
 * campo tem valor, ja que cpf/cnpj sao opcionais no cadastro do cliente. */
export function EhCpfOuCnpjValido(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'ehCpfOuCnpjValido',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null || value === '') return true;
          if (typeof value !== 'string') return false;
          const digitos = value.replace(/\D/g, '');
          if (digitos.length === 11) return validarCpf(value);
          if (digitos.length === 14) return validarCnpj(value);
          return false;
        },
        defaultMessage() {
          return `$property invalido (verifique o CPF/CNPJ digitado)`;
        },
      },
    });
  };
}
