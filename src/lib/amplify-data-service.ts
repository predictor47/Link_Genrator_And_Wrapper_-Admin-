import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import { getAmplifyConfig } from './amplify-config';
import type { Schema } from '../../amplify/data/resource';

let amplifyDataService: any = null;

export async function getAmplifyDataService() {
  if (typeof window === 'undefined') {
    throw new Error('amplifyDataService can only be used on the client/browser.');
  }
  if (amplifyDataService) return amplifyDataService;

  const amplifyConfig = getAmplifyConfig();
  if (!amplifyConfig?.API?.GraphQL?.endpoint) {
    throw new Error('Amplify config is missing GraphQL endpoint.');
  }
  Amplify.configure(amplifyConfig as any);

  const client = generateClient<Schema>({ authMode: 'userPool' });
  // Debug logging
console.log('Amplify Data client:', client);
console.log('client.models:', client.models);
if (!client.models) {
  console.error('client.models is undefined!');
} else if (!client.models.Project) {
  console.error('Project model is missing from Amplify Data client!');
} else {
  console.log('Project model:', client.models.Project);
  if (typeof client.models.Project.create !== 'function') {
    console.error('Project model does not have a create method!');
  } else {
    console.log('Project model create method is present.');
  }
}

  // Helper to safely unwrap data from Amplify responses
  const unwrapData = <T>(result: { data: T | null }): T | null => result.data;
  // Helper to handle Amplify errors in a consistent way
  const handleAmplifyError = (error: any, operation: string) => {
    const errorMessage = error.message || 'Unknown error';
    const errorName = error.name || 'Error';
    console.error(`Amplify Error (${operation}):`, { name: errorName, message: errorMessage });
    throw error;
  };

  amplifyDataService = {
    client,
    projects: {
      create: async (data: any) => {
        try {
          const result = await client.models.Project.create(data);
          return { data: unwrapData(result) };
        } catch (error) {
          handleAmplifyError(error, 'projects.create');
        }
      },
      get: async (id: string) => {
        const result = await client.models.Project.get({ id });
        return { data: unwrapData(result) };
      },
      list: async (filter?: any) => {
        const result = await client.models.Project.list(filter);
        return { data: result.data || [] };
      },
      update: async (id: string, data: any) => {
        const result = await client.models.Project.update({ id, ...data });
        return { data: unwrapData(result) };
      },
      delete: async (id: string) => {
        const result = await client.models.Project.delete({ id });
        return { data: unwrapData(result) };
      },
      getWithRelations: async (id: string) => {
        // Fix: Remove problematic selection set and handle relationships separately
        const project = await client.models.Project.get({ id });
        
        if (project.data) {
          // Fetch related data separately to avoid deep type instantiation
          const surveyLinks = await client.models.SurveyLink.list({
            filter: { projectId: { eq: id } }
          });        // First get ProjectVendor relationships for this project
          const projectVendors = await client.models.ProjectVendor.list({
            filter: { projectId: { eq: id } }
          });        // Then get the actual vendors if there are project-vendor relationships
          const vendorIds = projectVendors.data
            .map(pv => pv.vendorId)
            .filter((id): id is string => id !== null && id !== undefined);
          
          // Use explicit type for vendorData
          let vendorData: any[] = [];
          
          // Fetch vendors if there are any relationships
          if (vendorIds.length > 0) {
            const vendorResults = await Promise.all(
              vendorIds.map(vid => client.models.Vendor.get({ id: vid }))
            );
            // Extract data from each result
            vendorData = vendorResults
              .filter(result => result.data !== null)
              .map(result => result.data);
          }
          
          const questions = await client.models.Question.list({
            filter: { projectId: { eq: id } }
          });
          
          // Combine project with its related data
          return {
            data: {
              ...project.data,
              surveyLinks: surveyLinks.data || [],
              vendors: vendorData,
              questions: questions.data || []
            }
          };
        }
        
        return { data: null };
      }
    },
    surveyLinks: {
      create: async (data: any) => {
        const result = await client.models.SurveyLink.create(data);
        return { data: unwrapData(result) };
      },
      get: async (id: string) => {
        const result = await client.models.SurveyLink.get({ id });
        return { data: unwrapData(result) };
      },
      getByUid: async (uid: string) => {
        const results = await client.models.SurveyLink.list({ filter: { uid: { eq: uid } } });
        return { data: (results.data && results.data.length > 0) ? results.data[0] : null };
      },
      update: async (id: string, data: any) => {
        const result = await client.models.SurveyLink.update({ id, ...data });
        return { data: unwrapData(result) };
      },
      list: async (filter?: any) => {
        const result = await client.models.SurveyLink.list(filter);
        return { data: result.data || [] };
      },
      listByProject: async (projectId: string) => {
        const result = await client.models.SurveyLink.list({ filter: { projectId: { eq: projectId } } });
        return { data: result.data || [] };
      },
      delete: async (id: string) => {
        const result = await client.models.SurveyLink.delete({ id });
        return { data: unwrapData(result) };
      }
    },
    vendors: {
      create: async (data: any) => {
        const result = await client.models.Vendor.create(data);
        return { data: unwrapData(result) };
      },
      get: async (id: string) => {
        const result = await client.models.Vendor.get({ id });
        return { data: unwrapData(result) };
      },
      list: async (filter?: any) => {
        const result = await client.models.Vendor.list(filter);
        return { data: result.data || [] };
      },    listByProject: async (projectId: string) => {
        // Get project-vendor relationships first
        const projectVendors = await client.models.ProjectVendor.list({
          filter: { projectId: { eq: projectId } }
        });
        // Get vendor IDs from relationships
        const vendorIds = projectVendors.data
          .map(pv => pv.vendorId)
          .filter((id): id is string => id !== null && id !== undefined);
        // Fetch each vendor individually if there are any relationships
        if (vendorIds.length > 0) {
          const vendorResults = await Promise.all(
            vendorIds.map(vid => client.models.Vendor.get({ id: vid }))
          );
          // Extract data from each result and filter out nulls
          const vendorData = vendorResults
            .map(result => result.data)
            .filter((v): v is NonNullable<typeof v> => v !== null);
          return { data: vendorData };
        }
        return { data: [] };
      },
      update: async (id: string, data: any) => {
        const result = await client.models.Vendor.update({ id, ...data });
        return { data: unwrapData(result) };
      },
      delete: async (id: string) => {
        const result = await client.models.Vendor.delete({ id });
        return { data: unwrapData(result) };
      }
    },
    questions: {
      create: async (data: any) => {
        const result = await client.models.Question.create(data);
        return { data: unwrapData(result) };
      },
      get: async (id: string) => {
        const result = await client.models.Question.get({ id });
        return { data: unwrapData(result) };
      },
      list: async (filter?: any) => {
        const result = await client.models.Question.list(filter);
        return { data: result.data || [] };
      },
      listByProject: async (projectId: string) => {
        const result = await client.models.Question.list({ filter: { projectId: { eq: projectId } } });
        return { data: result.data || [] };
      },
      update: async (id: string, data: any) => {
        const result = await client.models.Question.update({ id, ...data });
        return { data: unwrapData(result) };
      },
      delete: async (id: string) => {
        const result = await client.models.Question.delete({ id });
        return { data: unwrapData(result) };
      }
    },
    /* Response operations - removed because Response model doesn't exist in schema
    responses: {
      create: async (data: any) => {
        // const result = await client.models.Response.create(data);
        return { data: null };
      },
      get: async (id: string) => {
        // const result = await client.models.Response.get({ id });
        return { data: null };
      },
      list: async (filter?: any) => {
        // const result = await client.models.Response.list(filter);
        return { data: [] };
      },
      listByProject: async (projectId: string) => {
        // const result = await client.models.Response.list({ filter: { projectId: { eq: projectId } } });
        return { data: [] };
      },
      listBySurveyLink: async (surveyLinkId: string) => {
        // const result = await client.models.Response.list({ filter: { surveyLinkId: { eq: surveyLinkId } } });
        return { data: [] };
      },
      delete: async (id: string) => {
        // const result = await client.models.Response.delete({ id });
        return { data: null };
      }
    },
    */
    /* Flag operations - removed because Flag model doesn't exist in schema
    flags: {
      create: async (data: any) => {
        // const result = await client.models.Flag.create(data);
        return { data: null };
      },
      get: async (id: string) => {
        // const result = await client.models.Flag.get({ id });
        return { data: null };
      },    list: async (filter?: any) => {
        // const result = await client.models.Flag.list(filter);
        return { data: [] };
      },
      listByProject: async (projectId: string) => {
        // const result = await client.models.Flag.list({ filter: { projectId: { eq: projectId } } });
        return { data: [] };
      },
      listBySurveyLink: async (surveyLinkId: string) => {
        // const result = await client.models.Flag.list({ filter: { surveyLinkId: { eq: surveyLinkId } } });
        return { data: [] };
      },
      delete: async (id: string) => {
        // const result = await client.models.Flag.delete({ id });
        return { data: null };
      }
    },
    */

    // Helper for transactions (not directly supported in Amplify Data, using batch operations)
    transaction: {
      execute: async (operations: any[]) => {
        // Execute operations in sequence
        const results = [];
        for (const operation of operations) {
          const result = await operation;
          results.push(result);
        }
        return results;
      }
    }
  };
  return amplifyDataService;
}