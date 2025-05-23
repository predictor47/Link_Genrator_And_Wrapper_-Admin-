/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type Project = {
  __typename: "Project",
  createdAt: string,
  currentCompletions: number,
  description?: string | null,
  id: string,
  name: string,
  settings?: string | null,
  status?: ProjectStatus | null,
  surveyUrl: string,
  targetCompletions: number,
  updatedAt: string,
};

export enum ProjectStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  PAUSED = "PAUSED",
}


export type ProjectVendor = {
  __typename: "ProjectVendor",
  createdAt: string,
  currentCount: number,
  id: string,
  projectId?: string | null,
  quota: number,
  updatedAt: string,
  vendorId?: string | null,
};

export type Question = {
  __typename: "Question",
  createdAt: string,
  id: string,
  isRequired: boolean,
  options?: string | null,
  projectId?: string | null,
  sequence: number,
  text: string,
  type?: QuestionType | null,
  updatedAt: string,
};

export enum QuestionType {
  COUNTRY = "COUNTRY",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  SCALE = "SCALE",
  TEXT = "TEXT",
}


export type SurveyLink = {
  __typename: "SurveyLink",
  clickedAt?: string | null,
  completedAt?: string | null,
  createdAt: string,
  geoData?: string | null,
  id: string,
  ipAddress?: string | null,
  metadata?: string | null,
  projectId?: string | null,
  status?: SurveyLinkStatus | null,
  uid: string,
  updatedAt: string,
  userAgent?: string | null,
  vendorId?: string | null,
};

export enum SurveyLinkStatus {
  CLICKED = "CLICKED",
  COMPLETED = "COMPLETED",
  DISQUALIFIED = "DISQUALIFIED",
  QUOTA_FULL = "QUOTA_FULL",
  UNUSED = "UNUSED",
}


export type Vendor = {
  __typename: "Vendor",
  contactEmail?: string | null,
  contactName?: string | null,
  createdAt: string,
  id: string,
  name: string,
  settings?: string | null,
  updatedAt: string,
};

export type ModelProjectVendorFilterInput = {
  and?: Array< ModelProjectVendorFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  currentCount?: ModelIntInput | null,
  id?: ModelIDInput | null,
  not?: ModelProjectVendorFilterInput | null,
  or?: Array< ModelProjectVendorFilterInput | null > | null,
  projectId?: ModelIDInput | null,
  quota?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
  vendorId?: ModelIDInput | null,
};

export type ModelStringInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  _null = "_null",
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
}


export type ModelSizeInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelIntInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelIDInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export type ModelProjectVendorConnection = {
  __typename: "ModelProjectVendorConnection",
  items:  Array<ProjectVendor | null >,
  nextToken?: string | null,
};

