const dns = require('dns').promises;
const net = require('net');
const nodemailer = require('nodemailer');

const logger = require('../config/logger');

const mailService = process.env.MAILER_SERVICE;
const mailHost = String(process.env.MAILER_HOST || '').trim();
const mailPort = Number(process.env.MAILER_PORT || 587);
const mailSecure = String(process.env.MAILER_SECURE).toLowerCase() === 'true';
const mailUser = String(process.env.MAILER_USER || '').trim();
const rawMailPass = process.env.MAILER_PASS || '';
const mailPass = rawMailPass.replace(/\s+/g, '');
const mailFrom = String(process.env.MAILER_FROM || mailUser || 'no-reply@example.com').trim();
const mailTlsRejectUnauthorized = process.env.MAILER_TLS_REJECT_UNAUTHORIZED !== 'false';

let transporterPromise = null;

function isConfigured() {
  return Boolean((mailHost || mailService) && mailUser && mailPass);
}

async function resolveSmtpHost(host) {
  if (!host) return { host: null, servername: null };
  if (net.isIP(host)) return { host, servername: null };

  try {
    const result = await dns.lookup(host, { family: 4 });
    return { host: result.address, servername: host };
  } catch (error) {
    logger.warn(`SMTP host lookup fallback failed for ${host}: ${error.message}`);
    return { host, servername: null };
  }
}

async function createTransporter() {
  if (!isConfigured()) {
    throw new Error('Mailer is not configured. Set MAILER_HOST or MAILER_SERVICE, plus MAILER_USER and MAILER_PASS in environment.');
  }

  const transportConfig = {
    auth: {
      user: mailUser,
      pass: mailPass
    },
    tls: {
      rejectUnauthorized: mailTlsRejectUnauthorized
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  };

  if (mailHost) {
    const resolved = await resolveSmtpHost(mailHost);
    transportConfig.host = resolved.host;
    transportConfig.port = mailPort;
    transportConfig.secure = mailSecure;
    if (resolved.servername) {
      transportConfig.tls.servername = resolved.servername;
    }
  } else {
    transportConfig.service = mailService;
    transportConfig.secure = mailSecure;
  }

  const transporter = nodemailer.createTransport(transportConfig);
  await transporter.verify();
  logger.info(`Mailer transport is ready${mailHost ? ` (${mailHost})` : ` (${mailService})`}`);
  return transporter;
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createTransporter().catch((error) => {
      transporterPromise = null;
      logger.error('Mailer verification failed: ' + error.message);
      throw error;
    });
  }

  return transporterPromise;
}

function formatPasswordResetEmail(code) {
  return {
    subject: 'Аудиторный контроль: код для сброса пароля',
    text: `Здравствуйте!\n\nВаш код для сброса пароля: ${code}\n\nКод действует 15 минут.\n\nЕсли вы не запрашивали сброс пароля, просто проигнорируйте это письмо.\n\nС уважением,\nАудиторный контроль`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <h2>Аудиторный контроль</h2>
        <p>Здравствуйте!</p>
        <p>Ваш код для сброса пароля:</p>
        <p style="font-size: 22px; font-weight: bold;">${code}</p>
        <p>Код действует 15 минут.</p>
        <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
        <p>С уважением,<br>Аудиторный контроль</p>
      </div>
    `
  };
}

async function sendPasswordResetEmail(to, code) {
  const transporter = await getTransporter();
  const { subject, text, html } = formatPasswordResetEmail(code);
  const info = await transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    text,
    html
  });

  logger.info(`Password reset email sent to ${to}. MessageId=${info.messageId}`);
  return info;
}

module.exports = {
  sendPasswordResetEmail
};
