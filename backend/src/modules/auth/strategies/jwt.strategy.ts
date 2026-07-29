import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsuarioAutenticado } from '../decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'trilva-dev-secret-troque-em-producao',
    });
  }

  // o payload assinado (ver AuthService.emitirToken) ja tem o shape de UsuarioAutenticado
  validate(payload: UsuarioAutenticado): UsuarioAutenticado {
    return payload;
  }
}
