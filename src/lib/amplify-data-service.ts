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
      return client.models.Project.create(data);
    },
    get: async (id: string) => {
      return client.models.Project.get({ id });
    },
    list: async (filter?: any) => {
      return client.models.Project.list(filter);
    },
    update: async (id: string, data: any) => {
      return client.models.Project.update({ id, ...data });
    },
    delete: async (id: string) => {
      return client.models.Project.delete({ id });
    },
    getWithRelations: async (id: string) => {
      // Fix: Replace includeSurveyLinks with proper selectionSet for relations
      return client.models.Project.get({ id }, {
        selectionSet: ['*', 'surveyLinks.*', 'vendors.*', 'questions.*']
      });
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