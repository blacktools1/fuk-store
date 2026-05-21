/**
 * Catálogo de provedores PIX do checkout (admin).
 * Para escalar: adicione entradas aqui; a UI filtra por busca e usa lista rolável.
 */

export type PixProviderCatalogEntry = {
  id: string;
  name: string;
  /** Uma linha curta — aparece na lista */
  description: string;
  available: boolean;
  /** Texto curto para o painel (ex.: Basic Auth, X-API-Key) */
  authType: string;
  /** Host da API sem protocolo */
  apiHost: string;
};

/** Ordem alfabética por nome (fácil de escanear com muitos itens). */
export const PIX_PROVIDER_CATALOG: PixProviderCatalogEntry[] = [
  {
    id: "asaas",
    name: "Asaas",
    description: "Cobrança PIX dinâmica (API v3).",
    available: true,
    authType: "access_token (header)",
    apiHost: "api.asaas.com / api-sandbox.asaas.com",
  },
  { id: "mercadopago", name: "Mercado Pago", description: "PIX e outros métodos.", available: false, authType: "—", apiHost: "—" },
  { id: "orama", name: "OramaPay", description: "PIX API REST.", available: true, authType: "Basic Auth", apiHost: "api.oramapay.com" },
  { id: "pagseguro", name: "PagSeguro", description: "PIX PagBank.", available: false, authType: "—", apiHost: "—" },
  { id: "paradise", name: "Paradise Pags", description: "PIX com confirmação imediata.", available: true, authType: "X-API-Key", apiHost: "multi.paradisepags.com" },
  {
    id: "skalepay",
    name: "Skale Pay",
    description: "PIX via API REST (transações).",
    available: true,
    authType: "Basic Auth (Secret + Token)",
    apiHost: "api.conta.skalepay.com.br",
  },
].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

export function getPixProviderEntry(id: string): PixProviderCatalogEntry | undefined {
  return PIX_PROVIDER_CATALOG.find((p) => p.id === id);
}
