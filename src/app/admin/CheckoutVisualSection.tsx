"use client";

import { useRef, type ChangeEvent } from "react";

export type CheckoutVisualSlot = "top" | "mid" | "footer";

export type CheckoutVisualValues = {
  topImage: string;
  topSquare: boolean;
  midImage: string;
  midSquare: boolean;
  footerImage: string;
  footerSquare: boolean;
};

const SLOTS: {
  id: CheckoutVisualSlot;
  tab: string;
  title: string;
  hint: string;
  mockLabel: string;
}[] = [
  {
    id: "top",
    tab: "Topo",
    title: "Banner do topo",
    hint: "Primeira imagem que o cliente vê ao abrir o checkout.",
    mockLabel: "Topo",
  },
  {
    id: "mid",
    tab: "Meio",
    title: "Banner do meio",
    hint: "Após identificação e frete, antes das ofertas e do resumo.",
    mockLabel: "Meio",
  },
  {
    id: "footer",
    tab: "Rodapé",
    title: "Banner do rodapé",
    hint: "Acima da linha «Ambiente seguro», no final da página.",
    mockLabel: "Rodapé",
  },
];

function slotImage(values: CheckoutVisualValues, slot: CheckoutVisualSlot): string {
  if (slot === "top") return values.topImage.trim();
  if (slot === "mid") return values.midImage.trim();
  return values.footerImage.trim();
}

function slotSquare(values: CheckoutVisualValues, slot: CheckoutVisualSlot): boolean {
  if (slot === "top") return values.topSquare;
  if (slot === "mid") return values.midSquare;
  return values.footerSquare;
}

