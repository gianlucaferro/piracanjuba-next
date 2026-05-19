// ViaCEP — backup do BrasilAPI/CEP, +10 anos de uptime.
// Docs: https://viacep.com.br/

export type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia?: string;
  ddd: string;
  siafi?: string;
  erro?: boolean;
};

export async function buscarCepViaCep(cep: string): Promise<ViaCepResponse | null> {
  const limpo = cep.replace(/\D/g, "");
  if (limpo.length !== 8) return null;
  const resp = await fetch(`https://viacep.com.br/ws/${limpo}/json/`, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as ViaCepResponse;
  return data.erro ? null : data;
}
