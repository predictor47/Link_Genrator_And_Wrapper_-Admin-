import React, { useState, useEffect } from 'react';

interface QCFlag {
  id: string;
  projectId: string;
  uid: string;
  qcScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: string[];
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  responses?: Record<string, any>;
  details?: any;
  recommendations?: string[];
}

interface QCDashboardProps {
  projectId: string;
  onFlagUpdate?: (flagId: string, newStatus: string) => void;
}

export default function QCDashboard({ projectId, onFlagUpdate }: QCDashboardProps) {
  const [flags, setFlags] = useState<QCFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'HIGH_RISK'>('PENDING');
  const [selectedFlag, setSelectedFlag] = useState<QCFlag | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQCFlags();
  }, [projectId, filter]);

  const fetchQCFlags = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/qc/flags?projectId=${projectId}&filter=${filter}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch QC flags');
      }
      
      const data = await response.json();
      setFlags(data.flags || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const updateFlagStatus = async (flagId: string, newStatus: string, reasoning?: string) => {
    try {
      const response = await fetch('/api/qc/update-flag-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagId,
          status: newStatus,
          reasoning,
          reviewedBy: 'admin', // In real app, get from auth context
          reviewedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update flag status');
      }

      // Update local state
      setFlags(flags.map(flag => 
        flag.id === flagId ? { ...flag, status: newStatus as any } : flag
      ));

      if (onFlagUpdate) {
        onFlagUpdate(flagId, newStatus);
      }

      // Close detail view if we were looking at this flag
      if (selectedFlag?.id === flagId) {
        setSelectedFlag(null);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flag');
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return 'bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium';
      case 'HIGH': return 'bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium';
      case 'MEDIUM': return 'bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-medium';
      case 'LOW': return 'bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium';
      default: return 'bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium';
      case 'REJECTED': return 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium';
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium';
      case 'PENDING': return 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium';
      default: return 'bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium';
    }
  };

  const getFlagIcon = (flagText: string) => {
    const flagType = flagText.split(':')[0];
    switch (flagType) {
      case 'BLACKLISTED_DOMAIN':
        return '🛡️';
      case 'AI_GENERATED':
        return '🤖';
      case 'FLATLINE':
        return '⚠️';
      case 'SPEED_ISSUE':
        return '⏱️';
      case 'HONEYPOT':
        return '👁️';
      case 'BEHAVIORAL':
        return '👤';
      default:
        return '⚠️';
    }
  };

  const filteredFlags = flags.filter(flag => {
    switch (filter) {
      case 'PENDING':
        return flag.status === 'PENDING';
      case 'HIGH_RISK':
        return ['HIGH', 'CRITICAL'].includes(flag.riskLevel);
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading QC flags...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">Error Loading QC Data</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Quality Control Dashboard</h3>
          <p className="text-gray-600">Review and manage flagged survey responses</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="ALL">All Flags</option>
              <option value="PENDING">Pending Review</option>
              <option value="HIGH_RISK">High Risk Only</option>
            </select>
          </div>
          
          <button 
            onClick={fetchQCFlags}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Flags</p>
              <p className="text-2xl font-bold text-gray-900">{flags.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">
                {flags.filter(f => f.status === 'PENDING').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-gray-900">
                {flags.filter(f => ['HIGH', 'CRITICAL'].includes(f.riskLevel)).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">
                {flags.filter(f => ['APPROVED', 'REJECTED'].includes(f.status)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Flags List */}
      <div className="bg-white shadow rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">QC Flags ({filteredFlags.length})</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {filteredFlags.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <p>No flags found matching the current filter.</p>
              </div>
            ) : (
              filteredFlags.map((flag) => (
                <div 
                  key={flag.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedFlag(flag)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className={getRiskColor(flag.riskLevel)}>
                        {flag.riskLevel}
                      </span>
                      
                      <div>
                        <p className="font-medium text-gray-900">
                          Survey UID: {flag.uid.substring(0, 8)}...
                        </p>
                        <p className="text-sm text-gray-500">
                          QC Score: {flag.qcScore} | Flags: {flag.flags.length}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(flag.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={getStatusColor(flag.status)}>
                        {flag.status.replace('_', ' ')}
                      </span>
                      
                      <div className="flex space-x-1">
                        {flag.flags.slice(0, 3).map((flagText, index) => (
                          <div key={index} className="p-1 bg-gray-100 rounded text-sm">
                            {getFlagIcon(flagText)}
                          </div>
                        ))}
                        {flag.flags.length > 3 && (
                          <div className="p-1 bg-gray-100 rounded text-xs">
                            +{flag.flags.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Flag Details */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {flag.flags.slice(0, 3).map((flagText, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border">
                        {flagText.split(':')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Flag Detail Modal */}
      {selectedFlag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    QC Flag Details
                  </h3>
                  <p className="text-gray-600">UID: {selectedFlag.uid}</p>
                </div>
                
                <button 
                  onClick={() => setSelectedFlag(null)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  ✕ Close
                </button>
              </div>

              {/* Flag Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">QC Score</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedFlag.qcScore}</p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Risk Level</p>
                  <span className={getRiskColor(selectedFlag.riskLevel)}>
                    {selectedFlag.riskLevel}
                  </span>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Flag Count</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedFlag.flags.length}</p>
                </div>
              </div>

              {/* Detailed Flags */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">Detected Issues</h4>
                <div className="space-y-2">
                  {selectedFlag.flags.map((flagText, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                      <span className="text-lg">{getFlagIcon(flagText)}</span>
                      <span className="font-medium text-red-800">{flagText}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {selectedFlag.recommendations && selectedFlag.recommendations.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">Recommendations</h4>
                  <div className="space-y-2">
                    {selectedFlag.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <svg className="w-4 h-4 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-700">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedFlag.status === 'PENDING' && (
                <div className="flex space-x-4 pt-4 border-t">
                  <button 
                    onClick={() => updateFlagStatus(selectedFlag.id, 'APPROVED')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Approve Response
                  </button>
                  
                  <button 
                    onClick={() => updateFlagStatus(selectedFlag.id, 'REJECTED')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject Response
                  </button>
                  
                  <button 
                    onClick={() => updateFlagStatus(selectedFlag.id, 'UNDER_REVIEW')}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mark for Review
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
