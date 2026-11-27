import { ImageResponse } from "next/og";

export const alt = "Paulo de Tarso Advocacia, Direito Agrário em Piracanjuba e região";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImagemCompartilhamento() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#283b2d", color: "#fbfaf6", padding: "70px 78px", flexDirection: "column", justifyContent: "space-between", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 29, letterSpacing: 1 }}>Paulo de Tarso</span><span style={{ fontSize: 15, letterSpacing: 5, marginTop: 8, color: "#c5d2be" }}>ADVOCACIA</span></div>
        <span style={{ fontSize: 21, color: "#c5d2be" }}>OAB/GO 44.630</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 21, color: "#c5d2be", letterSpacing: 3, marginBottom: 24 }}>DIREITO AGRÁRIO EM GOIÁS</span>
        <span style={{ fontSize: 65, lineHeight: 1.15, maxWidth: 1000 }}>Advogado agrário em Piracanjuba e região</span>
        <span style={{ fontSize: 23, marginTop: 28, color: "#dce8d8" }}>Contratos rurais · Regularização · Posse e usucapião</span>
      </div>
      <div style={{ display: "flex", borderTop: "1px solid #8da58b", paddingTop: 24, fontSize: 19, color: "#dce8d8" }}>Piracanjuba · Professor Jamil · Goiânia · Morrinhos · Caldas Novas</div>
    </div>,
    size,
  );
}
