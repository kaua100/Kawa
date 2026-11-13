/** Parcelamento no cartão: 12x com a taxa da maquininha embutida. */
export const PARCELAS = 12;
const TAXA_CARTAO = 0.15;
export function parcelado(aVista: number) {
  const parcela = Math.ceil((aVista * (1 + TAXA_CARTAO)) / PARCELAS);
  return { vezes: PARCELAS, parcela, total: parcela * PARCELAS };
}
