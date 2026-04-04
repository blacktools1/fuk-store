/** Cliente TypeScript para a Paradise Pags API */

const PARADISE_BASE = "https://multi.paradisepags.com/api/v1";

export interface ParadiseCustomer {
  name: string;
  email: string;
  phone: string;
  document: string;
}

export interface CreatePaymentResult {
  transactionId: string;
  qrCodeBase64: string;
  copyPaste: string;
}

export async function createParadisePayment(params: {
  apiKey: string;
  amountInCents: number;
  description: string;
  reference: string;
  webhookUrl: string;
  customer: ParadiseCustomer;
}): Promise<CreatePaymentResult> {
  const res = await fetch(`${PARADISE_BASE}/transaction.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": params.apiKey,
    },
    body: JSON.stringify({
      amount: params.amountInCents,
      description: params.description,
      reference: params.reference,
      postback_url: params.webhookUrl,
      source: "api_externa",
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        phone: params.customer.phone,
        document: params.customer.document,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok || data.status === false) {
    throw new Error(data.message || "Erro ao criar transação Paradise");
  }
  if (!data.id) {
    throw new Error("Paradise: resposta sem ID. " + JSON.stringify(data));
  }

  return {
    transactionId: String(data.id),
    qrCodeBase64: data.qrcode?.image || data.qr_code_base64 || "",
    copyPaste: data.qrcode?.copy_paste || data.qr_code || "",
  };
}

export interface ParadiseStatusResult {
  status: string;
  paid: boolean;
  amountInCents: number;
}

export async function checkParadiseStatus(params: {
  apiKey: string;
  transactionId: string;
}): Promise<ParadiseStatusResult> {
  const res = await fetch(
    `${PARADISE_BASE}/query.php?action=get_transaction&id=${encodeURIComponent(params.transactionId)}`,
    { headers: { "X-API-Key": params.apiKey } }
  );

  const data = await res.json();
  const status = String(data.status ?? "pending").toLowerCase();
  const paid = status === "paid" || status === "approved";

  return {
    status,
    paid,
    amountInCents: data.amount ?? 0,
  };
}