export type ModelProjectFilterInput = {
  and?: Array< ModelProjectFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  currentCompletions?: ModelIntInput | null,
  description?: ModelStringInput | null,
  id?: ModelIDInput | null,
  name?: ModelStringInput | null,
  not?: ModelProjectFilterInput | null,
  or?: Array< ModelProjectFilterInput | null > | null,
  settings?: ModelStringInput | null,
  status?: ModelProjectStatusInput | null,
  surveyUrl?: ModelStringInput | null,
  targetCompletions?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelProjectStatusInput = {
  eq?: ProjectStatus | null,
  ne?: ProjectStatus | null,
};

export type ModelProjectConnection = {
  __typename: "ModelProjectConnection",
  items:  Array<Project | null >,
  nextToken?: string | null,
};

export type ModelQuestionFilterInput = {
  and?: Array< ModelQuestionFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  isRequired?: ModelBooleanInput | null,
  not?: ModelQuestionFilterInput | null,
  options?: ModelStringInput | null,
  or?: Array< ModelQuestionFilterInput | null > | null,
  projectId?: ModelIDInput | null,
  sequence?: ModelIntInput | null,
  text?: ModelStringInput | null,
  type?: ModelQuestionTypeInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelBooleanInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  eq?: boolean | null,
  ne?: boolean | null,
};

export type ModelQuestionTypeInput = {
  eq?: QuestionType | null,
  ne?: QuestionType | null,
};

export type ModelQuestionConnection = {
  __typename: "ModelQuestionConnection",
  items:  Array<Question | null >,
  nextToken?: string | null,
};

export type ModelSurveyLinkFilterInput = {
  and?: Array< ModelSurveyLinkFilterInput | null > | null,
  clickedAt?: ModelStringInput | null,
  completedAt?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  geoData?: ModelStringInput | null,
  id?: ModelIDInput | null,
  ipAddress?: ModelStringInput | null,
  metadata?: ModelStringInput | null,
  not?: ModelSurveyLinkFilterInput | null,
  or?: Array< ModelSurveyLinkFilterInput | null > | null,
  projectId?: ModelIDInput | null,
  status?: ModelSurveyLinkStatusInput | null,
  uid?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  userAgent?: ModelStringInput | null,
  vendorId?: ModelIDInput | null,
};

export type ModelSurveyLinkStatusInput = {
  eq?: SurveyLinkStatus | null,
  ne?: SurveyLinkStatus | null,
};

export type ModelSurveyLinkConnection = {
  __typename: "ModelSurveyLinkConnection",
  items:  Array<SurveyLink | null >,
  nextToken?: string | null,
};

export type ModelVendorFilterInput = {
  and?: Array< ModelVendorFilterInput | null > | null,
  contactEmail?: ModelStringInput | null,
  contactName?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  name?: ModelStringInput | null,
  not?: ModelVendorFilterInput | null,
  or?: Array< ModelVendorFilterInput | null > | null,
  settings?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelVendorConnection = {
  __typename: "ModelVendorConnection",
  items:  Array<Vendor | null >,
  nextToken?: string | null,
};

export type ModelProjectConditionInput = {
  and?: Array< ModelProjectConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  currentCompletions?: ModelIntInput | null,
  description?: ModelStringInput | null,
  name?: ModelStringInput | null,
  not?: ModelProjectConditionInput | null,
  or?: Array< ModelProjectConditionInput | null > | null,
  settings?: ModelStringInput | null,
  status?: ModelProjectStatusInput | null,
  surveyUrl?: ModelStringInput | null,
  targetCompletions?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateProjectInput = {
  createdAt?: string | null,
  currentCompletions: number,
  description?: string | null,
  id?: string | null,
  name: string,
  settings?: string | null,
  status?: ProjectStatus | null,
  surveyUrl: string,
  targetCompletions: number,
  updatedAt?: string | null,
};

export type ModelProjectVendorConditionInput = {
  and?: Array< ModelProjectVendorConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  currentCount?: ModelIntInput | null,
  not?: ModelProjectVendorConditionInput | null,
  or?: Array< ModelProjectVendorConditionInput | null > | null,
  projectId?: ModelIDInput | null,
  quota?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
  vendorId?: ModelIDInput | null,
};

export type CreateProjectVendorInput = {
  createdAt?: string | null,
  currentCount: number,
  id?: string | null,
  projectId?: string | null,
  quota: number,
  updatedAt?: string | null,
  vendorId?: string | null,
};

export type ModelQuestionConditionInput = {
  and?: Array< ModelQuestionConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  isRequired?: ModelBooleanInput | null,
  not?: ModelQuestionConditionInput | null,
  options?: ModelStringInput | null,
  or?: Array< ModelQuestionConditionInput | null > | null,
  projectId?: ModelIDInput | null,
  sequence?: ModelIntInput | null,
  text?: ModelStringInput | null,
  type?: ModelQuestionTypeInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateQuestionInput = {
  createdAt?: string | null,
  id?: string | null,
  isRequired: boolean,
  options?: string | null,
  projectId?: string | null,
  sequence: number,
  text: string,
  type?: QuestionType | null,
  updatedAt?: string | null,
};

export type ModelSurveyLinkConditionInput = {
  and?: Array< ModelSurveyLinkConditionInput | null > | null,
  clickedAt?: ModelStringInput | null,
  completedAt?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  geoData?: ModelStringInput | null,
  ipAddress?: ModelStringInput | null,
  metadata?: ModelStringInput | null,
  not?: ModelSurveyLinkConditionInput | null,
  or?: Array< ModelSurveyLinkConditionInput | null > | null,
  projectId?: ModelIDInput | null,
  status?: ModelSurveyLinkStatusInput | null,
  uid?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  userAgent?: ModelStringInput | null,
  vendorId?: ModelIDInput | null,
};

export type CreateSurveyLinkInput = {
  clickedAt?: string | null,
  completedAt?: string | null,
  createdAt?: string | null,
  geoData?: string | null,
  id?: string | null,
  ipAddress?: string | null,
  metadata?: string | null,
  projectId?: string | null,
  status?: SurveyLinkStatus | null,
  uid: string,
  updatedAt?: string | null,
  userAgent?: string | null,
  vendorId?: string | null,
};

export type ModelVendorConditionInput = {
  and?: Array< ModelVendorConditionInput | null > | null,
  contactEmail?: ModelStringInput | null,
  contactName?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  name?: ModelStringInput | null,
  not?: ModelVendorConditionInput | null,
  or?: Array< ModelVendorConditionInput | null > | null,
  settings?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateVendorInput = {
  contactEmail?: string | null,
  contactName?: string | null,
  createdAt?: string | null,
  id?: string | null,
  name: string,
  settings?: string | null,
  updatedAt?: string | null,
};

export type DeleteProjectInput = {
  id: string,
};

export type DeleteProjectVendorInput = {
  id: string,
};

export type DeleteQuestionInput = {
  id: string,
};

export type DeleteSurveyLinkInput = {
  id: string,
};

export type DeleteVendorInput = {
  id: string,
};

export type UpdateProjectInput = {
  createdAt?: string | null,
  currentCompletions?: number | null,
  description?: string | null,
  id: string,
  name?: string | null,
  settings?: string | null,
  status?: ProjectStatus | null,
  surveyUrl?: string | null,
  targetCompletions?: number | null,
  updatedAt?: string | null,
};

export type UpdateProjectVendorInput = {
  createdAt?: string | null,
  currentCount?: number | null,
  id: string,
  projectId?: string | null,
  quota?: number | null,
  updatedAt?: string | null,
  vendorId?: string | null,
};

export type UpdateQuestionInput = {
  createdAt?: string | null,
  id: string,
  isRequired?: boolean | null,
  options?: string | null,
  projectId?: string | null,
  sequence?: number | null,
  text?: string | null,
  type?: QuestionType | null,
  updatedAt?: string | null,
};

export type UpdateSurveyLinkInput = {
  clickedAt?: string | null,
  completedAt?: string | null,
  createdAt?: string | null,
  geoData?: string | null,
  id: string,
  ipAddress?: string | null,
  metadata?: string | null,
  projectId?: string | null,
  status?: SurveyLinkStatus | null,
  uid?: string | null,
  updatedAt?: string | null,
  userAgent?: string | null,
  vendorId?: string | null,
};

export type UpdateVendorInput = {
  contactEmail?: string | null,
  contactName?: string | null,
  createdAt?: string | null,
  id: string,
  name?: string | null,
  settings?: string | null,
  updatedAt?: string | null,
};

export type ModelSubscriptionProjectFilterInput = {
  and?: Array< ModelSubscriptionProjectFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  currentCompletions?: ModelSubscriptionIntInput | null,
  description?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionProjectFilterInput | null > | null,
  settings?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  surveyUrl?: ModelSubscriptionStringInput | null,
  targetCompletions?: ModelSubscriptionIntInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionStringInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionIntInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  in?: Array< number | null > | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
  notIn?: Array< number | null > | null,
};

export type ModelSubscriptionIDInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionProjectVendorFilterInput = {
  and?: Array< ModelSubscriptionProjectVendorFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  currentCount?: ModelSubscriptionIntInput | null,
  id?: ModelSubscriptionIDInput | null,
  or?: Array< ModelSubscriptionProjectVendorFilterInput | null > | null,
  projectId?: ModelSubscriptionIDInput | null,
  quota?: ModelSubscriptionIntInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  vendorId?: ModelSubscriptionIDInput | null,
};

export type ModelSubscriptionQuestionFilterInput = {
  and?: Array< ModelSubscriptionQuestionFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  isRequired?: ModelSubscriptionBooleanInput | null,
  options?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionQuestionFilterInput | null > | null,
  projectId?: ModelSubscriptionIDInput | null,
  sequence?: ModelSubscriptionIntInput | null,
  text?: ModelSubscriptionStringInput | null,
  type?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionBooleanInput = {
  eq?: boolean | null,
  ne?: boolean | null,
};

export type ModelSubscriptionSurveyLinkFilterInput = {
  and?: Array< ModelSubscriptionSurveyLinkFilterInput | null > | null,
  clickedAt?: ModelSubscriptionStringInput | null,
  completedAt?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  geoData?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  ipAddress?: ModelSubscriptionStringInput | null,
  metadata?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionSurveyLinkFilterInput | null > | null,
  projectId?: ModelSubscriptionIDInput | null,
  status?: ModelSubscriptionStringInput | null,
  uid?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  userAgent?: ModelSubscriptionStringInput | null,
  vendorId?: ModelSubscriptionIDInput | null,
};

export type ModelSubscriptionVendorFilterInput = {
  and?: Array< ModelSubscriptionVendorFilterInput | null > | null,
  contactEmail?: ModelSubscriptionStringInput | null,
  contactName?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionVendorFilterInput | null > | null,
  settings?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type GetProjectQueryVariables = {
  id: string,
};

export type GetProjectQuery = {
  getProject?:  {
    __typename: "Project",
    createdAt: string,
    currentCompletions: number,
    description?: string | null,
    id: string,
    name: string,
    settings?: string | null,
    status?: ProjectStatus | null,
    surveyUrl: string,
    targetCompletions: number,
    updatedAt: string,
  } | null,
};

export type GetProjectVendorQueryVariables = {
  id: string,
};

export type GetProjectVendorQuery = {
  getProjectVendor?:  {
    __typename: "ProjectVendor",
    createdAt: string,
    currentCount: number,
    id: string,
    projectId?: string | null,
    quota: number,
    updatedAt: string,
    vendorId?: string | null,
  } | null,
};

export type GetQuestionQueryVariables = {
  id: string,
};

export type GetQuestionQuery = {
  getQuestion?:  {
    __typename: "Question",
    createdAt: string,
    id: string,
    isRequired: boolean,
    options?: string | null,
    projectId?: string | null,
    sequence: number,
    text: string,
    type?: QuestionType | null,
    updatedAt: string,
  } | null,
};

export type GetSurveyLinkQueryVariables = {
  id: string,
};

export type GetSurveyLinkQuery = {
  getSurveyLink?:  {
    __typename: "SurveyLink",
    clickedAt?: string | null,
    completedAt?: string | null,
    createdAt: string,
    geoData?: string | null,
    id: string,
    ipAddress?: string | null,
    metadata?: string | null,
    projectId?: string | null,
    status?: SurveyLinkStatus | null,
    uid: string,
    updatedAt: string,
    userAgent?: string | null,
    vendorId?: string | null,
  } | null,
};

export type GetVendorQueryVariables = {
  id: string,
};

export type GetVendorQuery = {
  getVendor?:  {
    __typename: "Vendor",
    contactEmail?: string | null,
    contactName?: string | null,
    createdAt: string,
    id: string,
    name: string,
    settings?: string | null,
    updatedAt: string,
  } | null,
};

export type ListProjectVendorsQueryVariables = {
  filter?: ModelProjectVendorFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListProjectVendorsQuery = {
  listProjectVendors?:  {
    __typename: "ModelProjectVendorConnection",
    items:  Array< {
      __typename: "ProjectVendor",
      createdAt: string,
      currentCount: number,
      id: string,
      projectId?: string | null,
      quota: number,
      updatedAt: string,
      vendorId?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListProjectsQueryVariables = {
  filter?: ModelProjectFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListProjectsQuery = {
  listProjects?:  {
    __typename: "ModelProjectConnection",
    items:  Array< {
      __typename: "Project",
      createdAt: string,
      currentCompletions: number,
      description?: string | null,
      id: string,
      name: string,
      settings?: string | null,
      status?: ProjectStatus | null,
      surveyUrl: string,
      targetCompletions: number,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListQuestionsQueryVariables = {
  filter?: ModelQuestionFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListQuestionsQuery = {
  listQuestions?:  {
    __typename: "ModelQuestionConnection",
    items:  Array< {
      __typename: "Question",
      createdAt: string,
      id: string,
      isRequired: boolean,
      options?: string | null,
      projectId?: string | null,
      sequence: number,
      text: string,
      type?: QuestionType | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListSurveyLinksQueryVariables = {
  filter?: ModelSurveyLinkFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListSurveyLinksQuery = {
  listSurveyLinks?:  {
    __typename: "ModelSurveyLinkConnection",
    items:  Array< {
      __typename: "SurveyLink",
      clickedAt?: string | null,
      completedAt?: string | null,
      createdAt: string,
      geoData?: string | null,
      id: string,
      ipAddress?: string | null,
      metadata?: string | null,
      projectId?: string | null,
      status?: SurveyLinkStatus | null,
      uid: string,
      updatedAt: string,
      userAgent?: string | null,
      vendorId?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListVendorsQueryVariables = {
  filter?: ModelVendorFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListVendorsQuery = {
  listVendors?:  {
    __typename: "ModelVendorConnection",
    items:  Array< {
      __typename: "Vendor",
      contactEmail?: string | null,
      contactName?: string | null,
      createdAt: string,
      id: string,
      name: string,
      settings?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type CreateProjectMutationVariables = {
  condition?: ModelProjectConditionInput | null,
  input: CreateProjectInput,
};

export type CreateProjectMutation = {
  createProject?:  {
    __typename: "Project",
    createdAt: string,
    currentCompletions: number,
    description?: string | null,
    id: string,
    name: string,
    settings?: string | null,
    status?: ProjectStatus | null,
    surveyUrl: string,
    targetCompletions: number,
    updatedAt: string,
  } | null,
};

export type CreateProjectVendorMutationVariables = {
  condition?: ModelProjectVendorConditionInput | null,
  input: CreateProjectVendorInput,
};

export type CreateProjectVendorMutation = {
  createProjectVendor?:  {
    __typename: "ProjectVendor",
    createdAt: string,
    currentCount: number,
    id: string,
    projectId?: string | null,
    quota: number,
    updatedAt: string,
    vendorId?: string | null,
  } | null,
};

export type CreateQuestionMutationVariables = {
  condition?: ModelQuestionConditionInput | null,
  input: CreateQuestionInput,
};

export type CreateQuestionMutation = {
  createQuestion?:  {
    __typename: "Question",
    createdAt: string,
    id: string,
    isRequired: boolean,
    options?: string | null,
    projectId?: string | null,
    sequence: number,
    text: string,
    type?: QuestionType | null,
    updatedAt: string,
  } | null,
};

export type CreateSurveyLinkMutationVariables = {
  condition?: ModelSurveyLinkConditionInput | null,
  input: CreateSurveyLinkInput,
};

export type CreateSurveyLinkMutation = {
  createSurveyLink?:  {
    __typename: "SurveyLink",
    clickedAt?: string | null,
    completedAt?: string | null,
    createdAt: string,
    geoData?: string | null,
    id: string,
    ipAddress?: string | null,
    metadata?: string | null,
    projectId?: string | null,
    status?: SurveyLinkStatus | null,
    uid: string,
    updatedAt: string,
    userAgent?: string | null,
    vendorId?: string | null,
  } | null,
};

export type CreateVendorMutationVariables = {
  condition?: ModelVendorConditionInput | null,
  input: CreateVendorInput,
};

export type CreateVendorMutation = {
  createVendor?:  {
    __typename: "Vendor",
    contactEmail?: string | null,
    contactName?: string | null,
    createdAt: string,
    id: string,
    name: string,
    settings?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteProjectMutationVariables = {
  condition?: ModelProjectConditionInput | null,
  input: DeleteProjectInput,
};

export type DeleteProjectMutation = {
  deleteProject?:  {
    __typename: "Project",
    createdAt: string,
    currentCompletions: number,
    description?: string | null,
    id: string,
    name: string,
    settings?: string | null,
    status?: ProjectStatus | null,
    surveyUrl: string,
    targetCompletions: number,
    updatedAt: string,
  } | null,
};

export type DeleteProjectVendorMutationVariables = {
  condition?: ModelProjectVendorConditionInput | null,
  input: DeleteProjectVendorInput,
};

export type DeleteProjectVendorMutation = {
  deleteProjectVendor?:  {
    __typename: "ProjectVendor",
    createdAt: string,
    currentCount: number,
    id: string,
    projectId?: string | null,
    quota: number,
    updatedAt: string,
    vendorId?: string | null,
  } | null,
};

export type DeleteQuestionMutationVariables = {
  condition?: ModelQuestionConditionInput | null,
  input: DeleteQuestionInput,
};

export type DeleteQuestionMutation = {
  deleteQuestion?:  {
    __typename: "Question",
    createdAt: string,
    id: string,
    isRequired: boolean,
    options?: string | null,
    projectId?: string | null,
    sequence: number,
    text: string,
    type?: QuestionType | null,
    updatedAt: string,
  } | null,
};

export type DeleteSurveyLinkMutationVariables = {
  condition?: ModelSurveyLinkConditionInput | null,
  input: DeleteSurveyLinkInput,
};

export type DeleteSurveyLinkMutation = {
  deleteSurveyLink?:  {
    __typename: "SurveyLink",
    clickedAt?: string | null,
    completedAt?: string | null,
    createdAt: string,
    geoData?: string | null,
    id: string,
    ipAddress?: string | null,
    metadata?: string | null,
    projectId?: string | null,
    status?: SurveyLinkStatus | null,
    uid: string,
    updatedAt: string,
    userAgent?: string | null,
    vendorId?: string | null,
  } | null,
};

export type DeleteVendorMutationVariables = {
  condition?: ModelVendorConditionInput | null,
  input: DeleteVendorInput,
};

export type DeleteVendorMutation = {
  deleteVendor?:  {
    __typename: "Vendor",
    contactEmail?: string | null,
    contactName?: string | null,
    createdAt: string,
    id: string,
    name: string,
    settings?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateProjectMutationVariables = {
  condition?: ModelProjectConditionInput | null,
  input: UpdateProjectInput,
};

export type UpdateProjectMutation = {
  updateProject?:  {
    __typename: "Project",
    createdAt: string,
    currentCompletions: number,
    description?: string | null,
    id: string,
    name: string,
    settings?: string | null,
    status?: ProjectStatus | null,
    surveyUrl: string,
    targetCompletions: number,
    updatedAt: string,
  } | null,
};

export type UpdateProjectVendorMutationVariables = {
  condition?: ModelProjectVendorConditionInput | null,
  input: UpdateProjectVendorInput,
};

export type UpdateProjectVendorMutation = {
  updateProjectVendor?:  {
    __typename: "ProjectVendor",
    createdAt: string,
    currentCount: number,
    id: string,
    projectId?: string | null,
    quota: number,
    updatedAt: string,
    vendorId?: string | null,
  } | null,
};

export type UpdateQuestionMutationVariables = {
  condition?: ModelQuestionConditionInput | null,
  input: UpdateQuestionInput,
};

export type UpdateQuestionMutation = {
  updateQuestion?:  {
    __typename: "Question",
    createdAt: string,
    id: string,
    isRequired: boolean,
    options?: string | null,
    projectId?: string | null,
    sequence: number,
    text: string,
    type?: QuestionType | null,
    updatedAt: string,
  } | null,
};

export type UpdateSurveyLinkMutationVariables = {
  condition?: ModelSurveyLinkConditionInput | null,
  input: UpdateSurveyLinkInput,
};

export type UpdateSurveyLinkMutation = {
  updateSurveyLink?:  {
    __typename: "SurveyLink",
    clickedAt?: string | null,
    completedAt?: string | null,
    createdAt: string,
    geoData?: string | null,
    id: string,
    ipAddress?: string | null,
    metadata?: string | null,
    projectId?: string | null,
    status?: SurveyLinkStatus | null,
    uid: string,
    updatedAt: string,
    userAgent?: string | null,
    vendorId?: string | null,
  } | null,
};

export type UpdateVendorMutationVariables = {
  condition?: ModelVendorConditionInput | null,
  input: UpdateVendorInput,
};

export type UpdateVendorMutation = {
  updateVendor?:  {
    __typename: "Vendor",
    contactEmail?: string | null,
    contactName?: string | null,
    createdAt: string,
    id: string,
    name: string,
    settings?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateProjectSubscriptionVariables = {
  filter?: ModelSubscriptionProjectFilterInput | null,
};

export type OnCreateProjectSubscription = {
  onCreateProject?:  {
    __typename: "Project",
    createdAt: string,
    currentCompletions: number,
    description?: string | null,
    id: string,
    name: string,
    settings?: string | null,
    status?: ProjectStatus | null,
    surveyUrl: string,
    targetCompletions: number,
    updatedAt: string,
  } | null,
};

export type OnCreateProjectVendorSubscriptionVariables = {
  filter?: ModelSubscriptionProjectVendorFilterInput | null,
};

export type OnCreateProjectVendorSubscription = {
  onCreateProjectVendor?:  {
    __typename: "ProjectVendor",
    createdAt: string,
    currentCount: number,
    id: string,
    projectId?: string | null,
    quota: number,
    updatedAt: string,
    vendorId?: string | null,
  } | null,
};

export type OnCreateQuestionSubscriptionVariables = {
  filter?: ModelSubscriptionQuestionFilterInput | null,
};

export type OnCreateQuestionSubscription = {
  onCreateQuestion?:  {
    __typename: "Question",
    createdAt: string,
    id: string,
    isRequired: boolean,
    options?: string | null,
    projectId?: string | null,
    sequence: number,
    text: string,
    type?: QuestionType | null,
    updatedAt: string,
  } | null,
};

export type OnCreateSurveyLinkSubscriptionVariables = {
  filter?: ModelSubscriptionSurveyLinkFilterInput | null,
};

export type OnCreateSurveyLinkSubscription = {
  onCreateSurveyLink?:  {
    __typename: "SurveyLink",
    clickedAt?: string | null,
    completedAt?: string | null,
    createdAt: string,
    geoData?: string | null,
    id: string,
    ipAddress?: string | null,
    metadata?: string | null,
    projectId?: string | null,
    status?: SurveyLinkStatus | null,
    uid: string,
    updatedAt: string,
    userAgent?: string | null,
    vendorId?: string | null,
  } | null,
};

export type OnCreateVendorSubscriptionVariables = {
  filter?: ModelSubscriptionVendorFilterInput | null,
};

export type OnCreateVendorSubscription = {
  onCreateVendor?:  {
    __typename: "Vendor",
    contactEmail?: string | null,
    contactName?: string | null,
    createdAt: string,
    id: string,
    name: string,
    settings?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteProjectSubscriptionVariables = {
  filter?: ModelSubscriptionProjectFilterInput | null,
};

export type OnDeleteProjectSubscription = {
  onDeleteProject?:  {
    __typename: "Project",
    createdAt: string,
    currentCompletions: number,
    description?: string | null,
    id: string,
    name: string,
    settings?: string | null,
    status?: ProjectStatus | null,
    surveyUrl: string,
    targetCompletions: number,
    updatedAt: string,
  } | null,
};

export type OnDeleteProjectVendorSubscriptionVariables = {
  filter?: ModelSubscriptionProjectVendorFilterInput | null,
};

export type OnDeleteProjectVendorSubscription = {
  onDeleteProjectVendor?:  {
    __typename: "ProjectVendor",
    createdAt: string,
    currentCount: number,
    id: string,
    projectId?: string | null,
    quota: number,
    updatedAt: string,
    vendorId?: string | null,
  } | null,
};

export type OnDeleteQuestionSubscriptionVariables = {
  filter?: ModelSubscriptionQuestionFilterInput | null,
};

export type OnDeleteQuestionSubscription = {
  onDeleteQuestion?:  {
    __typename: "Question",
    createdAt: string,
    id: string,
    isRequired: boolean,
    options?: string | null,
    projectId?: string | null,
    sequence: number,
    text: string,
    type?: QuestionType | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteSurveyLinkSubscriptionVariables = {
  filter?: ModelSubscriptionSurveyLinkFilterInput | null,
};

export type OnDeleteSurveyLinkSubscription = {
  onDeleteSurveyLink?:  {
    __typename: "SurveyLink",
    clickedAt?: string | null,
    completedAt?: string | null,
    createdAt: string,
    geoData?: string | null,
    id: string,
    ipAddress?: string | null,
    metadata?: string | null,
    projectId?: string | null,
    status?: SurveyLinkStatus | null,
    uid: string,
    updatedAt: string,
    userAgent?: string | null,
    vendorId?: string | null,
  } | null,
};

export type OnDeleteVendorSubscriptionVariables = {
  filter?: ModelSubscriptionVendorFilterInput | null,
};

export type OnDeleteVendorSubscription = {
  onDeleteVendor?:  {
    __typename: "Vendor",
    contactEmail?: string | null,
    contactName?: string | null,
    createdAt: string,
    id: string,
    name: string,
    settings?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateProjectSubscriptionVariables = {
  filter?: ModelSubscriptionProjectFilterInput | null,
};

export type OnUpdateProjectSubscription = {
  onUpdateProject?:  {
    __typename: "Project",
    createdAt: string,
    currentCompletions: number,
    description?: string | null,
    id: string,
    name: string,
    settings?: string | null,
    status?: ProjectStatus | null,
    surveyUrl: string,
    targetCompletions: number,
    updatedAt: string,
  } | null,
};

export type OnUpdateProjectVendorSubscriptionVariables = {
  filter?: ModelSubscriptionProjectVendorFilterInput | null,
};

export type OnUpdateProjectVendorSubscription = {
  onUpdateProjectVendor?:  {
    __typename: "ProjectVendor",
    createdAt: string,
    currentCount: number,
    id: string,
    projectId?: string | null,
    quota: number,
    updatedAt: string,
    vendorId?: string | null,
  } | null,
};

export type OnUpdateQuestionSubscriptionVariables = {
  filter?: ModelSubscriptionQuestionFilterInput | null,
};

export type OnUpdateQuestionSubscription = {
  onUpdateQuestion?:  {
    __typename: "Question",
    createdAt: string,
    id: string,
    isRequired: boolean,
    options?: string | null,
    projectId?: string | null,
    sequence: number,
    text: string,
    type?: QuestionType | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateSurveyLinkSubscriptionVariables = {
  filter?: ModelSubscriptionSurveyLinkFilterInput | null,
};

export type OnUpdateSurveyLinkSubscription = {
  onUpdateSurveyLink?:  {
    __typename: "SurveyLink",
    clickedAt?: string | null,
    completedAt?: string | null,
    createdAt: string,
    geoData?: string | null,
    id: string,
    ipAddress?: string | null,
    metadata?: string | null,
    projectId?: string | null,
    status?: SurveyLinkStatus | null,
    uid: string,
    updatedAt: string,
    userAgent?: string | null,
    vendorId?: string | null,
  } | null,
};

export type OnUpdateVendorSubscriptionVariables = {
  filter?: ModelSubscriptionVendorFilterInput | null,
};

export type OnUpdateVendorSubscription = {
  onUpdateVendor?:  {
    __typename: "Vendor",
    contactEmail?: string | null,
    contactName?: string | null,
    createdAt: string,
    id: string,
    name: string,
    settings?: string | null,
    updatedAt: string,
  } | null,
};
