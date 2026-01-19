import { Body, Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.id);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    console.log('🔐 LOGIN - Datos recibidos:', loginDto);

    try {
      const result = await this.authService.login(loginDto);
      console.log('✅ LOGIN EXITOSO - Respuesta:', {
        message: 'Login exitoso',
        hasToken: !!result.access_token,
        tokenLength: result.access_token?.length,
        user: result.user?.correo
      });

      return {
        message: 'Login exitoso',
        ...result
      };
    } catch (error) {
      console.log('❌ ERROR EN LOGIN:', error.message);
      throw error;
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    console.log('📧 FORGOT PASSWORD - Correo:', forgotPasswordDto.correo);
    console.log('📧 Validando DTO:', forgotPasswordDto);

    try {
      const result = await this.authService.forgotPassword(forgotPasswordDto);
      console.log('✅ Proceso de recuperación iniciado');
      return result;
    } catch (error) {
      console.error('❌ ERROR EN FORGOT PASSWORD:', error.message || error);
      console.error('Error completo:', error);
      throw error;
    }
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    console.log('🔑 RESET PASSWORD - Token recibido');

    try {
      const result = await this.authService.resetPassword(resetPasswordDto);
      console.log('✅ Contraseña reseteada exitosamente');
      return result;
    } catch (error) {
      console.log('❌ ERROR EN RESET PASSWORD:', error.message);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user; // req.user lo llena Passport con el JWT payload
  }
}
