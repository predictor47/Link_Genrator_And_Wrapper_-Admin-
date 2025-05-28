import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

// Create a schema without relationships
const schema = a.schema({
  Project: a
    .model({
      name: a.string().required(),
      description: a.string(),
      status: a.enum(['ACTIVE', 'PAUSED', 'COMPLETED']),
      targetCompletions: a.integer().required().default(100),
      currentCompletions: a.integer().required().default(0),
      surveyUrl: a.string().required(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
      settings: a.json()
    })
    .authorization((allow) => [
      allow.authenticated().to(['create', 'read', 'update', 'delete']),
    ]),

  Question: a
    .model({
      projectId: a.id(),
      text: a.string().required(),
      type: a.enum(['MULTIPLE_CHOICE', 'TEXT', 'COUNTRY', 'SCALE']),
      options: a.json(),
      sequence: a.integer().required(),
      isRequired: a.boolean().required().default(true),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required()
    })
    .authorization((allow) => [
      allow.authenticated().to(['create', 'read', 'update', 'delete']),
    ]),

  SurveyLink: a
    .model({
      projectId: a.id(),
      uid: a.string().required(),
      status: a.enum(['UNUSED', 'CLICKED', 'COMPLETED', 'DISQUALIFIED', 'QUOTA_FULL']),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
      clickedAt: a.datetime(),
      completedAt: a.datetime(),
      ipAddress: a.string(),
      userAgent: a.string(),
      geoData: a.json(),
      metadata: a.json(),
      vendorId: a.id()
    })
    .authorization((allow) => [
      allow.authenticated().to(['create', 'read', 'update', 'delete']),
      allow.guest().to(['read', 'update'])
    ]),

  Vendor: a
    .model({
      name: a.string().required(),
      contactName: a.string(),
      contactEmail: a.string(),
      settings: a.json(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required()
    })
    .authorization((allow) => [
      allow.authenticated().to(['create', 'read', 'update', 'delete']),
      allow.publicApiKey().to(['create', 'read', 'update', 'delete']),
    ]),

  ProjectVendor: a
    .model({
      projectId: a.id(),
      vendorId: a.id(),
      quota: a.integer().required().default(0),
      currentCount: a.integer().required().default(0),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required()
    })
    .authorization((allow) => [
      allow.authenticated().to(['create', 'read', 'update', 'delete']),
      allow.publicApiKey().to(['create', 'read', 'update', 'delete']),
    ])
});

// Set SurveyLink status default
const defaultStatus = 'UNUSED';

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30
    }
  }
});
