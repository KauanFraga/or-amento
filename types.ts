export interface Product {
  id: string;
  description: string;
  price: number;
  formattedPrice: string;
}

export enum MatchStatus {
  MATCHED = 'MATCHED',
  AMBIGUOUS = 'AMBIGUOUS',
  UNKNOWN = 'UNKNOWN',
  PENDING = 'PENDING'
}

export interface QuoteItem {
  id: string;
  originalRequest: string; // What the customer typed
  matchedProduct?: Product; // The product found in catalog
  quantity: number;
  status: MatchStatus;
  manualPrice?: number; // If user overrides or enters price for unknown item
}

export interface ProcessingStats {
  totalItems: number;
  matched: number;
  unknown: number;
}