/**
 * DANA SNAP BI Integration Library
 * 
 * Handles all cryptographic operations, token management, and API calls
 * for DANA QRIS Acquirer - Merchant Presented Mode (MPM).
 * 
 * SECURITY: This module runs EXCLUSIVELY server-side in Next.js API routes.
 * Private keys and secrets NEVER leave the backend.
 */

import crypto from "crypto";

// ── Environment validation ──────────────────────────────────────────────
const DANA_BASE_URL = process.env.DANA_BASE_URL;
const DANA_CLIENT_ID = process.env.DANA_CLIENT_ID;
const DANA_CLIENT_SECRET = process.env.DANA_CLIENT_SECRET;
const DANA_PRIVATE_KEY = process.env.DANA_PRIVATE_KEY;
const DANA_PUBLIC_KEY = process.env.DANA_PUBLIC_KEY;
const DANA_MERCHANT_ID = process.env.DANA_MERCHANT_ID;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env: ${name}. Check .env.local`);
  return value;
}

// ── PEM Key Formatters ──────────────────────────────────────────────────
function formatPrivateKey(raw: string): string {
  if (raw.includes("-----BEGIN")) return raw;
  const chunks = raw.match(/.{1,64}/g) || [];
  return `-----BEGIN PRIVATE KEY-----\n${chunks.join("\n")}\n-----END PRIVATE KEY-----`;
}

function formatPublicKey(raw: string): string {
  if (raw.includes("-----BEGIN")) return raw;
  const chunks = raw.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${chunks.join("\n")}\n-----END PUBLIC KEY-----`;
}

// ── Timestamp Helper ────────────────────────────────────────────────────
export function getTimestamp(): string {
  // SNAP BI requires ISO 8601 with +07:00 timezone
  const now = new Date();
  const offset = 7 * 60; // GMT+7
  const local = new Date(now.getTime() + (offset + now.getTimezoneOffset()) * 60000);
  const yyyy = local.getFullYear();
  const MM = String(local.getMonth() + 1).padStart(2, "0");
  const dd = String(local.getDate()).padStart(2, "0");
  const hh = String(local.getHours()).padStart(2, "0");
  const mm = String(local.getMinutes()).padStart(2, "0");
  const ss = String(local.getSeconds()).padStart(2, "0");
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}+07:00`;
}

// ── Asymmetric Signature (SHA256withRSA) for B2B Token ──────────────────
function createAsymmetricSignature(stringToSign: string): string {
  const privateKey = formatPrivateKey(requireEnv("DANA_PRIVATE_KEY", DANA_PRIVATE_KEY));
  const sign = crypto.createSign("SHA256");
  sign.update(stringToSign);
  sign.end();
  return sign.sign(privateKey, "base64");
}

// ── Symmetric Signature (HMAC-SHA512) for Transactional APIs ────────────
function createSymmetricSignature(
  httpMethod: string,
  relativePath: string,
  accessToken: string,
  requestBody: string,
  timestamp: string
): string {
  const secret = requireEnv("DANA_CLIENT_SECRET", DANA_CLIENT_SECRET);
  // Step 1: SHA-256 hash of minified request body (lowercase hex)
  const bodyHash = crypto.createHash("sha256").update(requestBody).digest("hex").toLowerCase();
  // Step 2: Compose string to sign
  const stringToSign = `${httpMethod}:${relativePath}:${accessToken}:${bodyHash}:${timestamp}`;
  // Step 3: HMAC-SHA512
  const hmac = crypto.createHmac("sha512", secret);
  hmac.update(stringToSign);
  return hmac.digest("base64");
}

// ── Verify Incoming Webhook Signature (from DANA server) ────────────────
export function verifyWebhookSignature(
  httpMethod: string,
  relativePath: string,
  accessToken: string,
  requestBody: string,
  timestamp: string,
  incomingSignature: string
): boolean {
  try {
    const expected = createSymmetricSignature(httpMethod, relativePath, accessToken, requestBody, timestamp);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(incomingSignature));
  } catch {
    return false;
  }
}

// ── B2B Access Token Cache ──────────────────────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s safety margin)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const baseUrl = requireEnv("DANA_BASE_URL", DANA_BASE_URL);
  const clientId = requireEnv("DANA_CLIENT_ID", DANA_CLIENT_ID);
  const timestamp = getTimestamp();

  // StringToSign for B2B token: clientId + "|" + timestamp
  const stringToSign = `${clientId}|${timestamp}`;
  const signature = createAsymmetricSignature(stringToSign);

  const url = `${baseUrl}/v1.0/access-token/b2b`;
  const body = JSON.stringify({ grantType: "client_credentials" });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TIMESTAMP": timestamp,
      "X-CLIENT-KEY": clientId,
      "X-SIGNATURE": signature,
    },
    body,
  });

  const data = await res.json();

  if (!res.ok || !data.accessToken) {
    console.error("[DANA] B2B token error:", JSON.stringify(data));
    throw new Error(`DANA token failed: ${data.responseMessage || res.status}`);
  }

  // Cache token (DANA tokens typically expire in 900s = 15 min)
  const ttlMs = (data.expiresIn || 900) * 1000;
  cachedToken = {
    token: data.accessToken,
    expiresAt: Date.now() + ttlMs,
  };

  return data.accessToken;
}

// ── Generate QRIS MPM ──────────────────────────────────────────────────
export interface QrisGenerateParams {
  partnerReferenceNo: string; // Max 25 chars, unique per transaction
  amount: number;             // Amount in IDR (integer, e.g. 10000)
}

export interface QrisGenerateResult {
  qrContent: string;          // Raw QRIS string to render as QR image
  referenceNo: string;        // DANA's reference number
  partnerReferenceNo: string;
}

export async function generateQris(params: QrisGenerateParams): Promise<QrisGenerateResult> {
  const baseUrl = requireEnv("DANA_BASE_URL", DANA_BASE_URL);
  const clientId = requireEnv("DANA_CLIENT_ID", DANA_CLIENT_ID);
  const merchantId = requireEnv("DANA_MERCHANT_ID", DANA_MERCHANT_ID);
  const accessToken = await getAccessToken();
  const timestamp = getTimestamp();
  const externalId = crypto.randomUUID().replace(/-/g, "").slice(0, 32);

  const relativePath = "/v1.0/qr/qr-mpm-generate.htm";
  const requestBody = JSON.stringify({
    partnerReferenceNo: params.partnerReferenceNo,
    amount: {
      value: `${params.amount}.00`,
      currency: "IDR",
    },
    merchantId,
    terminalId: "GC-NET-01",
  });

  const signature = createSymmetricSignature("POST", relativePath, accessToken, requestBody, timestamp);

  const url = `${baseUrl}${relativePath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "X-TIMESTAMP": timestamp,
      "X-SIGNATURE": signature,
      "X-PARTNER-ID": clientId,
      "X-EXTERNAL-ID": externalId,
      "CHANNEL-ID": "95221",
    },
    body: requestBody,
  });

  const data = await res.json();

  if (!res.ok || data.responseCode !== "2004700") {
    console.error("[DANA] QRIS generate error:", JSON.stringify(data));
    throw new Error(`DANA QRIS generate failed: ${data.responseMessage || res.status}`);
  }

  return {
    qrContent: data.qrContent,
    referenceNo: data.referenceNo || "",
    partnerReferenceNo: params.partnerReferenceNo,
  };
}

