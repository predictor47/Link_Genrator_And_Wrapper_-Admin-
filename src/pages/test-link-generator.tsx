import ClientSideLinkGenerator from '@/components/ClientSideLinkGenerator';

export default function TestLinkGenerator() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Link Generator Test</h1>
          <p className="text-gray-600">Test the new high-performance link generator</p>
        </div>
        
        <ClientSideLinkGenerator
          projectId="test-project-123"
          onComplete={(links) => {
            console.log('Generated links:', links);
            alert(`Successfully generated ${links.length} links!`);
          }}
        />
      </div>
    </div>
  );
}
