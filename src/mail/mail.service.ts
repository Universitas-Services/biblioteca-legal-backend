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
      <p>Hola,</p>
      <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva:</p>
      <p><a href="${resetLink}">Restablecer contraseña</a></p>
      <p>Este enlace es válido por un corto período de tiempo y solo puede usarse una vez.</p>
      <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
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
