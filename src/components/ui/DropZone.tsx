import React, { useCallback, useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, X } from 'lucide-react';

interface DropZoneProps {
  onParsed: (data: Record<string, string>[], file: File) => void;
  accept?: string;
  className?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onParsed,
  accept = '.csv',
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }

      setFileName(file.name);
      setParsing(true);
      setError(null);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          setParsing(false);
          if (results.errors.length > 0) {
            setError(`Parse error: ${results.errors[0].message}`);
            return;
          }
          onParsed(results.data as Record<string, string>[], file);
        },
        error: (err) => {
          setParsing(false);
          setError(`Parse error: ${err.message}`);
        },
      });
    },
    [onParsed]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative cursor-pointer rounded-2xl border-2 border-dashed p-10
        transition-all duration-300 ease-out group
        ${
          isDragging
            ? 'dropzone-active border-brand-500'
            : fileName
              ? 'border-profit/40 bg-profit/5'
              : 'border-surface-600 hover:border-surface-400 bg-surface-800/30 hover:bg-surface-800/50'
        }
        ${className}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4 text-center">
        {parsing ? (
          <>
            <div className="w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <p className="text-sm text-surface-300">Parsing CSV data...</p>
          </>
        ) : fileName ? (
          <>
            <div className="relative">
              <FileSpreadsheet size={40} className="text-profit" />
              <button
                onClick={clearFile}
                className="absolute -top-2 -right-2 w-5 h-5 bg-surface-700 hover:bg-loss rounded-full flex items-center justify-center transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-100">{fileName}</p>
              <p className="text-xs text-profit mt-1">✓ File parsed successfully</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-surface-700/50 flex items-center justify-center group-hover:bg-brand-600/10 group-hover:text-brand-400 transition-all duration-300">
              <Upload size={28} className="text-surface-400 group-hover:text-brand-400 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-200">
                Drop your TradingView CSV here
              </p>
              <p className="text-xs text-surface-400 mt-1">
                or click to browse • Supports .csv files
              </p>
            </div>
          </>
        )}

        {error && (
          <p className="text-xs text-loss font-medium mt-1">{error}</p>
        )}
      </div>
    </div>
  );
};
