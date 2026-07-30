import { SetMetadata } from '@nestjs/common';
import { Permissao as PermissaoChave } from '../schemas/grupo.schema';

export const PERMISSAO_KEY = 'permissao';
// admin sempre passa, independente da permissao pedida - o grupo so' concede poderes
// extras a quem NAO e' admin (advogado/assistente com uma permissao especifica).
export const Permissao = (chave: PermissaoChave) => SetMetadata(PERMISSAO_KEY, chave);
