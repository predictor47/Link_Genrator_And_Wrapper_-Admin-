import React, { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';

interface VendorConfig {
  vendorId: string;
  testCount: number;
  liveCount: number;
}

interface GeneratedLink {
  id: string;
  respId: string;
  originalUrl: string;
  wrapperUrl: string;
  linkType: 'TEST' | 'LIVE';
  vendorId: string;
  projectId: string;
}

interface BatchProgress {
  current: number;
  total: number;
  phase: 'generating' | 'saving' | 'complete';
  message: string;
}

interface ClientSideLinkGeneratorProps {
  projectId: string;
  onComplete?: (links: GeneratedLink[]) => void;
}

const ClientSideLinkGenerator: React.FC<ClientSideLinkGeneratorProps> = ({
  projectId,
  onComplete
}) => {
  const [originalUrl, setOriginalUrl] = useState('https://gotosurvey.ardentfieldwork.com/surveyInitiate.php?gid=MjYyNS00NjIw&pid={{PANELIST IDENTIFIER}}');
  const [vendors, setVendors] = useState<VendorConfig[]>([
    { vendorId: 'vendor1', testCount: 50, liveCount: 1000 },
    { vendorId: 'vendor2', testCount: 50, liveCount: 1000 },
    { vendorId: 'vendor3', testCount: 50, liveCount: 1000 },
    { vendorId: 'vendor4', testCount: 50, liveCount: 1000 },
    { vendorId: 'vendor5', testCount: 50, liveCount: 1000 },
    { vendorId: 'vendor6', testCount: 50, liveCount: 1000 },
    { vendorId: 'vendor7', testCount: 50, liveCount: 1000 },
  ]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [error, setError] = useState<string>('');
  const [batchSize, setBatchSize] = useState(100); // Save links in batches of 100

  // Generate unique resp_id
  const generateRespId = useCallback((vendorId: string, linkType: 'TEST' | 'LIVE', index: number): string => {
    const typePrefix = linkType === 'TEST' ? 'test' : 'live';
    const paddedIndex = index.toString().padStart(4, '0');
    return `${vendorId}_${typePrefix}_${paddedIndex}`;
  }, []);

  // Replace placeholder in URL
  const generateOriginalUrl = useCallback((respId: string): string => {
    return originalUrl.replace('{{PANELIST IDENTIFIER}}', respId);
  }, [originalUrl]);

  // Generate wrapper URL
  const generateWrapperUrl = useCallback((respId: string): string => {
    const domain = process.env.NODE_ENV === 'development' 
      ? 'localhost:3001' 
      : (process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com');
    
    return `https://${domain}/survey?respid=${respId}&project=${projectId}`;
  }, [projectId]);

  // Calculate total links
  const getTotalLinks = useCallback((): number => {
    return vendors.reduce((total, vendor) => total + vendor.testCount + vendor.liveCount, 0);
  }, [vendors]);

  // Generate all links in memory
  const generateAllLinks = useCallback((): GeneratedLink[] => {
    const allLinks: GeneratedLink[] = [];
    
    vendors.forEach((vendor) => {
      // Generate test links
      for (let i = 1; i <= vendor.testCount; i++) {
        const respId = generateRespId(vendor.vendorId, 'TEST', i);
        const link: GeneratedLink = {
          id: nanoid(),
          respId,
          originalUrl: generateOriginalUrl(respId),
          wrapperUrl: generateWrapperUrl(respId),
          linkType: 'TEST',
          vendorId: vendor.vendorId,
          projectId
        };
        allLinks.push(link);
      }
      
      // Generate live links
      for (let i = 1; i <= vendor.liveCount; i++) {
        const respId = generateRespId(vendor.vendorId, 'LIVE', i);
        const link: GeneratedLink = {
          id: nanoid(),
          respId,
          originalUrl: generateOriginalUrl(respId),
          wrapperUrl: generateWrapperUrl(respId),
          linkType: 'LIVE',
          vendorId: vendor.vendorId,
          projectId
        };
        allLinks.push(link);
      }
    });
    
    return allLinks;
  }, [vendors, generateRespId, generateOriginalUrl, generateWrapperUrl, projectId]);

  // Save links to database in batches
  const saveLinksBatch = async (linksBatch: GeneratedLink[]): Promise<void> => {
    const response = await fetch('/api/links/save-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        links: linksBatch
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save links batch');
    }
  };

  // Main generation function
  const handleGenerate = async () => {
    if (!originalUrl.includes('{{PANELIST IDENTIFIER}}')) {
      setError('Original URL must contain {{PANELIST IDENTIFIER}} placeholder');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedLinks([]);

    try {
      const totalLinks = getTotalLinks();
      
      // Phase 1: Generate links in memory
      setProgress({
        current: 0,
        total: totalLinks,
        phase: 'generating',
        message: 'Generating links in memory...'
      });

      const allLinks = generateAllLinks();
      
      setProgress({
        current: totalLinks,
        total: totalLinks,
        phase: 'generating',
        message: `Generated ${totalLinks} links in memory`
      });

      // Phase 2: Save to database in batches
      setProgress({
        current: 0,
        total: Math.ceil(allLinks.length / batchSize),
        phase: 'saving',
        message: 'Saving links to database...'
      });

      const batches: GeneratedLink[][] = [];
      for (let i = 0; i < allLinks.length; i += batchSize) {
        batches.push(allLinks.slice(i, i + batchSize));
      }

      let savedBatches = 0;
      for (const batch of batches) {
        await saveLinksBatch(batch);
        savedBatches++;
        
        setProgress({
          current: savedBatches,
          total: batches.length,
          phase: 'saving',
          message: `Saved ${savedBatches}/${batches.length} batches (${savedBatches * batchSize}/${allLinks.length} links)`
        });

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Complete
      setProgress({
        current: allLinks.length,
        total: allLinks.length,
        phase: 'complete',
        message: `Successfully generated and saved ${allLinks.length} links!`
      });

      setGeneratedLinks(allLinks);
      onComplete?.(allLinks);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during generation');
      setProgress(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // Update vendor configuration
  const updateVendor = (index: number, field: keyof VendorConfig, value: string | number) => {
    const newVendors = [...vendors];
    newVendors[index] = { ...newVendors[index], [field]: value };
    setVendors(newVendors);
  };

  // Add new vendor
  const addVendor = () => {
    setVendors([...vendors, { vendorId: `vendor${vendors.length + 1}`, testCount: 50, liveCount: 1000 }]);
  };

  // Remove vendor
  const removeVendor = (index: number) => {
    setVendors(vendors.filter((_, i) => i !== index));
  };

  // Download CSV
  const downloadCSV = () => {
    if (generatedLinks.length === 0) return;

    const csvHeaders = ['Vendor ID', 'Link Type', 'Resp ID', 'Wrapper URL', 'Original URL'];
    const csvRows = generatedLinks.map(link => [
      link.vendorId,
      link.linkType,
      link.respId,
      link.wrapperUrl,
      link.originalUrl
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-links-${projectId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="text-xl font-bold text-gray-800">🚀 High-Performance Link Generator</h3>
        <p className="text-sm text-gray-600 mt-1">
          Client-side generation with batch processing • Handles large volumes • Progress tracking
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Original URL Configuration */}
        <div>
          <label htmlFor="originalUrl" className="block text-sm font-medium text-gray-700 mb-2">
            Original Survey URL Template
          </label>
          <input
            type="text"
            id="originalUrl"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://example.com/survey?param={{PANELIST IDENTIFIER}}"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use <code className="bg-gray-100 px-1 rounded">{'{{PANELIST IDENTIFIER}}'}</code> as placeholder for the resp_id
          </p>
        </div>

        {/* Batch Size Configuration */}
        <div>
          <label htmlFor="batchSize" className="block text-sm font-medium text-gray-700 mb-2">
            Batch Size (for database saves)
          </label>
          <select
            id="batchSize"
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={50}>50 links per batch</option>
            <option value={100}>100 links per batch (recommended)</option>
            <option value={200}>200 links per batch</option>
            <option value={500}>500 links per batch</option>
          </select>
        </div>

        {/* Vendor Configuration */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium text-gray-800">Vendor Configuration</h4>
            <button
              onClick={addVendor}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded-md"
            >
              + Add Vendor
            </button>
          </div>
          
          <div className="space-y-3">
            {vendors.map((vendor, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                <div className="flex-1">
                  <input
                    type="text"
                    value={vendor.vendorId}
                    onChange={(e) => updateVendor(index, 'vendorId', e.target.value)}
                    placeholder="Vendor ID"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    value={vendor.testCount}
                    onChange={(e) => updateVendor(index, 'testCount', Number(e.target.value))}
                    placeholder="Test"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0"
                  />
                  <label className="text-xs text-gray-500">Test</label>
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    value={vendor.liveCount}
                    onChange={(e) => updateVendor(index, 'liveCount', Number(e.target.value))}
                    placeholder="Live"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0"
                  />
                  <label className="text-xs text-gray-500">Live</label>
                </div>
                <button
                  onClick={() => removeVendor(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Generation Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600 font-medium">Total Vendors:</span> {vendors.length}
            </div>
            <div>
              <span className="text-blue-600 font-medium">Total Links:</span> {getTotalLinks().toLocaleString()}
            </div>
            <div>
              <span className="text-blue-600 font-medium">Test Links:</span> {vendors.reduce((sum, v) => sum + v.testCount, 0).toLocaleString()}
            </div>
            <div>
              <span className="text-blue-600 font-medium">Live Links:</span> {vendors.reduce((sum, v) => sum + v.liveCount, 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {progress && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">{progress.message}</span>
              <span className="text-sm text-gray-500">
                {progress.current}/{progress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  progress.phase === 'complete' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Phase: {progress.phase} • {Math.round((progress.current / progress.total) * 100)}% complete
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="text-red-400">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <div>
            {generatedLinks.length > 0 && (
              <button
                onClick={downloadCSV}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md"
              >
                📥 Download CSV ({generatedLinks.length} links)
              </button>
            )}
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || getTotalLinks() === 0}
            className={`font-medium py-3 px-6 rounded-md transition-colors ${
              isGenerating || getTotalLinks() === 0
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isGenerating ? '🔄 Generating...' : `🚀 Generate ${getTotalLinks().toLocaleString()} Links`}
          </button>
        </div>

        {/* Results Summary */}
        {generatedLinks.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">✅ Generation Complete!</h4>
            <div className="text-sm text-green-700">
              Successfully generated {generatedLinks.length.toLocaleString()} links across {vendors.length} vendors.
              Links have been saved to the database and are ready for distribution.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientSideLinkGenerator;
