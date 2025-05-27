import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import CSVUploader from '@/components/CSVUploader';
import ProtectedRoute from '@/lib/protected-route';
import { getAmplifyDataService } from '@/lib/amplify-data-service';

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

// Type for project
interface Project {
  id: string;
  name: string;
  description?: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const { id } = router.query;
  
  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  
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
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  
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
  
  // Comprehensive list of countries for geography restrictions
  const countryCodes = [
    { code: 'AD', name: 'Andorra' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'AF', name: 'Afghanistan' },
    { code: 'AG', name: 'Antigua and Barbuda' },
    { code: 'AI', name: 'Anguilla' },
    { code: 'AL', name: 'Albania' },
    { code: 'AM', name: 'Armenia' },
    { code: 'AO', name: 'Angola' },
    { code: 'AQ', name: 'Antarctica' },
    { code: 'AR', name: 'Argentina' },
    { code: 'AS', name: 'American Samoa' },
    { code: 'AT', name: 'Austria' },
    { code: 'AU', name: 'Australia' },
    { code: 'AW', name: 'Aruba' },
    { code: 'AX', name: 'Åland Islands' },
    { code: 'AZ', name: 'Azerbaijan' },
    { code: 'BA', name: 'Bosnia and Herzegovina' },
    { code: 'BB', name: 'Barbados' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BF', name: 'Burkina Faso' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'BI', name: 'Burundi' },
    { code: 'BJ', name: 'Benin' },
    { code: 'BL', name: 'Saint Barthélemy' },
    { code: 'BM', name: 'Bermuda' },
    { code: 'BN', name: 'Brunei' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'BQ', name: 'Caribbean Netherlands' },
    { code: 'BR', name: 'Brazil' },
    { code: 'BS', name: 'Bahamas' },
    { code: 'BT', name: 'Bhutan' },
    { code: 'BV', name: 'Bouvet Island' },
    { code: 'BW', name: 'Botswana' },
    { code: 'BY', name: 'Belarus' },
    { code: 'BZ', name: 'Belize' },
    { code: 'CA', name: 'Canada' },
    { code: 'CC', name: 'Cocos Islands' },
    { code: 'CD', name: 'Democratic Republic of the Congo' },
    { code: 'CF', name: 'Central African Republic' },
    { code: 'CG', name: 'Republic of the Congo' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'CI', name: 'Côte d\'Ivoire' },
    { code: 'CK', name: 'Cook Islands' },
    { code: 'CL', name: 'Chile' },
    { code: 'CM', name: 'Cameroon' },
    { code: 'CN', name: 'China' },
    { code: 'CO', name: 'Colombia' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'CU', name: 'Cuba' },
    { code: 'CV', name: 'Cape Verde' },
    { code: 'CW', name: 'Curaçao' },
    { code: 'CX', name: 'Christmas Island' },
    { code: 'CY', name: 'Cyprus' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'DE', name: 'Germany' },
    { code: 'DJ', name: 'Djibouti' },
    { code: 'DK', name: 'Denmark' },
    { code: 'DM', name: 'Dominica' },
    { code: 'DO', name: 'Dominican Republic' },
    { code: 'DZ', name: 'Algeria' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'EE', name: 'Estonia' },
    { code: 'EG', name: 'Egypt' },
    { code: 'EH', name: 'Western Sahara' },
    { code: 'ER', name: 'Eritrea' },
    { code: 'ES', name: 'Spain' },
    { code: 'ET', name: 'Ethiopia' },
    { code: 'FI', name: 'Finland' },
    { code: 'FJ', name: 'Fiji' },
    { code: 'FK', name: 'Falkland Islands' },
    { code: 'FM', name: 'Micronesia' },
    { code: 'FO', name: 'Faroe Islands' },
    { code: 'FR', name: 'France' },
    { code: 'GA', name: 'Gabon' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'GD', name: 'Grenada' },
    { code: 'GE', name: 'Georgia' },
    { code: 'GF', name: 'French Guiana' },
    { code: 'GG', name: 'Guernsey' },
    { code: 'GH', name: 'Ghana' },
    { code: 'GI', name: 'Gibraltar' },
    { code: 'GL', name: 'Greenland' },
    { code: 'GM', name: 'Gambia' },
    { code: 'GN', name: 'Guinea' },
    { code: 'GP', name: 'Guadeloupe' },
    { code: 'GQ', name: 'Equatorial Guinea' },
    { code: 'GR', name: 'Greece' },
    { code: 'GS', name: 'South Georgia and the South Sandwich Islands' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'GU', name: 'Guam' },
    { code: 'GW', name: 'Guinea-Bissau' },
    { code: 'GY', name: 'Guyana' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'HM', name: 'Heard Island and McDonald Islands' },
    { code: 'HN', name: 'Honduras' },
    { code: 'HR', name: 'Croatia' },
    { code: 'HT', name: 'Haiti' },
    { code: 'HU', name: 'Hungary' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IL', name: 'Israel' },
    { code: 'IM', name: 'Isle of Man' },
    { code: 'IN', name: 'India' },
    { code: 'IO', name: 'British Indian Ocean Territory' },
    { code: 'IQ', name: 'Iraq' },
    { code: 'IR', name: 'Iran' },
    { code: 'IS', name: 'Iceland' },
    { code: 'IT', name: 'Italy' },
    { code: 'JE', name: 'Jersey' },
    { code: 'JM', name: 'Jamaica' },
    { code: 'JO', name: 'Jordan' },
    { code: 'JP', name: 'Japan' },
    { code: 'KE', name: 'Kenya' },
    { code: 'KG', name: 'Kyrgyzstan' },
    { code: 'KH', name: 'Cambodia' },
    { code: 'KI', name: 'Kiribati' },
    { code: 'KM', name: 'Comoros' },
    { code: 'KN', name: 'Saint Kitts and Nevis' },
    { code: 'KP', name: 'North Korea' },
    { code: 'KR', name: 'South Korea' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'KY', name: 'Cayman Islands' },
    { code: 'KZ', name: 'Kazakhstan' },
    { code: 'LA', name: 'Laos' },
    { code: 'LB', name: 'Lebanon' },
    { code: 'LC', name: 'Saint Lucia' },
    { code: 'LI', name: 'Liechtenstein' },
    { code: 'LK', name: 'Sri Lanka' },
    { code: 'LR', name: 'Liberia' },
    { code: 'LS', name: 'Lesotho' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LY', name: 'Libya' },
    { code: 'MA', name: 'Morocco' },
    { code: 'MC', name: 'Monaco' },
    { code: 'MD', name: 'Moldova' },
    { code: 'ME', name: 'Montenegro' },
    { code: 'MF', name: 'Saint Martin' },
    { code: 'MG', name: 'Madagascar' },
    { code: 'MH', name: 'Marshall Islands' },
    { code: 'MK', name: 'North Macedonia' },
    { code: 'ML', name: 'Mali' },
    { code: 'MM', name: 'Myanmar' },
    { code: 'MN', name: 'Mongolia' },
    { code: 'MO', name: 'Macao' },
    { code: 'MP', name: 'Northern Mariana Islands' },
    { code: 'MQ', name: 'Martinique' },
    { code: 'MR', name: 'Mauritania' },
    { code: 'MS', name: 'Montserrat' },
    { code: 'MT', name: 'Malta' },
    { code: 'MU', name: 'Mauritius' },
    { code: 'MV', name: 'Maldives' },
    { code: 'MW', name: 'Malawi' },
    { code: 'MX', name: 'Mexico' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'MZ', name: 'Mozambique' },
    { code: 'NA', name: 'Namibia' },
    { code: 'NC', name: 'New Caledonia' },
    { code: 'NE', name: 'Niger' },
    { code: 'NF', name: 'Norfolk Island' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NO', name: 'Norway' },
    { code: 'NP', name: 'Nepal' },
    { code: 'NR', name: 'Nauru' },
    { code: 'NU', name: 'Niue' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'OM', name: 'Oman' },
    { code: 'PA', name: 'Panama' },
    { code: 'PE', name: 'Peru' },
    { code: 'PF', name: 'French Polynesia' },
    { code: 'PG', name: 'Papua New Guinea' },
    { code: 'PH', name: 'Philippines' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'PL', name: 'Poland' },
    { code: 'PM', name: 'Saint Pierre and Miquelon' },
    { code: 'PN', name: 'Pitcairn' },
    { code: 'PR', name: 'Puerto Rico' },
    { code: 'PS', name: 'Palestine' },
    { code: 'PT', name: 'Portugal' },
    { code: 'PW', name: 'Palau' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'QA', name: 'Qatar' },
    { code: 'RE', name: 'Réunion' },
    { code: 'RO', name: 'Romania' },
    { code: 'RS', name: 'Serbia' },
    { code: 'RU', name: 'Russia' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'SB', name: 'Solomon Islands' },
    { code: 'SC', name: 'Seychelles' },
    { code: 'SD', name: 'Sudan' },
    { code: 'SE', name: 'Sweden' },
    { code: 'SG', name: 'Singapore' },
    { code: 'SH', name: 'Saint Helena' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'SJ', name: 'Svalbard and Jan Mayen' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'SL', name: 'Sierra Leone' },
    { code: 'SM', name: 'San Marino' },
    { code: 'SN', name: 'Senegal' },
    { code: 'SO', name: 'Somalia' },
    { code: 'SR', name: 'Suriname' },
    { code: 'SS', name: 'South Sudan' },
    { code: 'ST', name: 'São Tomé and Príncipe' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'SX', name: 'Sint Maarten' },
    { code: 'SY', name: 'Syria' },
    { code: 'SZ', name: 'Eswatini' },
    { code: 'TC', name: 'Turks and Caicos Islands' },
    { code: 'TD', name: 'Chad' },
    { code: 'TF', name: 'French Southern Territories' },
    { code: 'TG', name: 'Togo' },
    { code: 'TH', name: 'Thailand' },
    { code: 'TJ', name: 'Tajikistan' },
    { code: 'TK', name: 'Tokelau' },
    { code: 'TL', name: 'Timor-Leste' },
    { code: 'TM', name: 'Turkmenistan' },
    { code: 'TN', name: 'Tunisia' },
    { code: 'TO', name: 'Tonga' },
    { code: 'TR', name: 'Turkey' },
    { code: 'TT', name: 'Trinidad and Tobago' },
    { code: 'TV', name: 'Tuvalu' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'UA', name: 'Ukraine' },
    { code: 'UG', name: 'Uganda' },
    { code: 'UM', name: 'United States Minor Outlying Islands' },
    { code: 'US', name: 'United States' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'UZ', name: 'Uzbekistan' },
    { code: 'VA', name: 'Vatican City' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'VG', name: 'British Virgin Islands' },
    { code: 'VI', name: 'U.S. Virgin Islands' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'VU', name: 'Vanuatu' },
    { code: 'WF', name: 'Wallis and Futuna' },
    { code: 'WS', name: 'Samoa' },
    { code: 'YE', name: 'Yemen' },
    { code: 'YT', name: 'Mayotte' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'ZM', name: 'Zambia' },
    { code: 'ZW', name: 'Zimbabwe' }
  ];
  
  // Helper functions for country selection
  const handleCountryToggle = (countryCode: string) => {
    setSelectedCountries(prev => {
      if (prev.includes(countryCode)) {
        return prev.filter(code => code !== countryCode);
      } else {
        return [...prev, countryCode];
      }
    });
  };

  const handleSelectAllCountries = () => {
    setSelectedCountries(countryCodes.map(country => country.code));
  };

  const handleClearAllCountries = () => {
    setSelectedCountries([]);
  };

  const getSelectedCountryNames = () => {
    return selectedCountries.map(code => {
      const country = countryCodes.find(c => c.code === code);
      return country ? country.name : code;
    }).join(', ');
  };
  
  // Fetch project data on mount
  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    
    const fetchProject = async () => {
      try {
        setIsLoadingProject(true);
        const amplifyDataService = await getAmplifyDataService();
        const projectResult = await amplifyDataService.projects.get(id);
        const projectData = projectResult.data;
        
        if (projectData) {
          setProject({
            id: projectData.id,
            name: projectData.name,
            description: projectData.description || undefined
          });
        } else {
          setError('Project not found');
        }
      } catch (error) {
        console.error('Failed to fetch project:', error);
        setError('Failed to load project');
      } finally {
        setIsLoadingProject(false);
      }
    };
    
    fetchProject();
  }, [id]);
  
  // Fetch vendors for this project on mount
  useEffect(() => {
    if (!project?.id) return; // Add guard clause to prevent execution when project is undefined
    
    const fetchVendors = async () => {
      try {
        const response = await axios.get(`/api/vendors/list?projectId=${project?.id}`);
        if (response.data.success) {
          setVendors(response.data.vendors);
        }
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
      }
    };
    
    fetchVendors();
  }, [project?.id]); // Use optional chaining to prevent undefined access
  
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
          projectId: project?.id,
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
      if (data.restrictGeo && selectedCountries.length > 0) {
        geoRestriction = selectedCountries;
      }

      const payload: any = {
        projectId: project?.id,
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
        projectId: project?.id,
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
    link.setAttribute('download', `${project?.name?.replace(/\s+/g, '_') || 'project'}_links_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <ProtectedRoute>
      {/* Loading state */}
      {isLoadingProject ? (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading project...</p>
          </div>
        </div>
      ) : !project ? (
        /* Error state */
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-700 mb-6">{error || 'Project not found'}</p>
            <Link 
              href="/admin" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        /* Main content */
        <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link 
          href={`/admin/projects/${project?.id}`}
          className="text-blue-600 hover:text-blue-800"
        >
          &larr; Back to project
        </Link>
        <h1 className="text-3xl font-bold mt-2">{project?.name}</h1>
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
                    onChange={(e) => {
                      setShowCountrySelect(e.target.checked);
                      // If unchecking, clear selected countries
                      if (!e.target.checked) {
                        setSelectedCountries([]);
                      }
                    }}
                  />
                  <label htmlFor="restrictGeo" className="ml-2 block text-sm text-gray-700">
                    Restrict by Geography
                  </label>
                </div>
                
                {restrictGeo && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-gray-700 text-sm font-bold">
                        Allowed Countries ({selectedCountries.length} selected)
                      </label>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={handleSelectAllCountries}
                          className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllCountries}
                          className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    
                    {selectedCountries.length > 0 && (
                      <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                        <strong>Selected:</strong> {getSelectedCountryNames()}
                      </div>
                    )}
                    
                    <div className="max-h-64 overflow-y-auto border border-gray-300 rounded bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 p-2">
                        {countryCodes.map(country => (
                          <label 
                            key={country.code} 
                            className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${
                              selectedCountries.includes(country.code) ? 'bg-blue-100 text-blue-800' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCountries.includes(country.code)}
                              onChange={() => handleCountryToggle(country.code)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm">
                              {country.name} ({country.code})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <p className="text-gray-500 text-xs mt-2">
                      Survey links will only work in the selected countries. Users from other countries will see a "not available in your region" message.
                    </p>
                    
                    {restrictGeo && selectedCountries.length === 0 && (
                      <p className="text-red-500 text-xs mt-2">Please select at least one country when geography restriction is enabled</p>
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
              disabled={
                isSubmitting || 
                (splitLinkTypes && (Number(testCount || 0) + Number(liveCount || 0)) === 0) ||
                (restrictGeo && selectedCountries.length === 0)
              }
            >
              {isSubmitting ? 'Generating...' : isBatchMode ? 'Generate Batch Links' : 'Generate Links'}
            </button>
            {restrictGeo && selectedCountries.length === 0 && (
              <p className="text-red-500 text-sm">Select countries to enable generation</p>
            )}
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
      )}
    </ProtectedRoute>
  );
}