import nodemailer from "nodemailer";
import "server-only";

type SendVerificationEmailInput = {
  to: string;
  code: string;
};

type MailConfig =
  | {
      mode: "smtp";
      host: string;
      port: number;
      secure: boolean;
      auth: { user: string; pass: string };
      from: string;
    }
  | {
      mode: "service";
      service: string;
      auth: { user: string; pass: string };
      from: string;
    };

function getMailConfig(): MailConfig {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpFrom = process.env.SMTP_FROM?.trim();

  if (smtpHost && smtpUser && smtpPass) {
    return {
      mode: "smtp",
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      from: smtpFrom || smtpUser,
    };
  }

  // Backward compatibility with existing env style:
  // EMAIL_SERVICE=gmail, GOOGLE_USER, GOOGLE_PASS
  const service = process.env.EMAIL_SERVICE?.trim();
  const serviceUser = process.env.GOOGLE_USER?.trim();
  const servicePass = process.env.GOOGLE_PASS?.trim();

  if (service && serviceUser && servicePass) {
    return {
      mode: "service",
      service,
      auth: { user: serviceUser, pass: servicePass },
      from: smtpFrom || serviceUser,
    };
  }

  throw new Error(
    "Mail config missing. Set SMTP_HOST/SMTP_USER/SMTP_PASS (optional SMTP_FROM) or EMAIL_SERVICE/GOOGLE_USER/GOOGLE_PASS."
  );
}

export async function sendVerificationEmail(input: SendVerificationEmailInput) {
  const config = getMailConfig();
  const transporter =
    config.mode === "smtp"
      ? nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: config.auth,
        })
      : nodemailer.createTransport({
          service: config.service,
          auth: config.auth,
        });

  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: "[notice-next] 이메일 인증 코드",
    text: `인증 코드: ${input.code}\n10분 이내에 입력해주세요.`,
    html: `<div><p>인증 코드: <b>${input.code}</b></p><p>10분 이내에 입력해주세요.</p></div>`,
  });
}
