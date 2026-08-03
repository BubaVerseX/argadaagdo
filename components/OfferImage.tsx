"use client";

import { ShoppingBagIcon } from "@/components/icons";
import Image from "next/image";
import { useState } from "react";

type OfferImageProps = {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
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
  priority = false,
}: OfferImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src || !isAllowedOfferImage(src)) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-[#f4efe4]"
        aria-label={`${alt} image unavailable`}
      >
        <ShoppingBagIcon className="h-10 w-10 text-[#8a8072] sm:h-14 sm:w-14" strokeWidth={1.6} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
      onError={() => setFailedSrc(src)}
    />
  );
}
