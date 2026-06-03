"use client";

import Image from "next/image";
import { useState } from "react";

type OfferImageProps = {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
};

function isAllowedOfferImage(src: string) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!projectUrl) return false;

  try {
    const imageUrl = new URL(src);
    const supabaseUrl = new URL(projectUrl);

    return (
      imageUrl.origin === supabaseUrl.origin &&
      imageUrl.pathname.startsWith("/storage/v1/object/public/offer-images/")
    );
  } catch {
    return false;
  }
}

export default function OfferImage({
  src,
  alt,
  sizes,
  className = "",
}: OfferImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src || !isAllowedOfferImage(src)) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-100 to-yellow-100 text-5xl sm:text-7xl"
        aria-label={`${alt} image unavailable`}
      >
        🥡
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={`object-cover ${className}`}
      onError={() => setFailedSrc(src)}
    />
  );
}
