const coordenadas = { latitude: -17.3121852, longitude: -49.0332367 } as const;

export const CLINICA_ESSENCIA = {
  nome: "Essência Estética",
  path: "/estetica",
  instagram: "https://www.instagram.com/essenciaclinicaestetica_/",
  catalogo: "https://drive.google.com/file/d/1yfZuODIXhQCAvJhc3f_K9kZIqeRMULnG/view",
  mapa: "https://www.google.com/maps?cid=1163034803800396101",
  coordenadas,
  waze: "https://www.waze.com/ul?" + new URLSearchParams({
    ll: [coordenadas.latitude, coordenadas.longitude].join(","),
    navigate: "yes",
  }).toString(),
  rua: "Avenida Santos Dumont, Quadra 15, Lote 13",
  bairro: "Setor Aeroporto",
  cep: "75641-108",
  telefoneEsteticaSpa: "5564992802081",
} as const;
