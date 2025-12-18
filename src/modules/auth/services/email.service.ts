import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // Configuración del transporter con validación de variables
    

        try {
            this.transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.EMAIL_PORT || '587'),
                secure: process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_PORT === '465', // true para 465, false para otros puertos
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });
            console.log('✅ Email service configurado exitosamente');
        } catch (error) {
            console.error('❌ Error al configurar email service:', error);
            throw error;
        }
    }

    async sendPasswordResetEmail(email: string, token: string): Promise<void> {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'Sistema de Ventas'}" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Recuperación de Contraseña',
            html: `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Recuperación de Contraseña</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f4f4f4; border-radius: 10px; padding: 30px;">
                        <h1 style="color: #2c3e50; text-align: center;">Recuperación de Contraseña</h1>
                        
                        <p style="font-size: 16px;">Hola,</p>
                        
                        <p style="font-size: 16px;">
                            Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva contraseña:
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" 
                               style="background-color: #3498db; 
                                      color: white; 
                                      padding: 12px 30px; 
                                      text-decoration: none; 
                                      border-radius: 5px; 
                                      display: inline-block;
                                      font-weight: bold;">
                                Restablecer Contraseña
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #7f8c8d; margin-top: 20px;">
                            Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                        
                        <p style="font-size: 12px; color: #95a5a6; text-align: center;">
                            Este es un correo automático, por favor no respondas a este mensaje.
                        </p>
                    </div>
                </body>
                </html>
            `,
            text: `
                Recuperación de Contraseña
                
                Has solicitado restablecer tu contraseña. 
                
                Visita el siguiente enlace para crear una nueva contraseña:
                ${resetUrl}
                
                Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Email de recuperación enviado a:', email);
        } catch (error) {
            console.error('❌ Error al enviar email:', error.message || error);
            console.error('Error completo:', error);
            throw new Error(`No se pudo enviar el correo de recuperación: ${error.message}`);
        }
    }

    async sendPasswordChangedConfirmation(email: string): Promise<void> {
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'Sistema de Ventas'}" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Contraseña Actualizada',
            html: `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Contraseña Actualizada</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f4f4f4; border-radius: 10px; padding: 30px;">
                        <h1 style="color: #27ae60; text-align: center;">Contraseña Actualizada</h1>
                        
                        <p style="font-size: 16px;">Hola,</p>
                        
                        <p style="font-size: 16px;">
                            Tu contraseña ha sido actualizada exitosamente.
                        </p>
                        
                        <p style="font-size: 14px; color: #7f8c8d; margin-top: 20px;">
                            Si no realizaste este cambio, por favor contacta al administrador del sistema inmediatamente.
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                        
                        <p style="font-size: 12px; color: #95a5a6; text-align: center;">
                            Este es un correo automático, por favor no respondas a este mensaje.
                        </p>
                    </div>
                </body>
                </html>
            `,
            text: `
                Contraseña Actualizada
                
                Tu contraseña ha sido actualizada exitosamente.
                
                Si no realizaste este cambio, por favor contacta al administrador del sistema inmediatamente.
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Email de confirmación enviado a:', email);
        } catch (error) {
            console.error('❌ Error al enviar email de confirmación:', error);
        }
    }
}
