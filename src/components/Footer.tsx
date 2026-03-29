import type { StoreData } from "@/lib/admin-types";

function IconTruck() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v4h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.13 1 .37 1.97.72 2.91a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.16 6.16l1.04-.96a2 2 0 0 1 2.11-.45c.94.35 1.91.59 2.91.72A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export default function Footer({ store }: { store: StoreData }) {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      {/* ── Faixa de benefícios ── */}
      <div className="footer-benefits">
        <div className="container">
          <div className="footer-benefits-grid">
            <div className="footer-benefit">
              <IconTruck />
              <span>FRETE EXPRESSO</span>
            </div>
            <div className="footer-benefit">
              <IconCard />
              <span>PARCELAMENTO<br />EM ATÉ 12X</span>
            </div>
            <div className="footer-benefit">
              <IconTag />
              <span>ATÉ 15% DE DESCONTO<br />NO PIX</span>
            </div>
            <div className="footer-benefit">
              <IconPhone />
              <span>ATENDIMENTO<br />24 HORAS</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Colunas de links ── */}
      <div className="footer-main">
        <div className="container">
          <div className="footer-cols">
            <div className="footer-col">
              <h4 className="footer-col-title">Institucional</h4>
              <ul className="footer-links">
                <li><a href="#">Aviso Legal</a></li>
                <li><a href="#">Termos e Serviços</a></li>
                <li><a href="#">Informações de contato</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Ajuda</h4>
              <ul className="footer-links">
                <li><a href="#">Políticas de Envio</a></li>
                <li><a href="#">Política de Privacidade</a></li>
                <li><a href="#">Políticas de Reembolso</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Código de Rastreio</h4>
              <ul className="footer-links">
                <li><a href="#">Rastrear Pedido</a></li>
                <li><a href="#">Ver como rastrear</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">SAC</h4>
              <p className="footer-sac-line">
                <strong>Atendimento:</strong> Seg. à Sáb. 07 às 22h
              </p>
              <p className="footer-sac-line">
                <strong>Email:</strong><br />
                <a href={`mailto:contato@${store.storeName.toLowerCase().replace(/\s+/g, "")}.com`}>
                  contato@{store.storeName.toLowerCase().replace(/\s+/g, "")}.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rodapé final ── */}
      <div className="footer-bottom">
        <div className="container">
          <p>© {year} {store.storeName} | Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
