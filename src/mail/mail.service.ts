import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn(
        'RESEND_API_KEY no está configurada en las variables de entorno. Los correos se imprimirán en consola.',
      );
    }
  }

  async sendPasswordResetEmail(email: string, resetLink: string) {
    const from = this.configService.get<string>('EMAIL_FROM') || 'no-reply@bibliotecalegal.com';
    const subject = 'Recuperación de contraseña';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Recuperación de Contraseña</h2>
        <p style="color: #555; font-size: 16px;">Hola,</p>
        <p style="color: #555; font-size: 16px;">Has solicitado restablecer tu contraseña en la plataforma de Universitas Legal. Haz clic en el botón de abajo para crear una nueva contraseña:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #0056b3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Restablecer contraseña</a>
        </div>
        <p style="color: #555; font-size: 14px;">Este enlace es válido por 15 minutos y solo puede usarse una vez.</p>
        <p style="color: #555; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Universitas Legal. Todos los derechos reservados.</p>
      </div>
    `;

    if (this.resend) {
      try {
        await this.resend.emails.send({
          from,
          to: email,
          subject,
          html,
        });
        this.logger.log(`Correo de reseteo enviado a ${email}`);
      } catch (error) {
        this.logger.error(`Error enviando correo de reseteo a ${email}:`, error);
        throw new Error('No se pudo enviar el correo de recuperación.');
      }
    } else {
      // Mock behaviour when no API key is present (useful for local dev)
      this.logger.log(`[MOCK EMAIL] To: ${email} | Subject: ${subject}`);
      this.logger.log(`[MOCK EMAIL] Link: ${resetLink}`);
    }
  }
}
