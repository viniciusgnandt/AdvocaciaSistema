import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { Usuario, UsuarioSchema } from './schemas/usuario.schema';
import { Grupo, GrupoSchema } from './schemas/grupo.schema';
import { TimeTrabalho, TimeTrabalhoSchema } from './schemas/time-trabalho.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { GruposService } from './grupos.service';
import { GruposController } from './grupos.controller';
import { TimesService } from './times.service';
import { TimesController } from './times.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Grupo.name, schema: GrupoSchema },
      { name: TimeTrabalho.name, schema: TimeTrabalhoSchema },
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
  controllers: [AuthController, UsuariosController, GruposController, TimesController],
  providers: [
    AuthService,
    UsuariosService,
    GruposService,
    TimesService,
    JwtStrategy,
    // guard global: toda rota exige JWT valido, exceto as marcadas com @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