function MiniPromoBlock({
  src,
  square,
  label,
  active,
  empty,
  onClick,
}: {
  src: string;
  square: boolean;
  label: string;
  active: boolean;
  empty: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`admin-co-preview-slot${active ? " admin-co-preview-slot--active" : ""}${empty ? " admin-co-preview-slot--empty" : ""}`}
      onClick={onClick}
      aria-label={`Editar banner: ${label}`}
      aria-pressed={active}
    >
      <span className="admin-co-preview-slot-tag">{label}</span>
      {src ? (
        <span
          className={`admin-co-preview-slot-img${square ? " admin-co-preview-slot-img--square" : " admin-co-preview-slot-img--banner"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" />
        </span>
      ) : (
        <span className="admin-co-preview-slot-placeholder">
          <span className="admin-co-preview-slot-plus">+</span>
          <span>Clique para adicionar</span>
        </span>
      )}
    </button>
  );
}

type Props = {
  values: CheckoutVisualValues;
  activeSlot: CheckoutVisualSlot;
  onActiveSlot: (slot: CheckoutVisualSlot) => void;
  onPatch: (patch: Partial<CheckoutVisualValues>) => void;
  onUpload: (slot: CheckoutVisualSlot, e: ChangeEvent<HTMLInputElement>) => void;
  checkoutUrl?: string;
};

export function CheckoutVisualSection({
  values,
  activeSlot,
  onActiveSlot,
  onPatch,
  onUpload,
  checkoutUrl = "/checkout",
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const configuredCount = SLOTS.filter((s) => slotImage(values, s.id)).length;
  const meta = SLOTS.find((s) => s.id === activeSlot)!;

  const focusSlot = (slot: CheckoutVisualSlot) => {
    onActiveSlot(slot);
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const imageKey =
    activeSlot === "top" ? "topImage" : activeSlot === "mid" ? "midImage" : "footerImage";
  const squareKey =
    activeSlot === "top" ? "topSquare" : activeSlot === "mid" ? "midSquare" : "footerSquare";
  const currentImage = values[imageKey];
  const currentSquare = values[squareKey];

  const clearSlot = () => {
    onPatch({ [imageKey]: "" } as Partial<CheckoutVisualValues>);
  };

  return (
    <div className="admin-card admin-co-visual" id="admin-section-checkout-visual">
      <header className="admin-co-visual-header">
        <div>
          <h2 className="admin-card-title" style={{ marginBottom: 6 }}>
            Banners no checkout
          </h2>
          <p className="admin-co-visual-lead">
            Adicione até 3 imagens promocionais na página de pagamento. Clique na prévia ou nas abas
            para escolher a posição — as alterações aparecem ao vivo na miniatura.
          </p>
        </div>
        <div className="admin-co-visual-badges">
          <span
            className={`admin-co-visual-count${configuredCount > 0 ? " admin-co-visual-count--on" : ""}`}
          >
            {configuredCount}/3 ativos
          </span>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-secondary admin-co-visual-open"
          >
            Abrir checkout ↗
          </a>
        </div>
      </header>

      <div className="admin-co-visual-layout">
        <div className="admin-co-preview-wrap">
          <p className="admin-co-preview-label">Prévia da página</p>
          <div className="admin-co-preview-phone" aria-hidden>
            <div className="admin-co-preview-header">PAGAMENTO 100% SEGURO</div>
            <div className="admin-co-preview-body">
              <MiniPromoBlock
                src={values.topImage}
                square={values.topSquare}
                label="Topo"
                active={activeSlot === "top"}
                empty={!values.topImage.trim()}
                onClick={() => focusSlot("top")}
              />
              <div className="admin-co-preview-block admin-co-preview-block--dim">
                <span className="admin-co-preview-block-title">Identificação</span>
                <span className="admin-co-preview-line" />
                <span className="admin-co-preview-line admin-co-preview-line--short" />
              </div>
              <div className="admin-co-preview-block admin-co-preview-block--dim">
                <span className="admin-co-preview-block-title">Frete</span>
                <span className="admin-co-preview-line" />
              </div>
              <MiniPromoBlock
                src={values.midImage}
                square={values.midSquare}
                label="Meio"
                active={activeSlot === "mid"}
                empty={!values.midImage.trim()}
                onClick={() => focusSlot("mid")}
              />
              <div className="admin-co-preview-block admin-co-preview-block--dim">
                <span className="admin-co-preview-block-title">Ofertas · Resumo · PIX</span>
                <span className="admin-co-preview-line" />
                <span className="admin-co-preview-line" />
                <span className="admin-co-preview-pix">Gerar PIX</span>
              </div>
              <MiniPromoBlock
                src={values.footerImage}
                square={values.footerSquare}
                label="Rodapé"
                active={activeSlot === "footer"}
                empty={!values.footerImage.trim()}
                onClick={() => focusSlot("footer")}
              />
              <div className="admin-co-preview-secure">© Ambiente seguro</div>
            </div>
          </div>
        </div>

        <div className="admin-co-editor" ref={editorRef}>
          <div className="admin-co-tabs" role="tablist" aria-label="Posição do banner">
            {SLOTS.map((s) => {
              const has = !!slotImage(values, s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSlot === s.id}
                  className={`admin-co-tab${activeSlot === s.id ? " admin-co-tab--active" : ""}`}
                  onClick={() => onActiveSlot(s.id)}
                >
                  {s.tab}
                  <span
                    className={`admin-co-tab-dot${has ? " admin-co-tab-dot--on" : ""}`}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>

          <div className="admin-co-editor-panel" role="tabpanel">
            <h3 className="admin-co-editor-title">{meta.title}</h3>
            <p className="admin-co-editor-hint">{meta.hint}</p>

            <div className="admin-co-format-toggle">
              <button
                type="button"
                className={`admin-co-format-btn${!currentSquare ? " admin-co-format-btn--active" : ""}`}
                onClick={() => onPatch({ [squareKey]: false } as Partial<CheckoutVisualValues>)}
              >
                <span className="admin-co-format-icon admin-co-format-icon--banner" aria-hidden />
                Faixa larga
              </button>
              <button
                type="button"
                className={`admin-co-format-btn${currentSquare ? " admin-co-format-btn--active" : ""}`}
                onClick={() => onPatch({ [squareKey]: true } as Partial<CheckoutVisualValues>)}
              >
                <span className="admin-co-format-icon admin-co-format-icon--square" aria-hidden />
                Quadrado 1:1
              </button>
            </div>

            {currentImage.trim() ? (
              <div className="admin-co-editor-preview">
                <figure
                  className={`admin-co-editor-figure${currentSquare ? " admin-co-editor-figure--square" : " admin-co-editor-figure--banner"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentImage.trim()} alt="Prévia do banner" />
                </figure>
                <button type="button" className="admin-co-remove" onClick={clearSlot}>
                  Remover imagem
                </button>
              </div>
            ) : (
              <label className="admin-co-dropzone">
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => onUpload(activeSlot, e)}
                />
                <span className="admin-co-dropzone-icon">↑</span>
                <span className="admin-co-dropzone-title">Enviar imagem</span>
                <span className="admin-co-dropzone-sub">PNG, JPG ou WebP</span>
              </label>
            )}

            <div className="admin-co-url-row">
              <label className="admin-form-label" htmlFor={`admin-co-url-${activeSlot}`}>
                URL da imagem
              </label>
              <div className="admin-co-url-actions">
                <input
                  id={`admin-co-url-${activeSlot}`}
                  className="admin-form-input"
                  placeholder="https://… ou /api/uploads/…"
                  value={currentImage}
                  onChange={(e) =>
                    onPatch({ [imageKey]: e.target.value } as Partial<CheckoutVisualValues>)
                  }
                />
                <label className="admin-btn admin-btn-secondary admin-co-upload-btn">
                  Trocar
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => onUpload(activeSlot, e)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