// ── Query Payment Status ────────────────────────────────────────────────
export interface QueryPaymentResult {
  paid: boolean;
  responseCode: string;
  transactionStatus: string;
  amount?: number;
}

export async function queryPaymentStatus(
  originalPartnerReferenceNo: string,
  originalReferenceNo: string,
  serviceCode: string = "47"
): Promise<QueryPaymentResult> {
  const baseUrl = requireEnv("DANA_BASE_URL", DANA_BASE_URL);
  const clientId = requireEnv("DANA_CLIENT_ID", DANA_CLIENT_ID);
  const merchantId = requireEnv("DANA_MERCHANT_ID", DANA_MERCHANT_ID);
  const accessToken = await getAccessToken();
  const timestamp = getTimestamp();
  const externalId = crypto.randomUUID().replace(/-/g, "").slice(0, 32);

  const relativePath = "/v1.0/qr/qr-mpm-query.htm";
  const requestBody = JSON.stringify({
    originalPartnerReferenceNo,
    originalReferenceNo,
    merchantId,
    serviceCode,
  });

  const signature = createSymmetricSignature("POST", relativePath, accessToken, requestBody, timestamp);

  const url = `${baseUrl}${relativePath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "X-TIMESTAMP": timestamp,
      "X-SIGNATURE": signature,
      "X-PARTNER-ID": clientId,
      "X-EXTERNAL-ID": externalId,
      "CHANNEL-ID": "95221",
    },
    body: requestBody,
  });

  const data = await res.json();

  // Transaction status codes from DANA: 00 = Success, 06 = Pending
  const transactionStatus = data.latestTransactionStatus?.transactionStatusDesc || data.transactionStatusDesc || "UNKNOWN";
  const isPaid = data.responseCode === "2005100" && transactionStatus.toUpperCase().includes("SUCCESS");

  return {
    paid: isPaid,
    responseCode: data.responseCode || "",
    transactionStatus,
    amount: data.amount ? parseFloat(data.amount.value) : undefined,
  };
}

// ── Format Amount for Display ───────────────────────────────────────────
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}
