"use client";

import NativeHome from "./NativeHome";

// /map in the app is Nearby with the Map view open (the List/Map switch).
export default function NativeMap() {
  return <NativeHome initialView="map" />;
}
