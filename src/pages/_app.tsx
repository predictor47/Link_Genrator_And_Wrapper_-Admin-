import { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import { AuthProvider } from '@/lib/auth-provider';
import { getAmplifyConfig } from '@/lib/amplify-config';
import { Amplify } from 'aws-amplify';

// Configure Amplify as early as possible
if (typeof window !== 'undefined') {
  const amplifyConfig = getAmplifyConfig();
  Amplify.configure(amplifyConfig);
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Survey Link Wrapper</title>
        <meta name="description" content="Wrapping third-party survey links with a validation layer" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </>
  );
}