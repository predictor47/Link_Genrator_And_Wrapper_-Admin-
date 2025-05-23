/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getProject = /* GraphQL */ `query GetProject($id: ID!) {
  getProject(id: $id) {
    createdAt
    currentCompletions
    description
    id
    name
    settings
    status
    surveyUrl
    targetCompletions
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetProjectQueryVariables,
  APITypes.GetProjectQuery
>;
export const getProjectVendor = /* GraphQL */ `query GetProjectVendor($id: ID!) {
  getProjectVendor(id: $id) {
    createdAt
    currentCount
    id
    projectId
    quota
    updatedAt
    vendorId
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetProjectVendorQueryVariables,
  APITypes.GetProjectVendorQuery
>;
export const getQuestion = /* GraphQL */ `query GetQuestion($id: ID!) {
  getQuestion(id: $id) {
    createdAt
    id
    isRequired
    options
    projectId
    sequence
    text
    type
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetQuestionQueryVariables,
  APITypes.GetQuestionQuery
>;
export const getSurveyLink = /* GraphQL */ `query GetSurveyLink($id: ID!) {
  getSurveyLink(id: $id) {
    clickedAt
    completedAt
    createdAt
    geoData
    id
    ipAddress
    metadata
    projectId
    status
    uid
    updatedAt
    userAgent
    vendorId
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetSurveyLinkQueryVariables,
  APITypes.GetSurveyLinkQuery
>;
export const getVendor = /* GraphQL */ `query GetVendor($id: ID!) {
  getVendor(id: $id) {
    contactEmail
    contactName
    createdAt
    id
    name
    settings
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetVendorQueryVariables, APITypes.GetVendorQuery>;
export const listProjectVendors = /* GraphQL */ `query ListProjectVendors(
  $filter: ModelProjectVendorFilterInput
  $limit: Int
  $nextToken: String
) {
  listProjectVendors(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      createdAt
      currentCount
      id
      projectId
      quota
      updatedAt
      vendorId
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListProjectVendorsQueryVariables,
  APITypes.ListProjectVendorsQuery
>;
export const listProjects = /* GraphQL */ `query ListProjects(
  $filter: ModelProjectFilterInput
  $limit: Int
  $nextToken: String
) {
  listProjects(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      createdAt
      currentCompletions
      description
      id
      name
      settings
      status
      surveyUrl
      targetCompletions
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListProjectsQueryVariables,
  APITypes.ListProjectsQuery
>;
export const listQuestions = /* GraphQL */ `query ListQuestions(
  $filter: ModelQuestionFilterInput
  $limit: Int
  $nextToken: String
) {
  listQuestions(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      createdAt
      id
      isRequired
      options
      projectId
      sequence
      text
      type
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListQuestionsQueryVariables,
  APITypes.ListQuestionsQuery
>;
export const listSurveyLinks = /* GraphQL */ `query ListSurveyLinks(
  $filter: ModelSurveyLinkFilterInput
  $limit: Int
  $nextToken: String
) {
  listSurveyLinks(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      clickedAt
      completedAt
      createdAt
      geoData
      id
      ipAddress
      metadata
      projectId
      status
      uid
      updatedAt
      userAgent
      vendorId
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListSurveyLinksQueryVariables,
  APITypes.ListSurveyLinksQuery
>;
export const listVendors = /* GraphQL */ `query ListVendors(
  $filter: ModelVendorFilterInput
  $limit: Int
  $nextToken: String
) {
  listVendors(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      contactEmail
      contactName
      createdAt
      id
      name
      settings
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListVendorsQueryVariables,
  APITypes.ListVendorsQuery
>;
