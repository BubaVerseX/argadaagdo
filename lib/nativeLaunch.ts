// The app's launch animation (docs/design-v3/first-screen.html, "Launch ·
// Rings + Line Leaf"): mint rings ripple out, one fine line draws the leaf
// (outline, midrib, six veins), a soft glow, then the name. About 2 seconds.
//
// It is added by the boot script (lib/nativeBoot.ts), before the app's
// JavaScript loads, so it starts on the same plain deep green as the native
// launch screen (#0F3A32): no flash. It plays once per app start
// (sessionStorage), the styles live in app/native.css (.native-launch-*), and
// "Reduce motion" shows the finished mark without movement.

/** The mark: rings and the detailed leaf, drawn with one fine line. */
export const LEAF_MARK_SVG =
  '<svg class="leaf-mark" viewBox="0 0 200 200" aria-hidden="true">' +
  // A gradient glow (a CSS blur gets clipped to a box). The leaf outline's
  // class is "edge": "outline" is a Tailwind utility that draws a box.
  '<defs><radialGradient id="leaf-mark-glow"><stop offset="0" stop-color="#b8e6c4"/><stop offset="1" stop-color="#b8e6c4" stop-opacity="0"/></radialGradient></defs>' +
  '<circle class="ln l1" cx="100" cy="100" r="40"/><circle class="ln l2" cx="100" cy="100" r="58"/>' +
  '<circle class="ln l3" cx="100" cy="100" r="76"/><circle class="ln l4" cx="100" cy="100" r="94"/>' +
  '<circle class="glow" cx="100" cy="100" r="70" fill="url(#leaf-mark-glow)"/>' +
  '<path class="fill" d="M66 140 C60 100 84 70 136 60 C142 108 112 138 70 142 Z"/>' +
  '<path class="edge" d="M66 140 C60 100 84 70 136 60 C142 108 112 138 70 142 Z"/>' +
  '<path class="rib" d="M69 141 C90 118 112 92 134 63"/>' +
  '<path class="v v1" d="M82 126 L77 108"/><path class="v v2" d="M94 112 L90 92"/><path class="v v3" d="M107 97 L105 78"/>' +
  '<path class="v v4" d="M85 124 L102 125"/><path class="v v5" d="M97 110 L116 108"/><path class="v v6" d="M110 95 L127 91"/>' +
  "</svg>";

/** How long the overlay stays (animation + fade out), in ms. */
export const LAUNCH_MS = 2700;

/**
 * Runs inside the boot script (native app only, `h` = <html>). Defines
 * window.__argLaunch, which the first script in <body> calls (app/layout.tsx)
 * so the overlay exists before anything else paints.
 */
export const launchBootSnippet = `try{if(!sessionStorage.getItem("argadaagdo-launched")){sessionStorage.setItem("argadaagdo-launched","1");h.classList.add("native-launch");var en=false;try{en=localStorage.getItem("argadaagdo-language")==="en"}catch(e){}window.__argLaunch=function(){if(window.__argLaunched||!document.body)return;window.__argLaunched=1;var d=document.createElement("div");d.className="native-launch-screen";d.setAttribute("aria-hidden","true");d.innerHTML=${JSON.stringify(
  LEAF_MARK_SVG
)}+'<p class="native-launch-name">'+(en?"ArGadaagdo":"არ გადააგდო")+"</p>";document.body.appendChild(d);setTimeout(function(){h.classList.remove("native-launch");if(d.parentNode)d.parentNode.removeChild(d)},${LAUNCH_MS})};document.addEventListener("DOMContentLoaded",window.__argLaunch)}}catch(e){}`;
