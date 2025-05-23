/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createProject = /* GraphQL */ `mutation CreateProject(
  $condition: ModelProjectConditionInput
  $input: CreateProjectInput!
) {
  createProject(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateProjectMutationVariables,
  APITypes.CreateProjectMutation
>;
export const createProjectVendor = /* GraphQL */ `mutation CreateProjectVendor(
  $condition: ModelProjectVendorConditionInput
  $input: CreateProjectVendorInput!
) {
  createProjectVendor(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateProjectVendorMutationVariables,
  APITypes.CreateProjectVendorMutation
>;
export const createQuestion = /* GraphQL */ `mutation CreateQuestion(
  $condition: ModelQuestionConditionInput
  $input: CreateQuestionInput!
) {
  createQuestion(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateQuestionMutationVariables,
  APITypes.CreateQuestionMutation
>;
export const createSurveyLink = /* GraphQL */ `mutation CreateSurveyLink(
  $condition: ModelSurveyLinkConditionInput
  $input: CreateSurveyLinkInput!
) {
  createSurveyLink(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateSurveyLinkMutationVariables,
  APITypes.CreateSurveyLinkMutation
>;
export const createVendor = /* GraphQL */ `mutation CreateVendor(
  $condition: ModelVendorConditionInput
  $input: CreateVendorInput!
) {
  createVendor(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateVendorMutationVariables,
  APITypes.CreateVendorMutation
>;
export const deleteProject = /* GraphQL */ `mutation DeleteProject(
  $condition: ModelProjectConditionInput
  $input: DeleteProjectInput!
) {
  deleteProject(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteProjectMutationVariables,
  APITypes.DeleteProjectMutation
>;
export const deleteProjectVendor = /* GraphQL */ `mutation DeleteProjectVendor(
  $condition: ModelProjectVendorConditionInput
  $input: DeleteProjectVendorInput!
) {
  deleteProjectVendor(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteProjectVendorMutationVariables,
  APITypes.DeleteProjectVendorMutation
>;
export const deleteQuestion = /* GraphQL */ `mutation DeleteQuestion(
  $condition: ModelQuestionConditionInput
  $input: DeleteQuestionInput!
) {
  deleteQuestion(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteQuestionMutationVariables,
  APITypes.DeleteQuestionMutation
>;
export const deleteSurveyLink = /* GraphQL */ `mutation DeleteSurveyLink(
  $condition: ModelSurveyLinkConditionInput
  $input: DeleteSurveyLinkInput!
) {
  deleteSurveyLink(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteSurveyLinkMutationVariables,
  APITypes.DeleteSurveyLinkMutation
>;
export const deleteVendor = /* GraphQL */ `mutation DeleteVendor(
  $condition: ModelVendorConditionInput
  $input: DeleteVendorInput!
) {
  deleteVendor(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteVendorMutationVariables,
  APITypes.DeleteVendorMutation
>;
export const updateProject = /* GraphQL */ `mutation UpdateProject(
  $condition: ModelProjectConditionInput
  $input: UpdateProjectInput!
) {
  updateProject(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateProjectMutationVariables,
  APITypes.UpdateProjectMutation
>;
export const updateProjectVendor = /* GraphQL */ `mutation UpdateProjectVendor(
  $condition: ModelProjectVendorConditionInput
  $input: UpdateProjectVendorInput!
) {
  updateProjectVendor(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateProjectVendorMutationVariables,
  APITypes.UpdateProjectVendorMutation
>;
export const updateQuestion = /* GraphQL */ `mutation UpdateQuestion(
  $condition: ModelQuestionConditionInput
  $input: UpdateQuestionInput!
) {
  updateQuestion(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateQuestionMutationVariables,
  APITypes.UpdateQuestionMutation
>;
export const updateSurveyLink = /* GraphQL */ `mutation UpdateSurveyLink(
  $condition: ModelSurveyLinkConditionInput
  $input: UpdateSurveyLinkInput!
) {
  updateSurveyLink(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateSurveyLinkMutationVariables,
  APITypes.UpdateSurveyLinkMutation
>;
export const updateVendor = /* GraphQL */ `mutation UpdateVendor(
  $condition: ModelVendorConditionInput
  $input: UpdateVendorInput!
) {
  updateVendor(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateVendorMutationVariables,
  APITypes.UpdateVendorMutation
>;
