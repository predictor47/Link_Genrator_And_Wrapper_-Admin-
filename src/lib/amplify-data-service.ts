import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from './amplify-config';
import type { Schema } from '../../amplify/data/resource';

// Initialize Amplify with type assertion to avoid type errors
Amplify.configure(amplifyConfig as any);

// Generate a type-safe client for data operations
const client = generateClient<Schema>();

// Helper to safely unwrap data from Amplify responses
const unwrapData = <T>(result: { data: T | null }): T | null => result.data;

/**
 * Amplify Data Service - Replaces Prisma client with AWS Amplify data operations
 * This service provides CRUD operations for all models in the application
 */
export const amplifyDataService = {
  // Project operations
  projects: {
    create: async (data: any) => {
      const result = await client.models.Project.create(data);
      return { data: unwrapData(result) };
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
        });
        
        const vendors = await client.models.Vendor.list({
          filter: { projectId: { eq: id } }
        });
        
        const questions = await client.models.Question.list({
          filter: { projectId: { eq: id } }
        });
        
        // Combine project with its related data
        return {
          data: {
            ...project.data,
            surveyLinks: surveyLinks.data || [],
            vendors: vendors.data || [],
            questions: questions.data || []
          }
        };
      }
      
      return { data: null };
    }
  },

  // SurveyLink operations
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

  // Vendor operations
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
      const result = await client.models.Vendor.list({ filter: { projectId: { eq: projectId } } });
      return { data: result.data || [] };
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

  // Question operations
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

  // Response operations
  responses: {
    create: async (data: any) => {
      const result = await client.models.Response.create(data);
      return { data: unwrapData(result) };
    },
    get: async (id: string) => {
      const result = await client.models.Response.get({ id });
      return { data: unwrapData(result) };
    },
    list: async (filter?: any) => {
      const result = await client.models.Response.list(filter);
      return { data: result.data || [] };
    },
    listByProject: async (projectId: string) => {
      const result = await client.models.Response.list({ filter: { projectId: { eq: projectId } } });
      return { data: result.data || [] };
    },
    listBySurveyLink: async (surveyLinkId: string) => {
      const result = await client.models.Response.list({ filter: { surveyLinkId: { eq: surveyLinkId } } });
      return { data: result.data || [] };
    },
    delete: async (id: string) => {
      const result = await client.models.Response.delete({ id });
      return { data: unwrapData(result) };
    }
  },

  // Flag operations
  flags: {
    create: async (data: any) => {
      const result = await client.models.Flag.create(data);
      return { data: unwrapData(result) };
    },
    get: async (id: string) => {
      const result = await client.models.Flag.get({ id });
      return { data: unwrapData(result) };
    },
    list: async (filter?: any) => {
      const result = await client.models.Flag.list(filter);
      return { data: result.data || [] };
    },
    listByProject: async (projectId: string) => {
      const result = await client.models.Flag.list({ filter: { projectId: { eq: projectId } } });
      return { data: result.data || [] };
    },
    listBySurveyLink: async (surveyLinkId: string) => {
      const result = await client.models.Flag.list({ filter: { surveyLinkId: { eq: surveyLinkId } } });
      return { data: result.data || [] };
    },
    delete: async (id: string) => {
      const result = await client.models.Flag.delete({ id });
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