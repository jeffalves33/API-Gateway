const transporter = require('../config/mailerConfig');

const required = v => typeof v === 'string' && v.trim();

exports.sendDemoRequest = async (req, res) => {
    try {
        const { name, email, phone, company, position, companySize, interests } = req.body || {};
        const missing = [];
        if (!required(name)) missing.push('name');
        if (!required(email)) missing.push('email');
        if (!required(phone)) missing.push('phone');
        if (!required(company)) missing.push('company');
        if (!required(position)) missing.push('position');
        if (!required(companySize)) missing.push('companySize');
        if (!required(interests)) missing.push('interests');
        if (missing.length) return res.status(400).json({ success: false, message: `Campos faltando: ${missing.join(', ')}` });

        const subject = `Novo pedido de demonstração — ${company} (${name})`;
        const html = `
            <h2>Pedido de Demonstração</h2>
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Telefone:</strong> ${phone}</p>
            <p><strong>Empresa:</strong> ${company}</p>
            <p><strong>Cargo:</strong> ${position}</p>
            <p><strong>Tamanho:</strong> ${companySize}</p>
            <p><strong>Interesses/Desafios:</strong><br>${(interests || '').replace(/\n/g, '<br>')}</p>
            <hr><p>Enviado em ${new Date().toLocaleString('pt-BR')}</p>
        `;

        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: process.env.MAIL_TO,
            subject,
            html,
            replyTo: email,
        });

        res.status(200).json({ success: true, messageId: info?.messageId });
    } catch (err) {
        console.error('Erro ao enviar email:', err);
        res.status(500).json({ success: false, message: 'Falha ao enviar email' });
    }
};
