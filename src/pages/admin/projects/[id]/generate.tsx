import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { prisma } from '@/lib/prisma';
import CSVUploader from '@/components/CSVUploader';

// Type for vendor
interface Vendor {
  id: string;
  name: string;
  code: string;
}

// Type for generated link
interface GeneratedLink {
  id: string;
  uid: string;
  originalUrl: string;
  linkType: string;
  status: string;
  fullUrl: string;
}

// Type for CSV row data
interface CSVLinkData {
  originalUrl: string;
  vendorCode?: string;
  count?: number;
  testCount?: number;
  liveCount?: number;
  geoRestriction?: string;
}

// Component props
interface GeneratePageProps {
  project: {
    id: string;
    name: string;
  };
}

export default function GeneratePage({ project }: GeneratePageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showCountrySelect, setShowCountrySelect] = useState(false);
  const [splitLinkTypes, setSplitLinkTypes] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [csvData, setCsvData] = useState<CSVLinkData[]>([]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm();
  
  const linkType = watch('linkType', 'LIVE');
  const restrictGeo = watch('restrictGeo', false);
  const selectedVendorId = watch('vendorId', '');
  const testCount = watch('testCount', 0);
  const liveCount = watch('liveCount', 0);
  
  // Calculate total count when test/live counts change
  useEffect(() => {
    if (splitLinkTypes) {
      const total = Number(testCount || 0) + Number(liveCount || 0);
      setValue('count', total);
    }
  }, [testCount, liveCount, splitLinkTypes, setValue]);
  
  // List of common country codes for the dropdown
  const countryCodes = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'JP', name: 'Japan' },
    { code: 'IN', name: 'India' },
    { code: 'BR', name: 'Brazil' },
    { code: 'ZA', name: 'South Africa' }
  ];
  
  // Fetch vendors for this project on mount
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await axios.get(`/api/vendors/list?projectId=${project.id}`);
        if (response.data.success) {
          setVendors(response.data.vendors);
        }
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
      }
    };
    
    fetchVendors();
  }, [project.id]);
  
  const handleCSVProcessed = (data: CSVLinkData[]) => {
    setCsvData(data);
    setIsBatchMode(true);
  };

  const processBatchGeneration = async () => {
    if (csvData.length === 0) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setBatchProgress({ current: 0, total: csvData.length });
    
    const allGeneratedLinks: GeneratedLink[] = [];
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      setBatchProgress({ current: i + 1, total: csvData.length });
      
      try {
        // Find vendor ID by code if provided
        let vendorId = null;
        if (row.vendorCode) {
          const vendor = vendors.find(v => v.code === row.vendorCode);
          if (vendor) {
            vendorId = vendor.id;
          } else {
            console.warn(`Vendor with code ${row.vendorCode} not found, skipping vendor assignment`);
          }
        }
        
        // Parse geo restrictions if provided
        let geoRestriction = null;
        if (row.geoRestriction) {
          try {
            // Try to parse as JSON array
            const parsed = JSON.parse(row.geoRestriction);
            if (Array.isArray(parsed)) {
              geoRestriction = parsed;
            } else if (typeof parsed === 'string') {
              geoRestriction = [parsed];
            }
          } catch (e) {
            // If not JSON, treat as comma-separated string
            geoRestriction = row.geoRestriction.split(',').map(s => s.trim());
          }
        }
        
        const payload: any = {
          projectId: project.id,
          originalUrl: row.originalUrl,
          vendorId: vendorId,
          geoRestriction
        };
        
        // Handle test/live split
        if (row.testCount !== undefined && row.liveCount !== undefined) {
          payload.testCount = parseInt(String(row.testCount)) || 0;
          payload.liveCount = parseInt(String(row.liveCount)) || 0;
          payload.count = payload.testCount + payload.liveCount;
        } else {
          payload.count = parseInt(String(row.count)) || 1;
          // Default to LIVE if not specified
          payload.linkType = 'LIVE';
        }
        
        const response = await axios.post('/api/links/generate', payload);
        
        if (response.data.success && response.data.links) {
          allGeneratedLinks.push(...response.data.links);
        }
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        // Continue with next row
      }
    }
    
    setGeneratedLinks(allGeneratedLinks);
    setIsSubmitting(false);
    setSuccess(`Successfully generated ${allGeneratedLinks.length} links from CSV data.`);
  };
  
  const onSubmit = async (data: any) => {
    // If in batch mode, use the CSV data instead
    if (isBatchMode && csvData.length > 0) {
      await processBatchGeneration();
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Prepare geo-restriction data if enabled
      let geoRestriction = null;
      if (data.restrictGeo && data.countries?.length) {
        geoRestriction = Array.isArray(data.countries) 
          ? data.countries 
          : [data.countries];
      }

      const payload: any = {
        projectId: project.id,
        originalUrl: data.originalUrl,
        vendorId: data.vendorId || null,
        geoRestriction
      };
      
      // Handle split link types or single type
      if (splitLinkTypes) {
        payload.testCount = parseInt(data.testCount) || 0;
        payload.liveCount = parseInt(data.liveCount) || 0;
        payload.count = payload.testCount + payload.liveCount;
      } else {
        payload.count = parseInt(data.count) || 1;
        payload.linkType = data.linkType || 'LIVE';
      }

      const response = await axios.post('/api/links/generate', payload);
      
      if (response.data.success) {
        setSuccess(`Successfully generated ${response.data.count} links.`);
        setGeneratedLinks(response.data.links);
      } else {
        setError(response.data.message || 'Failed to generate links');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error generating links');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a new vendor
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [addingVendor, setAddingVendor] = useState(false);
  
  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingVendor(true);
    
    try {
      const response = await axios.post('/api/vendors/create', {
        projectId: project.id,
        name: vendorName,
        code: vendorCode
      });
      
      if (response.data.success) {
        setVendors([...vendors, response.data.vendor]);
        setVendorName('');
        setVendorCode('');
        setShowVendorForm(false);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to add vendor');
    } finally {
      setAddingVendor(false);
    }
  };
  
  // Copy generated link to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Link copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };
  
  // Handle bulk copy of all links
  const copyAllLinks = () => {
    const linkText = generatedLinks.map(link => link.fullUrl).join('\n');
    navigator.clipboard.writeText(linkText);
    setSuccess('All links copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  // Export generated links as CSV
  const exportAsCSV = () => {
    if (!generatedLinks.length) return;
    
    const csvContent = [
      ['URL', 'UID', 'Type', 'Status'].join(','),
      ...generatedLinks.map(link => [
        link.fullUrl,
        link.uid,
        link.linkType,
        link.status
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${project.name.replace(/\s+/g, '_')}_links_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link 
          href={`/admin/projects/${project.id}`}
          className="text-blue-600 hover:text-blue-800"
        >
          &larr; Back to project
        </Link>
        <h1 className="text-3xl font-bold mt-2">{project.name}</h1>
        <h2 className="text-xl font-semibold text-gray-700">Generate Survey Links</h2>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          {success}
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Link Generation Method</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setIsBatchMode(false)}
              className={`p-4 rounded-lg border-2 flex flex-col items-center ${!isBatchMode 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'}`}
            >
              <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="font-medium">Manual Entry</span>
              <span className="text-xs text-gray-600 mt-1">Create links one by one with form</span>
            </button>
            
            <button
              type="button"
              onClick={() => setIsBatchMode(true)}
              className={`p-4 rounded-lg border-2 flex flex-col items-center ${isBatchMode 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'}`}
            >
              <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="font-medium">Batch Upload</span>
              <span className="text-xs text-gray-600 mt-1">Upload CSV with multiple links</span>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          {isBatchMode ? (
            <div className="space-y-6">
              <CSVUploader
                onCSVProcessed={handleCSVProcessed}
                templateFields={['originalUrl', 'vendorCode', 'count', 'testCount', 'liveCount', 'geoRestriction']} 
                className="mb-4"
              />
              
              {csvData.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Loaded {csvData.length} entries from CSV</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test/Live</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {csvData.slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            <td className="px-6 py-2 text-sm text-gray-900">{row.originalUrl}</td>
                            <td className="px-6 py-2 text-sm text-gray-500">{row.vendorCode || '-'}</td>
                            <td className="px-6 py-2 text-sm text-gray-500">
                              {row.testCount !== undefined && row.liveCount !== undefined 
                                ? Number(row.testCount) + Number(row.liveCount)
                                : row.count || 1}
                            </td>
                            <td className="px-6 py-2 text-sm text-gray-500">
                              {row.testCount !== undefined && row.liveCount !== undefined 
                                ? `${row.testCount} / ${row.liveCount}`
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvData.length > 5 && (
                    <p className="text-sm text-gray-500 mt-2">Showing 5 of {csvData.length} rows...</p>
                  )}
                </div>
              )}
              
              {isSubmitting && batchProgress.total > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Processing Batch</h4>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Processing {batchProgress.current} of {batchProgress.total} rows...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="originalUrl">
                  Original Survey URL
                </label>
                <input
                  id="originalUrl"
                  type="url"
                  placeholder="https://example.com/survey"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  {...register("originalUrl", { required: true })}
                />
                {errors.originalUrl && (
                  <p className="text-red-500 text-xs italic">Original URL is required</p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="vendorId">
                  Vendor
                </label>
                
                <div className="flex items-start">
                  <select
                    id="vendorId"
                    className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-full"
                    {...register("vendorId")}
                  >
                    <option value="">-- No Vendor --</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} ({vendor.code})
                      </option>
                    ))}
                  </select>
                  
                  <button
                    type="button"
                    className="ml-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
                    onClick={() => setShowVendorForm(!showVendorForm)}
                  >
                    {showVendorForm ? 'Cancel' : 'Add Vendor'}
                  </button>
                </div>
                
                {showVendorForm && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <h3 className="font-medium text-gray-700 mb-2">Add New Vendor</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-gray-700 text-sm mb-1" htmlFor="vendorName">
                          Vendor Name
                        </label>
                        <input
                          id="vendorName"
                          type="text"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={vendorName}
                          onChange={(e) => setVendorName(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 text-sm mb-1" htmlFor="vendorCode">
                          Vendor Code
                        </label>
                        <input
                          id="vendorCode"
                          type="text"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={vendorCode}
                          onChange={(e) => setVendorCode(e.target.value)}
                          required
                        />
                        <p className="text-gray-500 text-xs mt-1">A short code to identify this vendor (e.g., "ABC_CORP")</p>
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
                          onClick={handleAddVendor}
                          disabled={addingVendor || !vendorName || !vendorCode}
                        >
                          {addingVendor ? 'Adding...' : 'Add Vendor'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    id="splitLinkTypes"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={splitLinkTypes}
                    onChange={(e) => setSplitLinkTypes(e.target.checked)}
                  />
                  <label htmlFor="splitLinkTypes" className="ml-2 block text-sm text-gray-700">
                    Generate both Test and Live links
                  </label>
                </div>
              </div>
              
              {!splitLinkTypes ? (
                <>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="count">
                      Number of Links to Generate
                    </label>
                    <input
                      id="count"
                      type="number"
                      min="1"
                      max="1000"
                      defaultValue="1"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      {...register("count", { min: 1, max: 1000 })}
                    />
                    {errors.count && (
                      <p className="text-red-500 text-xs italic">Please enter a number between 1 and 1000</p>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Link Type
                    </label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center">
                        <input
                          id="linkTypeLIVE"
                          type="radio"
                          value="LIVE"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          defaultChecked
                          {...register("linkType")}
                        />
                        <label htmlFor="linkTypeLIVE" className="ml-2 block text-sm text-gray-700">
                          Live (Production)
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="linkTypeTEST"
                          type="radio"
                          value="TEST"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          {...register("linkType")}
                        />
                        <label htmlFor="linkTypeTEST" className="ml-2 block text-sm text-gray-700">
                          Test (Relaxed Security)
                        </label>
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      {linkType === 'LIVE' ? 
                        'Live mode enforces all security checks and is meant for production use.' : 
                        'Test mode relaxes security checks for development and testing purposes.'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Link Distribution
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm mb-2" htmlFor="testCount">
                        Test Links
                      </label>
                      <input
                        id="testCount"
                        type="number"
                        min="0"
                        max="1000"
                        defaultValue="0"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        {...register("testCount", { min: 0, max: 1000 })}
                      />
                      <p className="text-gray-500 text-xs mt-1">
                        Test links have relaxed security for development purposes
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2" htmlFor="liveCount">
                        Live Links
                      </label>
                      <input
                        id="liveCount"
                        type="number"
                        min="0"
                        max="1000"
                        defaultValue="0"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        {...register("liveCount", { min: 0, max: 1000 })}
                      />
                      <p className="text-gray-500 text-xs mt-1">
                        Live links enforce all security checks for production use
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      Total links to generate: <span className="font-medium">{Number(testCount || 0) + Number(liveCount || 0)}</span>
                    </p>
                    {(Number(testCount || 0) + Number(liveCount || 0)) > 1000 && (
                      <p className="text-red-500 text-xs italic">Total links must not exceed 1000</p>
                    )}
                    {(Number(testCount || 0) + Number(liveCount || 0)) === 0 && (
                      <p className="text-red-500 text-xs italic">You must generate at least 1 link</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    id="restrictGeo"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    {...register("restrictGeo")}
                    onChange={(e) => setShowCountrySelect(e.target.checked)}
                  />
                  <label htmlFor="restrictGeo" className="ml-2 block text-sm text-gray-700">
                    Restrict by Geography
                  </label>
                </div>
                
                {restrictGeo && showCountrySelect && (
                  <div className="mt-3">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="countries">
                      Allowed Countries
                    </label>
                    <select
                      id="countries"
                      multiple
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      {...register("countries", { required: restrictGeo })}
                      size={5}
                    >
                      {countryCodes.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name} ({country.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-gray-500 text-xs mt-1">
                      Hold Ctrl/Cmd to select multiple countries
                    </p>
                    {errors.countries && (
                      <p className="text-red-500 text-xs italic">Please select at least one country</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
              disabled={isSubmitting || (splitLinkTypes && (Number(testCount || 0) + Number(liveCount || 0)) === 0)}
            >
              {isSubmitting ? 'Generating...' : isBatchMode ? 'Generate Batch Links' : 'Generate Links'}
            </button>
          </div>
        </form>
      </div>
      
      {generatedLinks.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Generated Links</h3>
            <div className="space-x-2">
              <button
                onClick={exportAsCSV}
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={copyAllLinks}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded text-sm"
              >
                Copy All URLs
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {generatedLinks.slice(0, 50).map((link) => (
                  <tr key={link.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {link.uid}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                        link.linkType === 'LIVE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {link.linkType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {link.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <a 
                        href={link.fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {link.fullUrl.length > 50 ? `${link.fullUrl.substring(0, 50)}...` : link.fullUrl}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => copyToClipboard(link.fullUrl)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Copy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {generatedLinks.length > 50 && (
            <p className="text-sm text-gray-500 mt-4">Showing 50 of {generatedLinks.length} links. Please use the export button to access all links.</p>
          )}
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(context: any) {
  const { id } = context.params;
  
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true
      }
    });
    
    if (!project) {
      return {
        notFound: true
      };
    }
    
    return {
      props: {
        project: {
          id: project.id,
          name: project.name
        }
      }
    };
  } catch (error) {
    console.error("Error fetching project:", error);
    return {
      notFound: true
    };
  }
}