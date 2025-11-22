import React from 'react';

interface FileUploaderProps {
  onFileLoaded: (content: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        onFileLoaded(text);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors bg-white shadow-sm">
      <div className="mx-auto h-12 w-12 text-slate-400 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-slate-900">Carregar Catálogo</h3>
      <p className="mt-1 text-sm text-slate-500">Selecione o arquivo .txt com seus produtos e preços.</p>
      <div className="mt-4">
        <label
          htmlFor="file-upload"
          className="inline-flex items-center rounded-md bg-electric-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-electric-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-600 cursor-pointer"
        >
          <span>Selecionar Arquivo</span>
          <input id="file-upload" name="file-upload" type="file" accept=".txt" className="sr-only" onChange={handleFileChange} />
        </label>
      </div>
      <p className="mt-2 text-xs text-slate-400">Formato esperado: DESCRIÇÃO [R$] VALOR</p>
    </div>
  );
};