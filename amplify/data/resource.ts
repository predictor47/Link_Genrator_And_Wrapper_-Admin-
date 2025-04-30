import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

// Define the schema with proper Amplify Gen 2 syntax
const schema = a.schema({
  SurveyLink: a
    .model({
      id: a.id(),
      uid: a.string().required(),
      projectId: a.string().required(),
      originalUrl: a.string().required(),
      vendorId: a.string(),
      status: a.enum(['PENDING', 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'QUOTA_FULL', 'DISQUALIFIED', 'FLAGGED']),
      linkType: a.enum(['TEST', 'LIVE']),
      geoRestriction: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      // Fix relationship fields with both required arguments
      project: a.belongsTo('Project', 'projectId'),
      vendor: a.belongsTo('Vendor', 'vendorId'),
      responses: a.hasMany('Response', 'surveyLinkId'),
      flags: a.hasMany('Flag', 'surveyLinkId')
    })
    .authorization(allow => [
      allow.publicApiKey().to(['read']),
      allow.authenticated().to(['read', 'create', 'update'])
    ]),

  Vendor: a
    .model({
      id: a.id(),
      name: a.string().required(),
      code: a.string().required(),
      projectId: a.string().required(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      project: a.belongsTo('Project', 'projectId'),
      surveyLinks: a.hasMany('SurveyLink', 'vendorId')
    })
    .authorization(allow => [
      allow.authenticated().to(['read', 'create', 'update', 'delete'])
    ]),

  Project: a
    .model({
      id: a.id(),
      name: a.string().required(),
      description: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      surveyLinks: a.hasMany('SurveyLink', 'projectId'),
      vendors: a.hasMany('Vendor', 'projectId'),
      responses: a.hasMany('Response', 'projectId'),
      flags: a.hasMany('Flag', 'projectId'),
      questions: a.hasMany('Question', 'projectId')
    })
    .authorization(allow => [
      allow.authenticated().to(['read', 'create', 'update', 'delete'])
    ]),

  Question: a
    .model({
      id: a.id(),
      projectId: a.string().required(),
      text: a.string().required(),
      options: a.string().required(), // Stored as JSON string
      createdAt: a.datetime(),
      project: a.belongsTo('Project', 'projectId'),
      responses: a.hasMany('Response', 'questionId')
    })
    .authorization(allow => [
      allow.authenticated().to(['read', 'create', 'update', 'delete'])
    ]),

  Response: a
    .model({
      id: a.id(),
      surveyLinkId: a.string().required(),
      projectId: a.string().required(),
      questionId: a.string().required(),
      answer: a.string().required(),
      metadata: a.string(),
      createdAt: a.datetime(),
      surveyLink: a.belongsTo('SurveyLink', 'surveyLinkId'),
      project: a.belongsTo('Project', 'projectId'),
      question: a.belongsTo('Question', 'questionId')
    })
    .authorization(allow => [
      allow.publicApiKey().to(['create']),
      allow.authenticated().to(['read', 'create', 'update'])
    ]),

  Flag: a
    .model({
      id: a.id(),
      surveyLinkId: a.string().required(),
      projectId: a.string().required(),
      reason: a.string().required(),
      metadata: a.string(),
      resolved: a.boolean(),
      createdAt: a.datetime(),
      surveyLink: a.belongsTo('SurveyLink', 'surveyLinkId'),
      project: a.belongsTo('Project', 'projectId')
    })
    .authorization(allow => [
      allow.publicApiKey().to(['create']),
      allow.authenticated().to(['read', 'create', 'update'])
    ])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30
    }
  }
});