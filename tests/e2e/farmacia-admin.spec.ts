import { expect, test } from "@playwright/test";
import { decodeFarmaciaWebP } from "../../supabase/functions/_shared/farmacia-admin";

test("admin envia WebP autenticado, altera telefone e remove apenas foto", async ({ page }) => {
  const nome = "Drogaria Bem Estar";
  const token = "a".repeat(64);
  const actions: Record<string, unknown>[] = [];
  const forbidden: string[] = [];
  const row = { id: "fixture", nome, foto_url: "", telefone: "(64) 3405-0000", tipo_telefone: "fixo" };
  await page.addInitScript((value) => localStorage.setItem("pba_admin_token", value), token);
  await page.route("http://127.0.0.1:4319/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path.endsWith("/admin-zap-read")) {
      const body = request.postDataJSON();
      return route.fulfill({ headers, json: body.action === "validate" ? { valid: true } : { pending: [], approved: [], rejected: [], suggestions: [] } });
    }
    if (path.endsWith("/admin-farmacia-update")) {
      const body = request.postDataJSON();
      actions.push(body);
      expect(body.admin_token).toBe(token);
      if (body.action === "upload") {
        expect(decodeFarmaciaWebP(body.image_base64).length).toBeGreaterThan(30);
        row.foto_url = "http://127.0.0.1:4319/storage/v1/object/public/farmacia-fotos/test.webp";
      }
      if (body.action === "update_phone") row.telefone = body.telefone;
      if (body.action === "remove_photo") row.foto_url = "";
      return route.fulfill({ headers, json: { success: true } });
    }
    if (!["GET", "HEAD"].includes(request.method())) forbidden.push(path);
    if (path.endsWith("/farmacia_fotos")) return route.fulfill({ headers, json: [row] });
    if (path.startsWith("/storage/")) return route.fulfill({ headers, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx1kAAAAASUVORK5CYII=", "base64") });
    return route.fulfill({ headers, json: [] });
  });
  await page.goto("/admin");
  await page.getByRole("button", { name: /Farmácias.*Fotos e telefones/ }).click();
  const card = page.locator(".stat-card").filter({ has: page.getByText(nome, { exact: true }) });
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 600;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "green"; ctx.fillRect(0, 0, 1080, 600);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await card.locator('input[type="file"]').setInputFiles({ name: "test.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(page.getByText(`Foto de ${nome} salva!`, { exact: false })).toBeVisible();
  await card.getByRole("button", { name: "Editar telefone" }).click();
  await card.getByPlaceholder("(64) 99999-9999").fill("(64) 99999-9999");
  await card.getByRole("button", { name: `Salvar telefone de ${nome}` }).click();
  await expect(card.getByText("(64) 99999-9999", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: `Remover foto de ${nome}` }).click();
  await expect(card.getByRole("button", { name: `Remover foto de ${nome}` })).toHaveCount(0);
  await expect(card.getByText("(64) 99999-9999", { exact: true })).toBeVisible();
  expect(actions.map((action) => action.action)).toEqual(["upload", "update_phone", "remove_photo"]);
  expect(forbidden).toEqual([]);
});
