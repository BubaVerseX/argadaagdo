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
          background: "#a67c52",
        }}
      >
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: 58,
            background: "#ece4d6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 64,
            fontWeight: 900,
            color: "#2e2a22",
          }}
        >
          AG
        </div>
      </div>
    ),
    { ...size }
  );
}
