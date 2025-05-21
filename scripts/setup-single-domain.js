#!/usr/bin/env node

/**
 * Pre-build script to ensure environment is correctly configured
 * for the single-domain architecture
 */

console.log('Setting up single-domain configuration...');

// Set environment variables
process.env.NEXT_PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';

// No longer need to set NEXT_PUBLIC_ADMIN_DOMAIN since we're not using subdomains
if (process.env.NEXT_PUBLIC_ADMIN_DOMAIN) {
  console.log('Note: NEXT_PUBLIC_ADMIN_DOMAIN is set but will be ignored with single-domain approach');
}

console.log('Domain configuration:');
console.log(`- Main domain: ${process.env.NEXT_PUBLIC_DOMAIN}`);
console.log('- Admin access: Available via /admin route on main domain');

// Continue to next build step
process.exit(0);
