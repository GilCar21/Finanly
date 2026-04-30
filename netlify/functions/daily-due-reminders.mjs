import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const TIME_ZONE = process.env.REMINDER_TIME_ZONE || "America/Fortaleza";
const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

function getServiceAccount() {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
      ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
      : process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw) {
    throw new Error("Configure FIREBASE_SERVICE_ACCOUNT_BASE64 ou FIREBASE_SERVICE_ACCOUNT.");
  }

  return JSON.parse(raw);
}

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert(getServiceAccount()),
    });
  }

  return getFirestore();
}

function todayInTimeZone() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatDate(date) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function normalizeEmail(email) {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

function buildEmailBody(items, dueDate) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const lines = items
    .sort((a, b) => b.amount - a.amount)
    .map((item) => {
      const owner = item.ownerName ? ` - ${item.ownerName}` : "";
      return `- ${item.description}${owner}: ${formatCurrency(item.amount)} (${item.paymentMethod || "sem metodo"})`;
    });

  return {
    total,
    count: items.length,
    text: [
      `Voce tem ${items.length} conta(s) pendente(s) vencendo em ${formatDate(dueDate)}.`,
      "",
      ...lines,
      "",
      `Total pendente: ${formatCurrency(total)}`,
    ].join("\n"),
    html: [
      `<p>Voce tem <strong>${items.length}</strong> conta(s) pendente(s) vencendo em <strong>${formatDate(dueDate)}</strong>.</p>`,
      "<ul>",
      ...items.map((item) => {
        const owner = item.ownerName ? ` <small>(${item.ownerName})</small>` : "";
        return `<li><strong>${escapeHtml(item.description)}</strong>${owner}: ${formatCurrency(item.amount)} <small>${escapeHtml(item.paymentMethod || "sem metodo")}</small></li>`;
      }),
      "</ul>",
      `<p><strong>Total pendente: ${formatCurrency(total)}</strong></p>`,
    ].join(""),
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail({ toEmail, toName, dueDate, body }) {
  const serviceId = process.env.EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID;
  const templateId =
    process.env.EMAILJS_REMINDER_TEMPLATE_ID ||
    process.env.VITE_EMAILJS_REMINDER_TEMPLATE_ID ||
    process.env.EMAILJS_TEMPLATE_ID ||
    process.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY || process.env.VITE_EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error("Configure EMAILJS_SERVICE_ID, EMAILJS_REMINDER_TEMPLATE_ID e EMAILJS_PUBLIC_KEY.");
  }

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        to_email: toEmail,
        to_name: toName || toEmail,
        subject: `Contas pendentes para ${formatDate(dueDate)}`,
        due_date: formatDate(dueDate),
        pending_count: body.count,
        total_amount: formatCurrency(body.total),
        pending_items: body.text,
        pending_items_html: body.html,
        message: body.text,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`EmailJS falhou (${response.status}): ${await response.text()}`);
  }
}

async function loadUserProfiles(db, userIds) {
  const profiles = new Map();

  await Promise.all(
    [...userIds].map(async (userId) => {
      const snap = await db.collection("users").doc(userId).get();
      if (snap.exists) profiles.set(userId, snap.data());
    })
  );

  return profiles;
}

async function handler() {
  const db = getAdminDb();
  const dueDate = todayInTimeZone();
  const txSnapshot = await db.collection("transactions").where("date", "==", dueDate).get();

  const pendingTransactions = txSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((tx) => tx.type === "expense" && tx.status === "pending");

  if (pendingTransactions.length === 0) {
    return json(200, { dueDate, sent: 0, message: "Nenhuma conta pendente vencendo hoje." });
  }

  const ownerIds = new Set(pendingTransactions.map((tx) => tx.userId).filter(Boolean));
  const profiles = await loadUserProfiles(db, ownerIds);
  const recipients = new Map();

  for (const tx of pendingTransactions) {
    const owner = profiles.get(tx.userId);
    const recipientEmails = new Set([
      normalizeEmail(owner?.email),
      ...(Array.isArray(tx.sharedWith) ? tx.sharedWith.map(normalizeEmail) : []),
    ].filter(Boolean));

    for (const email of recipientEmails) {
      if (!recipients.has(email)) {
        recipients.set(email, {
          email,
          name: email === normalizeEmail(owner?.email) ? owner?.displayName : "",
          items: [],
        });
      }

      recipients.get(email).items.push({
        description: tx.description || "Conta sem descricao",
        amount: Number(tx.amount) || 0,
        paymentMethod: tx.paymentMethod || "",
        ownerName: owner?.displayName || "",
      });
    }
  }

  let sent = 0;
  let skipped = 0;
  const errors = [];

  for (const recipient of recipients.values()) {
    const logId = `${dueDate}_${recipient.email.replace(/[^a-z0-9._-]/gi, "_")}`;
    const logRef = db.collection("reminderLogs").doc(logId);
    const existingLog = await logRef.get();

    if (existingLog.exists) {
      skipped += 1;
      continue;
    }

    try {
      const body = buildEmailBody(recipient.items, dueDate);
      await sendEmail({
        toEmail: recipient.email,
        toName: recipient.name,
        dueDate,
        body,
      });

      await logRef.set({
        dueDate,
        recipient: recipient.email,
        count: body.count,
        total: body.total,
        sentAt: FieldValue.serverTimestamp(),
      });
      sent += 1;
    } catch (error) {
      console.error("[daily-due-reminders]", recipient.email, error);
      errors.push({
        recipient: recipient.email,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  return json(errors.length ? 207 : 200, {
    dueDate,
    pendingTransactions: pendingTransactions.length,
    recipients: recipients.size,
    sent,
    skipped,
    errors,
  });
}

export { handler };

export const config = {
  schedule: "0 10 * * *",
};
