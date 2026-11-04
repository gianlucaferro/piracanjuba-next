import { AdminBodyTooLargeError, readAdminActionBody } from "./admin-session-auth.ts";

export const MAX_PHOTO_BYTES = 524_288;
export const FARMACIA_NAMES = [
  "Drogaria Bem Estar", "Drogaria do Povo", "Drogaria Nacional",
  "Drogaria São José", "Drogaria São Sebastião", "Drogaria Santa Luzia",
  "Drogamais", "Droganova", "Drogaria Central", "Drogaria Preço Popular",
  "Drogaria Marina", "Farma Vidda", "Drogaria JM Popular", "Drogaria Machado",
  "Drogaria Oriental", "Drogaria São Pedro", "Drogaria Aliança", "Drogaria Do Lar",
  "Drogaria Santa Rita", "Drogaria Piracanjuba",
] as const;

export function farmaciaPhotoPath(nome: string): string {
  return `${nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.webp`;
}

/** Inspeciona container e dimensoes, sem confiar no MIME declarado pelo cliente. */
export function decodeFarmaciaWebP(base64: unknown): Uint8Array {
  if (typeof base64 !== "string" || base64.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4 ||
    base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error("Imagem WebP inválida ou maior que 512 KB.");
  }
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const text = (offset: number, size: number) => new TextDecoder().decode(bytes.subarray(offset, offset + size));
  const fail = () => { throw new Error("Envie uma imagem WebP estática de até 540 px de largura e 2160 px de altura."); };
  if (bytes.length < 26 || bytes.length > MAX_PHOTO_BYTES || text(0, 4) !== "RIFF" ||
    text(8, 4) !== "WEBP" || view.getUint32(4, true) + 8 !== bytes.length) return fail();
  let dimensions: [number, number] | undefined;
  let canvas: [number, number] | undefined;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const tag = text(offset, 4);
    const size = view.getUint32(offset + 4, true);
    const p = offset + 8;
    if (p + size + (size % 2) > bytes.length) return fail();
    if (tag === "ANIM" || tag === "ANMF") return fail();
    if (tag === "VP8X") {
      if (offset !== 12 || size !== 10 || (bytes[p] & 2) !== 0) return fail();
      canvas = [1 + bytes[p + 4] + (bytes[p + 5] << 8) + (bytes[p + 6] << 16),
        1 + bytes[p + 7] + (bytes[p + 8] << 8) + (bytes[p + 9] << 16)];
    }
    if (tag === "VP8 ") {
      if (dimensions || size < 10 || (bytes[p] & 1) !== 0 ||
        bytes[p + 3] !== 0x9d || bytes[p + 4] !== 1 || bytes[p + 5] !== 0x2a) return fail();
      dimensions = [view.getUint16(p + 6, true) & 0x3fff, view.getUint16(p + 8, true) & 0x3fff];
    }
    if (tag === "VP8L") {
      if (dimensions || size < 5 || bytes[p] !== 0x2f || (bytes[p + 4] & 0xe0) !== 0) return fail();
      const bits = view.getUint32(p + 1, true);
      dimensions = [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset = p + size + (size % 2);
  }
  if (offset !== bytes.length || !dimensions) return fail();
  if (canvas && (canvas[0] !== dimensions[0] || canvas[1] !== dimensions[1])) return fail();
  if (dimensions[0] < 1 || dimensions[0] > 540 || dimensions[1] < 1 || dimensions[1] > 2160) return fail();
  return bytes;
}

export interface FarmaciaAdminDependencies {
  authorize(token: unknown): Promise<boolean>;
  upload(nome: string, path: string, bytes: Uint8Array): Promise<void>;
  removePhoto(nome: string): Promise<void>;
  updatePhone(nome: string, telefone: string, tipo: "fixo" | "whatsapp"): Promise<void>;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export function createFarmaciaAdminHandler(deps: FarmaciaAdminDependencies) {
  return async (req: Request): Promise<Response> => {
    const respond = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: cors });
    if (req.method === "OPTIONS") return respond(200, {});
    if (req.method !== "POST") return respond(405, { error: "Método não permitido." });
    let body: Record<string, unknown>;
    try {
      body = await readAdminActionBody(req, 710_000);
    } catch (error) {
      return respond(error instanceof AdminBodyTooLargeError ? 413 : 400, { error: "Corpo inválido ou maior que o limite permitido." });
    }
    let authorized = false;
    try { authorized = await deps.authorize(body.admin_token); } catch { /* Falha fechada. */ }
    if (!authorized) return respond(401, { error: "Sessão expirada. Entre novamente no painel." });
    const { nome, action } = body;
    if (typeof nome !== "string" || !FARMACIA_NAMES.some((n) => n === nome)) {
      return respond(400, { error: "Farmácia inválida." });
    }
    let image: Uint8Array | undefined;
    if (action === "upload") {
      try { image = decodeFarmaciaWebP(body.image_base64); } catch (error) {
        return respond(400, { error: error instanceof Error ? error.message : "Imagem inválida." });
      }
    } else if (action === "update_phone") {
      if (typeof body.telefone !== "string" || body.telefone.length > 24 ||
        !/^[\d\s()+-]*$/.test(body.telefone) ||
        (body.telefone.trim() !== "" && ![10, 11, 12, 13].includes(body.telefone.replace(/\D/g, "").length))) {
        return respond(400, { error: "Telefone inválido." });
      }
    } else if (action !== "remove_photo") {
      return respond(400, { error: "Ação inválida." });
    }
    try {
      if (image) await deps.upload(nome, farmaciaPhotoPath(nome), image);
      else if (action === "remove_photo") await deps.removePhoto(nome);
      else {
        const telefone = (body.telefone as string).trim();
        await deps.updatePhone(nome, telefone, telefone.includes("3405") ? "fixo" : "whatsapp");
      }
      return respond(200, { success: true });
    } catch {
      // Nao devolver erros de Storage/SQL, tokens ou dados de sessao.
      return respond(503, { error: "Não foi possível salvar a alteração. Tente novamente." });
    }
  };
}
