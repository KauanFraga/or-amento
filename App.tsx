import React, { useState, useMemo, useEffect } from 'react';
import { parseCatalogFile, formatCurrency } from './utils/parser';
import { matchQuoteItems } from './services/geminiService';
import { Product, QuoteItem, MatchStatus } from './types';
import { FileUploader } from './components/FileUploader';
import { QuoteItemRow } from './components/QuoteItemRow';

// Sample placeholder catalog for demo purposes if user doesn't upload immediately
const PLACEHOLDER_CATALOG_TEXT = `
DESCRIÇÃO	 VALOR UNIT. 
CABO FLEX 2,5MM AZ	 R$ 2,39 
CABO FLEX 2,5MM VM	 R$ 2,39 
TOMADA 10A LIZ	 R$ 10,70 
INTERRUPTOR SIMPLES LIZ	 R$ 11,00
DISJUNTOR DIN 1X20	 R$ 9,90
FITA ISOLANTE 3M	 R$ 10,00
LÂMPADA LED 9W	 R$ 6,50
`;

function App() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [rawRequest, setRawRequest] = useState<string>('');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'quote'>('input');
  
  // Persistent state for learned patterns: { "original request string": "product_id" }
  const [learnedPatterns, setLearnedPatterns] = useState<Record<string, string>>({});

  // Load patterns from local storage on mount
  useEffect(() => {
    const savedPatterns = localStorage.getItem('orcaFacil_patterns');
    if (savedPatterns) {
      try {
        setLearnedPatterns(JSON.parse(savedPatterns));
      } catch (e) {
        console.error("Failed to parse saved patterns", e);
      }
    }
  }, []);

  // Load catalog from text
  const handleCatalogLoad = (text: string) => {
    const parsed = parseCatalogFile(text);
    setCatalog(parsed);
    console.log(`Loaded ${parsed.length} products`);
  };

  // Use placeholder if empty
  useEffect(() => {
    if (catalog.length === 0) {
      // Optional: auto-load a small sample so the app isn't empty on first paint
      // handleCatalogLoad(PLACEHOLDER_CATALOG_TEXT);
    }
  }, []);

  const handleProcessRequest = async () => {
    if (!rawRequest.trim()) return;
    if (catalog.length === 0) {
      alert("Por favor, carregue o arquivo de catálogo primeiro.");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Call Gemini API
      const matches = await matchQuoteItems(catalog, rawRequest);

      const newItems: QuoteItem[] = matches.map((m, idx) => {
        const normalizedRequest = m.originalRequest.trim().toLowerCase();
        
        let product: Product | undefined;
        let status = MatchStatus.UNKNOWN;

        // 1. Check learned patterns first
        if (learnedPatterns[normalizedRequest]) {
          product = catalog.find(p => p.id === learnedPatterns[normalizedRequest]);
          if (product) status = MatchStatus.MATCHED;
        }

        // 2. If no learned pattern, use AI result
        if (!product && m.matchedProductDescription) {
           product = catalog.find(p => p.description === m.matchedProductDescription);
           if (product) status = MatchStatus.MATCHED;
        }

        return {
          id: `quote-${Date.now()}-${idx}`,
          originalRequest: m.originalRequest,
          matchedProduct: product,
          quantity: m.quantity || 1,
          status: status,
          manualPrice: undefined
        };
      });

      setQuoteItems(newItems);
      setActiveTab('quote');
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao processar o pedido. Verifique sua chave de API e tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setQuoteItems(prev => {
      const newItems = prev.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, ...updates };
          
          // If the user manually selected a product, learn this pattern
          if (updates.matchedProduct && updates.matchedProduct.id) {
             const key = item.originalRequest.trim().toLowerCase();
             const newPatterns = { ...learnedPatterns, [key]: updates.matchedProduct.id };
             setLearnedPatterns(newPatterns);
             localStorage.setItem('orcaFacil_patterns', JSON.stringify(newPatterns));
          }
          
          return updatedItem;
        }
        return item;
      });
      return newItems;
    });
  };

  const removeItem = (id: string) => {
    setQuoteItems(prev => prev.filter(item => item.id !== id));
  };

  const totalAmount = useMemo(() => {
    return quoteItems.reduce((sum, item) => {
      const price = item.manualPrice ?? item.matchedProduct?.price ?? 0;
      return sum + (price * item.quantity);
    }, 0);
  }, [quoteItems]);

  // Formats data specifically for Excel (Tab Separated)
  const copyToExcelClipboard = () => {
    // Headers: QUANT | DESCRIÇÃO | VALOR UNI | VALOR TOTAL
    const rows = quoteItems.map(item => {
      const qty = item.quantity;
      // If matched, use catalog description, otherwise use the original request (fallback)
      const description = item.matchedProduct ? item.matchedProduct.description : item.originalRequest;
      
      const unitPrice = item.manualPrice ?? item.matchedProduct?.price ?? 0;
      const total = unitPrice * qty;

      // Format numbers for Excel (pt-BR uses comma for decimals)
      const priceStr = unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const totalStr = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Use Tabs (\t) to separate columns for Excel
      return `${qty}\t${description}\t${priceStr}\t${totalStr}`;
    });

    const text = rows.join('\n');
    navigator.clipboard.writeText(text);
    alert("Dados copiados! Abra o Excel e cole (Ctrl+V).");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-electric-500 p-2 rounded-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">OrçaFácil Elétrica</h1>
            <p className="text-xs text-slate-500">Sistema Inteligente de Orçamentos</p>
          </div>
        </div>
        <div className="flex gap-2">
           <div className="text-xs text-right text-slate-400 hidden md:block">
              Catálogo Carregado: <br/>
              <span className={`font-bold ${catalog.length > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {catalog.length} itens
              </span>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Sidebar / Input Area */}
        <div className={`flex-col w-full md:w-1/3 border-r border-slate-200 bg-white p-6 overflow-y-auto ${activeTab === 'input' ? 'flex' : 'hidden md:flex'}`}>
          
          {/* File Upload Section */}
          <div className="mb-8">
             <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">1. Catálogo de Produtos</h2>
             <FileUploader onFileLoaded={handleCatalogLoad} />
             {catalog.length > 0 && (
                <div className="mt-2 p-2 bg-green-50 text-green-700 text-xs rounded border border-green-100 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                    Arquivo processado com sucesso.
                </div>
             )}
          </div>

          {/* Text Input Section */}
          <div className="flex-1 flex flex-col">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">2. Pedido do Cliente</h2>
            <p className="text-xs text-slate-500 mb-2">Cole a lista de itens (Whatsapp, E-mail) abaixo.</p>
            <textarea
              className="flex-1 w-full rounded-lg border-slate-300 shadow-sm focus:border-electric-500 focus:ring-electric-500 text-sm p-3 font-mono resize-none bg-slate-50"
              placeholder={`Exemplo:\n3 Tomadas 20A\n50m fio 2.5mm azul\n1 fita isolante`}
              value={rawRequest}
              onChange={(e) => setRawRequest(e.target.value)}
            />
            
            <button
              onClick={handleProcessRequest}
              disabled={isProcessing || catalog.length === 0 || !rawRequest.trim()}
              className={`mt-4 w-full flex justify-center items-center py-3 px-4 rounded-lg text-white font-semibold shadow-md transition-all ${
                isProcessing || catalog.length === 0 || !rawRequest.trim()
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-electric-600 hover:bg-electric-500 hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando com IA...
                </>
              ) : (
                'Gerar Orçamento'
              )}
            </button>
          </div>
        </div>

        {/* Right Content / Quote Preview */}
        <div className={`flex-col w-full md:w-2/3 bg-slate-50 h-full ${activeTab === 'quote' ? 'flex' : 'hidden md:flex'}`}>
          
          {/* Mobile Tabs */}
          <div className="md:hidden flex border-b border-slate-200 bg-white">
            <button 
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'input' ? 'text-electric-600 border-b-2 border-electric-600' : 'text-slate-500'}`}
                onClick={() => setActiveTab('input')}
            >
                Entrada
            </button>
            <button 
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'quote' ? 'text-electric-600 border-b-2 border-electric-600' : 'text-slate-500'}`}
                onClick={() => setActiveTab('quote')}
            >
                Orçamento ({quoteItems.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {quoteItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                </div>
                <p className="text-lg font-medium">Nenhum orçamento gerado</p>
                <p className="text-sm">Faça o upload do catálogo e processe um pedido.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-full">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Itens do Pedido</h3>
                    <div className="flex gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 border border-green-200">
                            {quoteItems.filter(i => i.status === MatchStatus.MATCHED).length} Encontrados
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200">
                            {quoteItems.filter(i => i.status === MatchStatus.UNKNOWN).length} Pendentes
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto overflow-y-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-20">QTD</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">PRODUTO NO CATÁLOGO</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">ITEM SOLICITADO</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-28">VALOR UNITÁRIO</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-28">TOTAL</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quoteItems.map((item) => (
                        <QuoteItemRow 
                          key={item.id} 
                          item={item} 
                          products={catalog} 
                          onUpdate={updateItem}
                          onRemove={removeItem}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Footer Summary */}
                <div className="bg-slate-50 p-6 border-t border-slate-200">
                    <div className="flex justify-end items-end flex-col">
                        <p className="text-sm text-slate-500 mb-1">Valor Total do Orçamento</p>
                        <div className="text-3xl font-bold text-slate-900">{formatCurrency(totalAmount)}</div>
                    </div>
                    <div className="mt-6 flex gap-3 justify-end">
                        <button 
                            onClick={() => setQuoteItems([])}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                        >
                            Limpar
                        </button>
                        <button 
                            onClick={copyToExcelClipboard}
                            className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-colors flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                            </svg>
                            Copiar para Excel
                        </button>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;