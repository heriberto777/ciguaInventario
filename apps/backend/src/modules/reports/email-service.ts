const nodemailer = require('nodemailer');
import { PrismaClient } from '@prisma/client';

export class EmailService {
    constructor(private prisma: PrismaClient) {}

    // Conversor interno para evitar dependencias externas en el servidor
    private renderMarkdown(text: string): string {
        let html = text
            .replace(/###\s+(.*)/g, '<h3 style="color: #0f172a; margin-top: 25px; border-left: 4px solid #6366f1; padding-left: 10px;">$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #4338ca;">$1</strong>')
            .replace(/\n/g, '<br>');

        // Procesamiento rudimentario pero efectivo de tablas
        const lines = html.split('<br>');
        let inTable = false;
        let tableHtml = '<table style="border-collapse: collapse; width: 100%; margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">';

        const processedLines = lines.map(line => {
            if (line.includes('|') && line.trim().startsWith('|')) {
                const cells = line.split('|').filter(c => c.trim() !== '' || line.indexOf('|') !== line.lastIndexOf('|'));
                if (cells.length > 1) {
                    if (line.includes('---')) return ''; // Saltar separadores de tabla
                    
                    const tag = !inTable ? 'th' : 'td';
                    const style = !inTable 
                        ? 'background: #f8fafc; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;' 
                        : 'padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;';
                    
                    let row = '<tr>' + cells.map(c => `<${tag} style="${style}">${c.trim()}</${tag}>`).join('') + '</tr>';
                    
                    if (!inTable) {
                        inTable = true;
                        return tableHtml + row;
                    }
                    return row;
                }
            } else if (inTable) {
                inTable = false;
                return '</table>' + line;
            }
            return line;
        });

        return processedLines.join(' ');
    }

    async sendAuditReport(companyId: string, to: string, subject: string, analysis: string, pdfBase64?: string) {
        const config = await (this.prisma as any).appConfig.findUnique({
            where: { companyId }
        });

        if (!config || !config.smtpHost) {
            throw new Error('Configuración SMTP no encontrada para esta empresa.');
        }

        const transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort || 587,
            secure: config.smtpPort === 465,
            auth: {
                user: config.smtpUser,
                pass: config.smtpPass
            }
        });

        // Convertir usando nuestro procesador interno
        const htmlAnalysis = this.renderMarkdown(analysis);

        const mailOptions: any = {
            from: config.smtpFrom || '"Cigua AI" <no-reply@ciguainv.com>',
            to,
            subject,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <div style="background: #0f172a; color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px; font-weight: 900;">CIGUA INVENTORY INTELLIGENCE</h1>
                        <p style="margin: 5px 0 0; font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 3px;">Advanced Audit Report</p>
                    </div>
                    <div style="padding: 40px; background: #ffffff;">
                        <div style="margin-bottom: 30px; border-bottom: 2px solid #6366f1; display: inline-block; padding-bottom: 5px;">
                            <h2 style="color: #6366f1; margin: 0; font-size: 18px; text-transform: uppercase;">Informe de Auditoría Estratégica</h2>
                        </div>
                        
                        <div class="report-content" style="color: #334155; font-size: 14px;">
                            ${htmlAnalysis}
                        </div>

                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
                            <p style="font-size: 11px; color: #94a3b8; font-style: italic;">
                                Este es un informe confidencial generado automáticamente por el núcleo de Cigua AI. 
                                <br> Favor no responder a este correo.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        if (pdfBase64) {
            mailOptions.attachments = [
                {
                    filename: 'Auditoria_Inventario.pdf',
                    content: pdfBase64.split(',')[1],
                    encoding: 'base64'
                }
            ];
        }

        return await transporter.sendMail(mailOptions);
    }
}
