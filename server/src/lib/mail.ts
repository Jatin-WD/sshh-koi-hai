import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS
  ? nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } })
  : null;

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6efe7;color:#2b2024;font-family:Arial,sans-serif"><div style="max-width:600px;margin:40px auto;padding:40px;background:#fffaf5;border:1px solid #eadbd5"><p style="color:#681f35;letter-spacing:3px;font-size:12px;text-transform:uppercase">Sshh... Koi Hai?</p><h1 style="font-family:Georgia,serif;font-weight:normal;color:#2b2024">${title}</h1>${body}<p style="color:#75666a;font-size:12px;margin-top:36px">Private conversations. Meaningful connections.<br>Never share this email or link with anyone.</p></div></body></html>`;
}

export async function sendVerificationEmail(email: string, displayName: string, token: string) {
  const url = `${env.CLIENT_APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return sendMail(email, "Confirm your email", layout("A quiet hello awaits.", `<p>Hello ${escapeHtml(displayName)},</p><p>Confirm your email to finish creating your private account.</p><p><a href="${url}" style="display:inline-block;padding:13px 22px;background:#681f35;color:#fffaf5;text-decoration:none">Confirm email</a></p><p style="font-size:12px;color:#75666a">This link expires in ${env.EMAIL_VERIFICATION_TTL_HOURS} hours.</p>`));
}

export async function sendPasswordResetEmail(email: string, displayName: string, token: string) {
  const url = `${env.CLIENT_APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return sendMail(email, "Reset your password", layout("Your private access link.", `<p>Hello ${escapeHtml(displayName)},</p><p>Use the button below to choose a new password.</p><p><a href="${url}" style="display:inline-block;padding:13px 22px;background:#681f35;color:#fffaf5;text-decoration:none">Reset password</a></p><p style="font-size:12px;color:#75666a">This link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes. If you did not request this, you can ignore it.</p>`));
}

async function sendMail(to: string, subject: string, html: string) {
  if (!transporter || !env.SMTP_FROM) {
    if (env.NODE_ENV !== "production") console.info(`[email preview] ${subject} -> ${to}`);
    return;
  }
  await transporter.sendMail({ from: env.SMTP_FROM_NAME ? `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>` : env.SMTP_FROM, to, subject, html });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
