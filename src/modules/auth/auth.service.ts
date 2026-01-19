// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsuarioAdmin } from '../cliente-administracion/usuarios-admin/entities/usuarios-admin.entity';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from './services/email.service';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(UsuarioAdmin)
        private readonly usuarioRepo: Repository<UsuarioAdmin>,
        private readonly jwtService: JwtService,
        private readonly emailService: EmailService,
    ) { }

    async validateUser(correo: string, contrasena: string) {
        console.log('=== DEBUG AUTH ===');
        console.log('Correo recibido:', correo);
        console.log('Contraseña recibida:', contrasena);
        console.log('Tipo de contraseña recibida:', typeof contrasena);
        console.log('Longitud contraseña recibida:', contrasena.length);

        const user = await this.usuarioRepo.findOne({ where: { correo } });

        if (!user) {
            console.log('❌ Usuario NO encontrado en BD');
            throw new UnauthorizedException('Credenciales inválidas');
        }

        console.log('✅ Usuario encontrado en BD:');
        console.log('- ID:', user.id);
        console.log('- Nombre:', user.nombre);
        console.log('- Correo BD:', user.correo);
        console.log('- Contraseña BD:', user.contrasena);
        console.log('- Tipo contraseña BD:', typeof user.contrasena);
        console.log('- Longitud contraseña BD:', user.contrasena?.length);
        console.log('- Rol:', user.rol);

        // 🔒 VALIDACIÓN DE CONTRASEÑA - CRÍTICO
        console.log('🔍 Comparando contraseñas:');
        console.log('Recibida  :', `"${contrasena}"`);
        console.log('En BD     :', `"${user.contrasena}"`);
        console.log('Son iguales?:', contrasena === user.contrasena);

        if (contrasena !== user.contrasena) {
            console.log('❌ Contraseñas NO coinciden - ACCESO DENEGADO');
            throw new UnauthorizedException('Credenciales inválidas');
        }

        console.log('✅ Contraseñas coinciden - Login exitoso');
        console.log('==================');
        return user;
    }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.correo, loginDto.contrasena);

        // Actualizar estado de usuario
        user.en_linea = 1;
        user.ultimo_login = new Date();
        await this.usuarioRepo.save(user);

        const payload = {
            sub: user.id,
            correo: user.correo,
            nombre: user.nombre,
            rol: user.rol
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol },
        };
    }

    async logout(userId: number) {
        await this.usuarioRepo.update(userId, { en_linea: 0 });
        return { message: 'Sesión cerrada exitosamente' };
    }

    /**
     * Solicita recuperación de contraseña
     * Genera un token único y lo envía por email
     */
    async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
        const { correo } = forgotPasswordDto;

        // Buscar usuario por correo
        const user = await this.usuarioRepo.findOne({ where: { correo } });

        // Por seguridad, siempre devolver el mismo mensaje
        // No revelar si el usuario existe o no
        if (!user) {
            console.log(` Intento de recuperación para correo no existente: ${correo}`);
            return {
                message: 'Si el correo existe, recibirás un enlace de recuperación'
            };
        }

        // Generar token único y seguro
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash del token para guardarlo en BD de forma segura
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // El token expira en 1 hora
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Guardar token hasheado en BD
        user.reset_password_token = hashedToken;
        user.reset_password_expires = expiresAt;
        await this.usuarioRepo.save(user);

        console.log(' Token de recuperación generado para:', correo);
        console.log(' Expira en:', expiresAt.toLocaleString());

        // Enviar email con el token SIN hashear
        try {
            await this.emailService.sendPasswordResetEmail(correo, resetToken);
            console.log('✅ Email enviado exitosamente');
        } catch (error) {
            console.error('❌ Error al enviar email:', error.message || error);
            throw new BadRequestException(`Error al enviar el correo: ${error.message || 'Error desconocido'}`);
        }

        return {
            message: 'Si el correo existe, recibirás un enlace de recuperación'
        };
    }

    /**
     * Resetea la contraseña usando el token
     */
    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
        const { token, nuevaContrasena } = resetPasswordDto;

        // Hash del token recibido para comparar con BD
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Buscar usuario con el token y que no haya expirado
        const user = await this.usuarioRepo
            .createQueryBuilder('user')
            .where('user.reset_password_token = :token', { token: hashedToken })
            .andWhere('user.reset_password_expires > :now', { now: new Date() })
            .getOne();

        if (!user) {
            console.log(' Token inválido o expirado');
            throw new BadRequestException('Token inválido o expirado');
        }

        console.log('✅ Token válido para usuario:', user.correo);

        // Actualizar contraseña (sin hashear por ahora, según tu lógica actual)
        // TODO: Implementar bcrypt cuando decidas hashear contraseñas
        user.contrasena = nuevaContrasena;

        // Limpiar tokens de recuperación
        user.reset_password_token = null as any;
        user.reset_password_expires = null as any;

        await this.usuarioRepo.save(user);

        console.log(' Contraseña actualizada para:', user.correo);

        // Enviar email de confirmación
        try {
            await this.emailService.sendPasswordChangedConfirmation(user.correo);
        } catch (error) {
            console.error(' Error al enviar email de confirmación:', error);
            // No falla la operación si el email falla
        }

        return {
            message: 'Contraseña actualizada exitosamente'
        };
    }
}

