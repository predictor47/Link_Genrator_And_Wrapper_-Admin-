import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from './amplify-config';
import type { Schema } from '../../amplify/data/resource';

// Initialize Amplify with type assertion to avoid type errors
Amplify.configure(amplifyConfig as any);

// Generate a type-safe client for data operations
const client = generateClient<Schema>();

/**
 * Amplify Data Service - Replaces Prisma client with AWS Amplify data operations
 * This service provides CRUD operations for all models in the application
 */
export const amplifyDataService = {
  // Project operations
  projects: {
    create: async (data: any) => {
      const result = await client.models.Project.create(data);
      return result.data;
    },
    get: async (id: string) => {
      const result = await client.models.Project.get({ id });
      return result.data;
    },
    list: async (filter?: any) => {
      const result = await client.models.Project.list(filter);
      return result;
    },
    update: async (id: string, data: any) => {
      const result = await client.models.Project.update({ id, ...data });
      return result.data;
    },
    delete: async (id: string) => {
      const result = await client.models.Project.delete({ id });
      return result.data;
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
          ...project.data,
          surveyLinks: surveyLinks.data,
          vendors: vendors.data,
          questions: questions.data
        };
      }
      
      return null;
    }
  },

  // SurveyLink operations
  surveyLinks: {
    create: async (data: any) => {
      return client.models.SurveyLink.create(data);
    },
    get: async (id: string) => {
      return client.models.SurveyLink.get({ id });
    },
    getByUid: async (uid: string) => {
      const results = await client.models.SurveyLink.list({ filter: { uid: { eq: uid } } });
      return results.data[0] || null;
    },
    update: async (id: string, data: any) => {
      return client.models.SurveyLink.update({ id, ...data });
    },
    list: async (filter?: any) => {
      return client.models.SurveyLink.list(filter);
    },
    listByProject: async (projectId: string) => {
      return client.models.SurveyLink.list({ filter: { projectId: { eq: projectId } } });
    }
  },

  // Vendor operations
  vendors: {
    create: async (data: any) => {
      return client.models.Vendor.create(data);
    },
    get: async (id: string) => {
      return client.models.Vendor.get({ id });
    },
    list: async (filter?: any) => {
      return client.models.Vendor.list(filter);
    },
    listByProject: async (projectId: string) => {
      return client.models.Vendor.list({ filter: { projectId: { eq: projectId } } });
    },
    update: async (id: string, data: any) => {
      return client.models.Vendor.update({ id, ...data });
    },
    delete: async (id: string) => {
      return client.models.Vendor.delete({ id });
    }
  },

  // Question operations
  questions: {
    create: async (data: any) => {
      return client.models.Question.create(data);
    },
    get: async (id: string) => {
      return client.models.Question.get({ id });
    },
    list: async (filter?: any) => {
      return client.models.Question.list(filter);
    },
    listByProject: async (projectId: string) => {
      return client.models.Question.list({ filter: { projectId: { eq: projectId } } });
    },
    update: async (id: string, data: any) => {
      return client.models.Question.update({ id, ...data });
    },
    delete: async (id: string) => {
      return client.models.Question.delete({ id });
    }
  },

  // Response operations
  responses: {
    create: async (data: any) => {
      return client.models.Response.create(data);
    },
    get: async (id: string) => {
      return client.models.Response.get({ id });
    },
    list: async (filter?: any) => {
      return client.models.Response.list(filter);
    },
    listByProject: async (projectId: string) => {
      return client.models.Response.list({ filter: { projectId: { eq: projectId } } });
    },
    listBySurveyLink: async (surveyLinkId: string) => {
      return client.models.Response.list({ filter: { surveyLinkId: { eq: surveyLinkId } } });
    }
  },

  // Flag operations
  flags: {
    create: async (data: any) => {
      return client.models.Flag.create(data);
    },
    get: async (id: string) => {
      return client.models.Flag.get({ id });
    },
    list: async (filter?: any) => {
      return client.models.Flag.list(filter);
    },
    listByProject: async (projectId: string) => {
      return client.models.Flag.list({ filter: { projectId: { eq: projectId } } });
    },
    listBySurveyLink: async (surveyLinkId: string) => {
      return client.models.Flag.list({ filter: { surveyLinkId: { eq: surveyLinkId } } });
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