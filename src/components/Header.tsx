import Link from "next/link";
import { headers } from "next/headers";
import { readStoreData } from "@/lib/store-data";
import HeaderActions from "./HeaderActions";

export default async function Header() {
  headers(); // Force dynamic render — never serve cached version
  const store = readStoreData();

  const mode     = store.logoDisplay  ?? "image-text";
  const size     = store.logoSize     ?? 36;
  const position = store.logoPosition ?? "left";

  const showImage = (mode === "image-text" || mode === "image-only") && !!store.logoUrl;
  const showText  =  mode === "image-text" || mode === "text-only";

  const sticky = store.stickyHeader !== false;

  return (
    <header className={`header${sticky ? " header--sticky" : ""}`}>
      <div className={`container header-inner header-inner--logo-${position}`}>
        <Link href="/" className="header-logo">
          {showImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt={store.storeName} style={{ width: size, height: size }} />
          )}
          {!showImage && store.storeLogo && (
            <span dangerouslySetInnerHTML={{ __html: store.storeLogo }} />
          )}
          {showText && <span className="header-logo-text">{store.storeName}</span>}
        </Link>

        <HeaderActions />
      </div>
    </header>
  );
}
