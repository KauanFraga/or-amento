import { Product } from '../types';

export const parseCatalogFile = (text: string): Product[] => {
  const lines = text.split('\n');
  const products: Product[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('DESCRIÇÃO') || trimmed.startsWith('---')) return;

    // The format is roughly: "DESCRIPTION [TAB/SPACE] R$ [PRICE]"
    // We split by "R$" to separate description from price safely
    const parts = trimmed.split('R$');

    if (parts.length >= 2) {
      const description = parts[0].trim();
      const priceString = parts[1].trim();
      
      // Parse "60,00" or "1.200,00" to float
      // Remove dots (thousand separators), replace comma with dot
      const normalizedPrice = priceString.replace(/\./g, '').replace(',', '.');
      const price = parseFloat(normalizedPrice);

      if (description && !isNaN(price)) {
        products.push({
          id: `prod-${index}`,
          description,
          price,
          formattedPrice: `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        });
      }
    }
  });

  return products;
};

export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};