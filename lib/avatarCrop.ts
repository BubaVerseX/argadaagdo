// Math for the round photo crop: a square viewport of `view` px, the photo
// drawn at its top-left corner (x, y) and scaled so that it always covers the
// viewport. Pure functions (no imports) so Node tests can load them.

export const AVATAR_MIN_ZOOM = 1;
export const AVATAR_MAX_ZOOM = 4;

export type CropState = { zoom: number; x: number; y: number };
export type CropImage = { width: number; height: number };

export function cropScale(image: CropImage, view: number, zoom: number) {
  return (view / Math.min(image.width, image.height)) * zoom;
}

function clampZoom(zoom: number) {
  return Math.min(AVATAR_MAX_ZOOM, Math.max(AVATAR_MIN_ZOOM, zoom));
}

/** Keeps the photo covering the whole viewport. */
export function clampCrop(state: CropState, image: CropImage, view: number): CropState {
  const zoom = clampZoom(state.zoom);
  const scale = cropScale(image, view, zoom);
  const minX = view - image.width * scale;
  const minY = view - image.height * scale;
  return {
    zoom,
    x: Math.min(0, Math.max(minX, state.x)),
    y: Math.min(0, Math.max(minY, state.y)),
  };
}

/** Photo centred and just covering the viewport. */
export function initialCrop(image: CropImage, view: number): CropState {
  const scale = cropScale(image, view, 1);
  return {
    zoom: 1,
    x: (view - image.width * scale) / 2,
    y: (view - image.height * scale) / 2,
  };
}

/** Zooms keeping the point (px, py) of the viewport still. */
export function zoomCrop(
  state: CropState,
  image: CropImage,
  view: number,
  zoom: number,
  px = view / 2,
  py = view / 2
): CropState {
  const before = cropScale(image, view, state.zoom);
  const next = clampZoom(zoom);
  const after = cropScale(image, view, next);
  const imageX = (px - state.x) / before;
  const imageY = (py - state.y) / before;
  return clampCrop({ zoom: next, x: px - imageX * after, y: py - imageY * after }, image, view);
}

/** The square of the source photo that the viewport shows. */
export function cropSourceRect(state: CropState, image: CropImage, view: number) {
  const scale = cropScale(image, view, state.zoom);
  // "+ 0" turns -0 into 0.
  return { sx: -state.x / scale + 0, sy: -state.y / scale + 0, size: view / scale };
}
