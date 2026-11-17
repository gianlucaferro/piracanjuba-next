// Código PIX "copia e cola" (BR Code estático, padrão EMV do Banco Central).
// Referência: Manual de Padrões para Iniciação do Pix, BR Code estático.

export type DadosPix = {
  /** Chave Pix (CNPJ só com dígitos, e-mail, telefone ou chave aleatória). */
  chave: string;
  /** Nome do recebedor, até 25 caracteres, sem acento. */
  nome: string;
  /** Cidade do recebedor, até 15 caracteres, sem acento. */
  cidade: string;
  /** Valor em reais; sem valor, a pessoa digita no app do banco. */
  valor?: number;
  /** Identificador da cobrança (txid), até 25 caracteres alfanuméricos. */
  txid?: string;
};

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), em 4 dígitos hexadecimais. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function gerarPixCopiaECola({ chave, nome, cidade, valor, txid }: DadosPix): string {
  const nomeLimpo = semAcento(nome).slice(0, 25);
  const cidadeLimpa = semAcento(cidade).slice(0, 15);
  const txidLimpo = (txid ? txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) : "") || "***";
  const contaPix = campo("00", "BR.GOV.BCB.PIX") + campo("01", chave);
  const payload =
    campo("00", "01") +
    campo("26", contaPix) +
    campo("52", "0000") +
    campo("53", "986") +
    (valor !== undefined ? campo("54", valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", nomeLimpo) +
    campo("60", cidadeLimpa) +
    campo("62", campo("05", txidLimpo)) +
    "6304";
  return payload + crc16(payload);
}
