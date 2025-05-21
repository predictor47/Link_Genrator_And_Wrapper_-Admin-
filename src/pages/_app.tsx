import { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import { AuthProvider } from '@/lib/auth-provider';
import { configureAmplify } from '@/lib/amplify-config';

// Ensure Amplify is configured once at the app level
configureAmplify();

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