import Link from 'next/link';
import { useRouter } from 'next/router';

export default function LandingPage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Survey Link Wrapper</h1>
          <Link
            href="/admin"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Admin Panel
          </Link>
        </nav>
      </header>
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Survey Validation Made Simple
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Ensure high-quality survey responses with our advanced validation system.
            Protect your surveys from bots and low-quality respondents.
          </p>
          <div className="mt-8">
            <Link
              href="/admin"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md text-base font-medium shadow-md"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>
      
      {/* Feature Section */}
      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          How It Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center text-xl font-bold mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">CAPTCHA Verification</h3>
            <p className="text-gray-600">
              Authenticate real humans with CAPTCHA verification before they access your surveys.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center text-xl font-bold mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">Pre-survey Questions</h3>
            <p className="text-gray-600">
              Collect initial responses to validate against mid-survey checks for consistency.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center text-xl font-bold mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">Validation & Flagging</h3>
            <p className="text-gray-600">
              Automatically detect and flag suspicious behavior with our advanced validation system.
            </p>
          </div>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section className="bg-gray-100 py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Benefits
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 text-green-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Higher Quality Data</h3>
                <p className="text-gray-600">Ensure your survey responses come from real humans who pay attention.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 text-green-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Bot Protection</h3>
                <p className="text-gray-600">Stop automated scripts and bots from corrupting your survey data.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 text-green-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Easy Integration</h3>
                <p className="text-gray-600">Works with any third-party survey platform without complex setup.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 text-green-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Detailed Analytics</h3>
                <p className="text-gray-600">Get insights on flagged responses and validation patterns.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center max-w-4xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to improve your survey data?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Get started today and ensure your survey results are accurate and reliable.
        </p>
        <Link
          href="/admin"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white py-3 px-8 rounded-md text-lg font-medium shadow-md"
        >
          Access Admin Panel
        </Link>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold">Survey Link Wrapper</h3>
              <p className="text-gray-300 mt-1">Ensuring quality survey responses</p>
            </div>
            <div>
              <p className="text-gray-400">© {new Date().getFullYear()} Survey Link Wrapper. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}