// What the app shell does before React runs. Capacitor injects window.Capacitor
// at document start (WKUserScript on iOS, addDocumentStartJavaScript or HTML
// injection on Android), so this script already knows it is in the app. In a
// normal browser the first check fails and nothing else here runs.

// Routes with their own app screen. `?full=1` keeps the full page reachable.
export const nativeScreenPattern =
  "^/($|discover$|map$|orders$|profile$|login$|settings$|notifications$|payment$|business/dashboard$|offers/\\d+$|checkout/\\d+$)";

export function isNativeScreenUrl(pathname: string, search: string) {
  return (
    new RegExp(nativeScreenPattern).test(pathname) &&
    !/[?&]full=1(&|$)/.test(search)
  );
}

// - native-app hides the website header and footer before first paint.
// - native-screen hides the server-rendered website page on app-screen routes.
// - The app is Georgian first; a language the user chose stays.
// - The home data request starts right away, in parallel with the JavaScript.
// - The app's fonts start downloading now instead of after the CSS is parsed,
//   so text paints once in the right font (app/fonts.css has the same URLs).
const nativeFonts = [
  "noto-sans-georgian-georgian-400",
  "noto-sans-georgian-georgian-700",
  "noto-serif-georgian-georgian-700",
  "noto-sans-latin-400",
  "noto-sans-latin-700",
  "noto-serif-latin-700",
].map((name) => `/fonts/v5/${name}-normal.woff2`);

export const nativeBootScript = `try{var c=window.Capacitor;if(c&&c.isNativePlatform&&c.isNativePlatform()){var h=document.documentElement,p=location.pathname;h.classList.add("native-app");${JSON.stringify(
  nativeFonts
)}.forEach(function(u){var l=document.createElement("link");l.rel="preload";l.as="font";l.type="font/woff2";l.crossOrigin="anonymous";l.href=u;document.head.appendChild(l)});if(new RegExp(${JSON.stringify(
  nativeScreenPattern
)}).test(p)&&!/[?&]full=1(&|$)/.test(location.search)){h.classList.add("native-screen");if(p==="/"||p==="/discover"){window.__nativeFeed=fetch("/api/native/feed").then(function(r){return r.ok?r.json():null}).catch(function(){return null})}}try{if(!localStorage.getItem("argadaagdo-language"))localStorage.setItem("argadaagdo-language","ka")}catch(e){}}}catch(e){}`;
