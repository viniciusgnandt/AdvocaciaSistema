import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marca uma rota como acessivel sem JWT (login, registro do escritorio). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
