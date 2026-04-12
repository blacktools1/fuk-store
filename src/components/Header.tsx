import Link from "next/link";
import Image from "next/image";
import { readStoreData } from "@/lib/store-data";
import { getTenant } from "@/lib/tenant";
import { STORE_IMAGE_QUALITY } from "@/lib/store-image";
import HeaderActions from "./HeaderActions";

export default async function Header() {
  const tenant = await getTenant();
  const store = readStoreData(tenant);

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
          {showImage && store.logoUrl && (
            <Image
              src={store.logoUrl}
              alt={store.storeName}
              width={size}
              height={size}
              quality={STORE_IMAGE_QUALITY}
              style={{ width: size, height: size, objectFit: "contain" }}
            />
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
