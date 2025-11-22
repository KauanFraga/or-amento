import React, { useCallback } from 'react';
import { QuoteItem, MatchStatus, Product } from '../types';
import { formatCurrency } from '../utils/parser';

interface QuoteItemRowProps {
  item: QuoteItem;
  products: Product[];
  onUpdate: (id: string, updates: Partial<QuoteItem>) => void;
  onRemove: (id: string) => void;
}

export const QuoteItemRow: React.FC<QuoteItemRowProps> = ({ item, products, onUpdate, onRemove }) => {
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      onUpdate(item.id, { quantity: val });
    }
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    const product = products.find(p => p.id === productId);
    if (product) {
      onUpdate(item.id, { 
        matchedProduct: product, 
        status: MatchStatus.MATCHED 
      });
    }
  };

  const handleManualPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow user to type manual price string, handling conversion logic if needed, 
    // but here we keep it simple for the numeric input
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
        onUpdate(item.id, { manualPrice: val });
    }
  };

  const effectivePrice = item.manualPrice ?? item.matchedProduct?.price ?? 0;
  const total = effectivePrice * item.quantity;
  
  const isUnknown = item.status === MatchStatus.UNKNOWN || item.status === MatchStatus.PENDING;
  const isMatched = item.status === MatchStatus.MATCHED || item.status === MatchStatus.AMBIGUOUS;

  return (
    <tr className={`border-b transition-colors ${isUnknown ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
      
      {/* 1. QTD (White background requested) */}
      <td className="px-4 py-3 text-sm w-24">
        <input 
          type="number" 
          min="1"
          value={item.quantity}
          onChange={handleQuantityChange}
          className="w-full rounded border border-slate-300 p-1 text-center shadow-sm focus:border-electric-500 focus:ring-electric-500 bg-white text-slate-900"
        />
      </td>

      {/* 2. PRODUTO NO CATÁLOGO (Matched Product) */}
      <td className="px-4 py-3 text-sm">
        {isMatched ? (
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">{item.matchedProduct?.description}</span>
            <button 
                className="text-xs text-blue-600 hover:underline text-left mt-1"
                onClick={() => onUpdate(item.id, { status: MatchStatus.UNKNOWN, matchedProduct: undefined })}
            >
                Alterar
            </button>
          </div>
        ) : (
          <select 
            className="w-full rounded-md border-slate-300 shadow-sm text-sm focus:border-electric-500 focus:ring-electric-500 p-1 border"
            onChange={handleProductChange}
            value=""
          >
            <option value="" disabled>Selecione um produto...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.description} - {p.formattedPrice}</option>
            ))}
          </select>
        )}
      </td>

      {/* 3. ITEM SOLICITADO (Was "UNITÁRIO" in prompt list, used for reference) */}
      <td className="px-4 py-3 text-sm text-slate-500 max-w-xs break-words">
        <div className="font-normal text-xs">{item.originalRequest}</div>
        {isUnknown && <span className="text-[10px] text-red-600 font-bold uppercase">Não identificado</span>}
      </td>

      {/* 4. VALOR UNITÁRIO */}
      <td className="px-4 py-3 text-sm w-32 text-right">
        {isMatched ? (
             <span className="text-slate-600">{formatCurrency(item.matchedProduct!.price)}</span>
        ) : (
            <div className="flex items-center justify-end">
                 <span className="mr-1 text-slate-400 text-xs">R$</span>
                 <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={item.manualPrice || ''}
                    onChange={handleManualPriceChange}
                    className="w-20 rounded border-slate-300 p-1 text-right text-sm shadow-sm focus:border-electric-500 focus:ring-electric-500"
                 />
            </div>
        )}
      </td>

      {/* 5. TOTAL */}
      <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right w-32">
        {formatCurrency(total)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-sm text-center w-10">
        <button 
            onClick={() => onRemove(item.id)}
            className="text-slate-400 hover:text-red-500 transition-colors"
            title="Remover item"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 0 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
            </svg>
        </button>
      </td>
    </tr>
  );
};