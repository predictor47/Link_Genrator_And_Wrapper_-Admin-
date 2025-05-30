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
  if (!amplifyConfig?.data?.url) {
    throw new Error('Amplify config is missing GraphQL endpoint.');
  }
  Amplify.configure(amplifyConfig);

  const client = generateClient<Schema>({ authMode: 'userPool' });
  
  // Debug logging
  console.log('Amplify Data client:', client);
  console.log('client.models:', client.models);
  
  // Check if models are available
  if (!client.models || Object.keys(client.models).length === 0) {
    console.error('client.models is empty! This usually means the Amplify backend is not properly connected.');
    throw new Error('Amplify Data models are not available. Please check your backend connection.');
  }
  
  // Verify required models exist
  const requiredModels = ['Project', 'Vendor', 'Question', 'SurveyLink', 'ProjectVendor'] as const;
  for (const modelName of requiredModels) {
    if (!client.models[modelName]) {
      console.error(`${modelName} model is missing from Amplify Data client!`);
      throw new Error(`Required model ${modelName} is not available in the Amplify Data client.`);
    }
  }
  
  console.log('All required models are available:', requiredModels);

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
          return { data: null };
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
      deleteWithCascade: async (id: string) => {
        try {
          // First, fetch all related data
          const [surveyLinksResult, questionsResult, projectVendorsResult] = await Promise.all([
            client.models.SurveyLink.list({ filter: { projectId: { eq: id } } }),
            client.models.Question.list({ filter: { projectId: { eq: id } } }),
            client.models.ProjectVendor.list({ filter: { projectId: { eq: id } } })
          ]);

          // Delete all related survey links
          const surveyLinkDeletions = (surveyLinksResult.data || []).map((link: any) =>
            client.models.SurveyLink.delete({ id: link.id })
          );

          // Delete all related questions
          const questionDeletions = (questionsResult.data || []).map((question: any) =>
            client.models.Question.delete({ id: question.id })
          );

          // Delete all project-vendor relationships
          const projectVendorDeletions = (projectVendorsResult.data || []).map((pv: any) =>
            client.models.ProjectVendor.delete({ id: pv.id })
          );

          // Execute all deletions in parallel
          await Promise.all([
            ...surveyLinkDeletions,
            ...questionDeletions,
            ...projectVendorDeletions
          ]);

          // Finally, delete the project itself
          const result = await client.models.Project.delete({ id });
          
          return { 
            data: unwrapData(result),
            deletedRelatedData: {
              surveyLinks: surveyLinksResult.data?.length || 0,
              questions: questionsResult.data?.length || 0,
              projectVendors: projectVendorsResult.data?.length || 0
            }
          };
        } catch (error) {
          handleAmplifyError(error, 'projects.deleteWithCascade');
          return { data: null };
        }
      },
      getWithRelations: async (id: string) => {
        // Fetch project and related data separately
        const project = await client.models.Project.get({ id });
        
        if (project.data) {
          // Fetch related data separately
          const surveyLinks = await client.models.SurveyLink.list({
            filter: { projectId: { eq: id } }
          });
          
          // First get ProjectVendor relationships for this project
          const projectVendors = await client.models.ProjectVendor.list({
            filter: { projectId: { eq: id } }
          });
          
          // Then get the actual vendors if there are project-vendor relationships
          const vendorIds = projectVendors.data
            .map((pv: any) => pv.vendorId)
            .filter((id: any): id is string => id !== null && id !== undefined);
          
          let vendorData: any[] = [];
          
          // Fetch vendors if there are any relationships
          if (vendorIds.length > 0) {
            const vendorResults = await Promise.all(
              vendorIds.map((vid: string) => client.models.Vendor.get({ id: vid }))
            );
            // Extract data from each result
            vendorData = vendorResults
              .filter((result: any) => result.data !== null)
              .map((result: any) => result.data);
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
      },
      listByProject: async (projectId: string) => {
        // Get project-vendor relationships first
        const projectVendors = await client.models.ProjectVendor.list({
          filter: { projectId: { eq: projectId } }
        });
        // Get vendor IDs from relationships
        const vendorIds = projectVendors.data
          .map((pv: any) => pv.vendorId)
          .filter((id: any): id is string => id !== null && id !== undefined);
        // Fetch each vendor individually if there are any relationships
        if (vendorIds.length > 0) {
          const vendorResults = await Promise.all(
            vendorIds.map((vid: string) => client.models.Vendor.get({ id: vid }))
          );
          // Extract data from each result and filter out nulls
          const vendorData = vendorResults
            .map((result: any) => result.data)
            .filter((v: any): v is NonNullable<typeof v> => v !== null);
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

    projectVendors: {
      create: async (data: any) => {
        const result = await client.models.ProjectVendor.create(data);
        return { data: unwrapData(result) };
      },
      get: async (id: string) => {
        const result = await client.models.ProjectVendor.get({ id });
        return { data: unwrapData(result) };
      },
      list: async (filter?: any) => {
        const result = await client.models.ProjectVendor.list(filter);
        return { data: result.data || [] };
      },
      listByProject: async (projectId: string) => {
        const result = await client.models.ProjectVendor.list({ filter: { projectId: { eq: projectId } } });
        return { data: result.data || [] };
      },
      update: async (id: string, data: any) => {
        const result = await client.models.ProjectVendor.update({ id, ...data });
        return { data: unwrapData(result) };
      },
      delete: async (id: string) => {
        const result = await client.models.ProjectVendor.delete({ id });
        return { data: unwrapData(result) };
      }
    },

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