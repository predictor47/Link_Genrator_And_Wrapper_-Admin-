import React, { useState, useRef } from 'react';

interface LinkGenerationResult {
  links: Array<{
    id: string;
    wrapperUrl: string;
    originalUrl: string;
    respId: string;
    vendorId?: string;
    linkType: 'VENDOR' | 'INTERNAL';
  }>;
  totalGenerated: number;
  message: string;
  csvData?: string;
}

interface EnhancedLinkGeneratorProps {
  projectId: string;
  onLinksGenerated?: (result: LinkGenerationResult) => void;
}

const EnhancedLinkGenerator: React.FC<EnhancedLinkGeneratorProps> = ({
  projectId,
  onLinksGenerated
}) => {
  const [mode, setMode] = useState<'vendor' | 'internal' | 'both'>('vendor');
  const [surveyUrl, setSurveyUrl] = useState('');
  const [startNumber, setStartNumber] = useState(1);
  const [count, setCount] = useState(10);
  const [prefix, setPrefix] = useState('al');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LinkGenerationResult | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setError('');
    } else {
      setError('Please select a valid CSV file');
      setCsvFile(null);
    }
  };

  const generateLinks = async () => {
    if (!surveyUrl.trim()) {
      setError('Survey URL is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('mode', mode);
      formData.append('surveyUrl', surveyUrl.trim());
      
      if (mode === 'vendor' || mode === 'both') {
        formData.append('startNumber', startNumber.toString());
        formData.append('count', count.toString());
        formData.append('prefix', prefix);
      }
      
      if ((mode === 'internal' || mode === 'both') && csvFile) {
        formData.append('csvFile', csvFile);
      }

      const response = await fetch('/api/links/generate-enhanced', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate links');
      }

      setResult(data);
      onLinksGenerated?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (!result?.csvData) return;

    const blob = new Blob([result.csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `links-${projectId}-${mode}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Enhanced Link Generator</h3>
        <p className="text-sm text-gray-600 mt-1">Generate survey links with custom resp_ids</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Generation Mode</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
                <input
                  type="radio"
                  name="mode"
                  value="vendor"
                  checked={mode === 'vendor'}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="sr-only"
                />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">
                      Vendor Mode
                    </span>
                    <span className="mt-1 flex items-center text-sm text-gray-500">
                      Sequential IDs (al001, al002...)
                    </span>
                  </span>
                </span>
                <svg
                  className={`h-5 w-5 ${mode === 'vendor' ? 'text-blue-600' : 'text-gray-300'}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </label>
            </div>

            <div>
              <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
                <input
                  type="radio"
                  name="mode"
                  value="internal"
                  checked={mode === 'internal'}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="sr-only"
                />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">
                      Internal Mode
                    </span>
                    <span className="mt-1 flex items-center text-sm text-gray-500">
                      CSV upload with custom IDs
                    </span>
                  </span>
                </span>
                <svg
                  className={`h-5 w-5 ${mode === 'internal' ? 'text-blue-600' : 'text-gray-300'}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </label>
            </div>

            <div>
              <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
                <input
                  type="radio"
                  name="mode"
                  value="both"
                  checked={mode === 'both'}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="sr-only"
                />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">
                      Both Modes
                    </span>
                    <span className="mt-1 flex items-center text-sm text-gray-500">
                      Sequential + CSV combined
                    </span>
                  </span>
                </span>
                <svg
                  className={`h-5 w-5 ${mode === 'both' ? 'text-blue-600' : 'text-gray-300'}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </label>
            </div>
          </div>
        </div>

        {/* Survey URL */}
        <div>
          <label htmlFor="surveyUrl" className="block text-sm font-medium text-gray-700">
            Survey URL
          </label>
          <input
            type="url"
            id="surveyUrl"
            value={surveyUrl}
            onChange={(e) => setSurveyUrl(e.target.value)}
            placeholder="https://example.com/survey?param="
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            The resp_id will be appended to this URL
          </p>
        </div>

        {/* Vendor Mode Settings */}
        {(mode === 'vendor' || mode === 'both') && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Sequential ID Settings</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="prefix" className="block text-sm font-medium text-gray-700">
                  Prefix
                </label>
                <input
                  type="text"
                  id="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="startNumber" className="block text-sm font-medium text-gray-700">
                  Start Number
                </label>
                <input
                  type="number"
                  id="startNumber"
                  min="1"
                  value={startNumber}
                  onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="count" className="block text-sm font-medium text-gray-700">
                  Count
                </label>
                <input
                  type="number"
                  id="count"
                  min="1"
                  max="1000"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 10)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Preview: {prefix}{String(startNumber).padStart(3, '0')}, {prefix}{String(startNumber + 1).padStart(3, '0')}, ...
            </div>
          </div>
        )}

        {/* CSV Upload for Internal/Both Mode */}
        {(mode === 'internal' || mode === 'both') && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">CSV Upload</h4>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="csvFile"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg
                    className="w-8 h-8 mb-4 text-blue-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 16"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                    />
                  </svg>
                  <p className="mb-2 text-sm text-blue-500">
                    <span className="font-semibold">Click to upload</span> CSV file
                  </p>
                  <p className="text-xs text-blue-500">CSV files only</p>
                  {csvFile && (
                    <p className="mt-2 text-sm text-green-600 font-medium">
                      Selected: {csvFile.name}
                    </p>
                  )}
                </div>
                <input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                />
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              CSV should have a column named 'resp_id' with your custom IDs
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={generateLinks}
          disabled={loading || !surveyUrl.trim() || (mode === 'internal' && !csvFile) || ((mode === 'both') && !csvFile)}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Generate Links
            </>
          )}
        </button>

        {/* Results */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-green-800">
                  Links Generated Successfully!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>{result.message}</p>
                  <p className="mt-1">Total links: {result.totalGenerated}</p>
                </div>
                {result.csvData && (
                  <div className="mt-4">
                    <button
                      onClick={downloadResults}
                      className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedLinkGenerator;
