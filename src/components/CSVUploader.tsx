import React, { useState } from 'react';
import Papa from 'papaparse';

interface CSVUploaderProps {
  onCSVProcessed: (data: any[]) => void;
  templateFields?: string[];
  className?: string;
}

const CSVUploader: React.FC<CSVUploaderProps> = ({ 
  onCSVProcessed, 
  templateFields = ['originalUrl', 'vendorCode', 'count', 'testCount', 'liveCount'], 
  className = '' 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`);
          setIsProcessing(false);
          return;
        }

        // Validate required fields
        const data = results.data as Record<string, any>[];
        const errors = [];

        // Check if CSV has minimum required fields
        if (data.length > 0) {
          const firstRow = data[0];
          if (!firstRow.hasOwnProperty('originalUrl')) {
            errors.push("CSV must have 'originalUrl' column");
          }
        }

        if (errors.length > 0) {
          setError(errors.join(', '));
        } else {
          onCSVProcessed(data);
        }
        
        setIsProcessing(false);
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
        setIsProcessing(false);
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = 
      templateFields.join(',') + '\n' +
      'https://example.com/survey,VENDOR1,10,5,5\n' +
      'https://example.com/survey2,VENDOR2,5,0,5';
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'link_generation_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`${className}`}>
      <div className="flex flex-col space-y-3">
        <div className="flex items-center space-x-2">
          <label htmlFor="csvFile" className="block text-gray-700 text-sm font-bold">
            Upload CSV File:
          </label>
          <button
            type="button"
            onClick={downloadTemplate}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Download Template
          </button>
        </div>
        
        <div className="relative border-2 border-dashed border-gray-300 rounded-md p-6 hover:border-gray-400 transition-colors">
          <input
            id="csvFile"
            name="csvFile"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-1 text-sm text-gray-600">
              {filename ? filename : "Drag and drop CSV file here, or click to select"}
            </p>
            <p className="mt-2 text-xs text-gray-500">CSV file with survey URLs and parameters</p>
          </div>
        </div>
        
        {isProcessing && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-sm text-gray-600">Processing file...</span>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
      </div>
    </div>
  );
};

export default CSVUploader;