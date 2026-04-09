/**
 * Catálogo de provedores PIX do checkout (admin).
 * Para escalar: adicione entradas aqui; a UI filtra por busca e usa lista rolável.
 */

export type PixProviderCatalogEntry = {
  id: string;
  name: string;
  /** Uma linha curta — aparece na lista e no resumo */
  description: string;
  available: boolean;
};

/** Ordem alfabética por nome (fácil de escanear com muitos itens). */
export const PIX_PROVIDER_CATALOG: PixProviderCatalogEntry[] = [
  { id: "asaas", name: "Asaas", description: "Cobranças e gateway completo.", available: false },
  { id: "mercadopago", name: "Mercado Pago", description: "PIX e outros métodos.", available: false },
  { id: "orama", name: "OramaPay", description: "PIX via API REST (Basic Auth).", available: true },
  { id: "pagseguro", name: "PagSeguro", description: "PIX PagBank.", available: false },
  { id: "paradise", name: "Paradise Pags", description: "PIX com confirmação imediata.", available: true },
].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

export function getPixProviderEntry(id: string): PixProviderCatalogEntry | undefined {
  return PIX_PROVIDER_CATALOG.find((p) => p.id === id);
}
