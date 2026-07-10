import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1815",
        }}
      >
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: 58,
            background: "#f2efe6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 64,
            fontWeight: 900,
            color: "#1a1815",
          }}
        >
          AG
        </div>
      </div>
    ),
    { ...size }
  );
}
