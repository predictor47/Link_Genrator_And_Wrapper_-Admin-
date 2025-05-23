/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateProject = /* GraphQL */ `subscription OnCreateProject($filter: ModelSubscriptionProjectFilterInput) {
  onCreateProject(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateProjectSubscriptionVariables,
  APITypes.OnCreateProjectSubscription
>;
export const onCreateProjectVendor = /* GraphQL */ `subscription OnCreateProjectVendor(
  $filter: ModelSubscriptionProjectVendorFilterInput
) {
  onCreateProjectVendor(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateProjectVendorSubscriptionVariables,
  APITypes.OnCreateProjectVendorSubscription
>;
export const onCreateQuestion = /* GraphQL */ `subscription OnCreateQuestion($filter: ModelSubscriptionQuestionFilterInput) {
  onCreateQuestion(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateQuestionSubscriptionVariables,
  APITypes.OnCreateQuestionSubscription
>;
export const onCreateSurveyLink = /* GraphQL */ `subscription OnCreateSurveyLink(
  $filter: ModelSubscriptionSurveyLinkFilterInput
) {
  onCreateSurveyLink(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateSurveyLinkSubscriptionVariables,
  APITypes.OnCreateSurveyLinkSubscription
>;
export const onCreateVendor = /* GraphQL */ `subscription OnCreateVendor($filter: ModelSubscriptionVendorFilterInput) {
  onCreateVendor(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateVendorSubscriptionVariables,
  APITypes.OnCreateVendorSubscription
>;
export const onDeleteProject = /* GraphQL */ `subscription OnDeleteProject($filter: ModelSubscriptionProjectFilterInput) {
  onDeleteProject(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteProjectSubscriptionVariables,
  APITypes.OnDeleteProjectSubscription
>;
export const onDeleteProjectVendor = /* GraphQL */ `subscription OnDeleteProjectVendor(
  $filter: ModelSubscriptionProjectVendorFilterInput
) {
  onDeleteProjectVendor(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteProjectVendorSubscriptionVariables,
  APITypes.OnDeleteProjectVendorSubscription
>;
export const onDeleteQuestion = /* GraphQL */ `subscription OnDeleteQuestion($filter: ModelSubscriptionQuestionFilterInput) {
  onDeleteQuestion(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteQuestionSubscriptionVariables,
  APITypes.OnDeleteQuestionSubscription
>;
export const onDeleteSurveyLink = /* GraphQL */ `subscription OnDeleteSurveyLink(
  $filter: ModelSubscriptionSurveyLinkFilterInput
) {
  onDeleteSurveyLink(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteSurveyLinkSubscriptionVariables,
  APITypes.OnDeleteSurveyLinkSubscription
>;
export const onDeleteVendor = /* GraphQL */ `subscription OnDeleteVendor($filter: ModelSubscriptionVendorFilterInput) {
  onDeleteVendor(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteVendorSubscriptionVariables,
  APITypes.OnDeleteVendorSubscription
>;
export const onUpdateProject = /* GraphQL */ `subscription OnUpdateProject($filter: ModelSubscriptionProjectFilterInput) {
  onUpdateProject(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateProjectSubscriptionVariables,
  APITypes.OnUpdateProjectSubscription
>;
export const onUpdateProjectVendor = /* GraphQL */ `subscription OnUpdateProjectVendor(
  $filter: ModelSubscriptionProjectVendorFilterInput
) {
  onUpdateProjectVendor(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateProjectVendorSubscriptionVariables,
  APITypes.OnUpdateProjectVendorSubscription
>;
export const onUpdateQuestion = /* GraphQL */ `subscription OnUpdateQuestion($filter: ModelSubscriptionQuestionFilterInput) {
  onUpdateQuestion(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateQuestionSubscriptionVariables,
  APITypes.OnUpdateQuestionSubscription
>;
export const onUpdateSurveyLink = /* GraphQL */ `subscription OnUpdateSurveyLink(
  $filter: ModelSubscriptionSurveyLinkFilterInput
) {
  onUpdateSurveyLink(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateSurveyLinkSubscriptionVariables,
  APITypes.OnUpdateSurveyLinkSubscription
>;
export const onUpdateVendor = /* GraphQL */ `subscription OnUpdateVendor($filter: ModelSubscriptionVendorFilterInput) {
  onUpdateVendor(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateVendorSubscriptionVariables,
  APITypes.OnUpdateVendorSubscription
>;
