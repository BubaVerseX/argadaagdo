"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, TouchEvent } from "react";

/**
 * Link for app screens. Next prefetches every visible link by default; on a
 * phone that was ~30 requests competing with the first screen. Here a route
 * is fetched when a finger touches the link, about 100 ms before the tap
 * lands, and the tab routes are prefetched once the app is idle (NativeShell).
 */
export default function AppLink({
  onTouchStart,
  prefetch = false,
  ...props
}: ComponentProps<typeof Link>) {
  const router = useRouter();

  return (
    <Link
      {...props}
      prefetch={prefetch}
      onTouchStart={(event: TouchEvent<HTMLAnchorElement>) => {
        if (typeof props.href === "string" && props.href.startsWith("/")) {
          router.prefetch(props.href);
        }
        onTouchStart?.(event);
      }}
    />
  );
}
