import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { Usuario, UsuarioSchema } from './schemas/usuario.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Usuario.name, schema: UsuarioSchema },
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'trilva-dev-secret-troque-em-producao',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController, UsuariosController],
  providers: [
    AuthService,
    UsuariosService,
    JwtStrategy,
    // guard global: toda rota exige JWT valido, exceto as marcadas com @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
