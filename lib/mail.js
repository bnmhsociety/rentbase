export function emailShell(content) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;padding:24px;color:#0f172a">
    <div style="max-width:680px;margin:auto;background:white;border-radius:28px;padding:24px;border:1px solid #e8ecf4;box-shadow:0 16px 45px rgba(15,23,42,.08)">
      <div style="font-weight:1000;font-size:22px;letter-spacing:-.8px;margin-bottom:18px">RENT<span style="color:#0A49FF">BASE</span></div>
      ${content}
      <p style="font-size:12px;color:#7d8797;margin-top:22px">Message automatique envoyé par RentBase.</p>
    </div>
  </div>`;
}

export function summaryHtml(lines) {
  return `
  <div style="background:#f8fafc;border:1px solid #e8ecf4;border-radius:20px;padding:16px;margin-top:18px">
    ${lines.map(([label, value]) => `
      <div style="display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #e8ecf4;padding:9px 0">
        <span style="color:#7d8797;font-weight:800">${label}</span>
        <strong style="text-align:right">${value || "—"}</strong>
      </div>
    `).join("")}
  </div>`;
}

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from || !to) return { skipped: true };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    return { sent: false, error: await response.text() };
  }

  return { sent: true };
}
