import React, { useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface QuestionOption {
  id: string;
  text: string;
  value: string;
  isCorrect?: boolean;
  skipToQuestion?: string;
}

interface QuestionValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minValue?: number;
  maxValue?: number;
  minSelections?: number;
  maxSelections?: number;
}

interface QuestionLogic {
  condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
  action: 'skip_to' | 'end_survey' | 'show_message' | 'set_quota_full' | 'disqualify';
  target?: string;
  message?: string;
}

interface Question {
  id: string;
  type: 'text' | 'textarea' | 'email' | 'number' | 'scale' | 'single_choice' | 'multiple_choice' | 'dropdown' | 'rating' | 'matrix' | 'file_upload' | 'date' | 'slider' | 'ranking';
  text: string;
  description?: string;
  options?: QuestionOption[];
  validation?: QuestionValidation;
  logic?: QuestionLogic[];
  settings?: {
    randomizeOptions?: boolean;
    showOther?: boolean;
    otherText?: string;
    scaleMin?: number;
    scaleMax?: number;
    scaleLabels?: string[];
    matrixRows?: string[];
    matrixColumns?: string[];
    fileTypes?: string[];
    maxFileSize?: number;
    sliderStep?: number;
    dateFormat?: string;
    allowFutureDate?: boolean;
    allowPastDate?: boolean;
  };
  sequence: number;
  isRequired: boolean;
  isTrap?: boolean;
  isQualifier?: boolean;
  groupId?: string;
}

interface QuestionGroup {
  id: string;
  name: string;
  description?: string;
  randomize?: boolean;
  showQuestions?: number; // Show only N questions from this group
}

interface AdvancedQuestionBuilderProps {
  projectId: string;
  questions: Question[];
  groups: QuestionGroup[];
  onQuestionsChange: (questions: Question[], groups: QuestionGroup[]) => void;
  onSave: () => void;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Short Text', icon: '📝' },
  { value: 'textarea', label: 'Long Text', icon: '📄' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'scale', label: 'Scale (1-10)', icon: '📊' },
  { value: 'single_choice', label: 'Single Choice', icon: '🔘' },
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '☑️' },
  { value: 'dropdown', label: 'Dropdown', icon: '📋' },
  { value: 'rating', label: 'Star Rating', icon: '⭐' },
  { value: 'matrix', label: 'Matrix/Grid', icon: '🔲' },
  { value: 'slider', label: 'Slider', icon: '🎚️' },
  { value: 'ranking', label: 'Ranking', icon: '📈' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'file_upload', label: 'File Upload', icon: '📎' }
];

const AdvancedQuestionBuilder: React.FC<AdvancedQuestionBuilderProps> = ({
  projectId,
  questions,
  groups,
  onQuestionsChange,
  onSave
}) => {
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [activeGroup, setActiveGroup] = useState<QuestionGroup | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showLogicBuilder, setShowLogicBuilder] = useState(false);
  const [showValidationBuilder, setShowValidationBuilder] = useState(false);

  const questionFormRef = useRef<HTMLDivElement>(null);

  // Create new question
  const createQuestion = (type: string) => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type: type as Question['type'],
      text: '',
      sequence: questions.length + 1,
      isRequired: false,
      options: ['single_choice', 'multiple_choice', 'dropdown', 'rating', 'ranking'].includes(type) 
        ? [{ id: 'opt_1', text: 'Option 1', value: 'option_1' }] 
        : undefined,
      settings: getDefaultSettings(type as Question['type']),
      validation: {},
      logic: []
    };
    setActiveQuestion(newQuestion);
    setShowQuestionForm(true);
  };

  // Get default settings for question type
  const getDefaultSettings = (type: Question['type']) => {
    switch (type) {
      case 'scale':
        return { scaleMin: 1, scaleMax: 10, scaleLabels: ['Poor', 'Excellent'] };
      case 'rating':
        return { scaleMax: 5 };
      case 'slider':
        return { scaleMin: 0, scaleMax: 100, sliderStep: 1 };
      case 'file_upload':
        return { fileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'], maxFileSize: 5 };
      case 'date':
        return { dateFormat: 'yyyy-mm-dd', allowFutureDate: true, allowPastDate: true };
      case 'matrix':
        return { 
          matrixRows: ['Row 1', 'Row 2'], 
          matrixColumns: ['Column 1', 'Column 2'] 
        };
      default:
        return {};
    }
  };

  // Save question
  const saveQuestion = () => {
    if (!activeQuestion) return;

    const updatedQuestions = activeQuestion.id.startsWith('q_') && questions.find(q => q.id === activeQuestion.id)
      ? questions.map(q => q.id === activeQuestion.id ? activeQuestion : q)
      : [...questions, activeQuestion];

    onQuestionsChange(updatedQuestions, groups);
    setShowQuestionForm(false);
    setActiveQuestion(null);
  };

  // Delete question
  const deleteQuestion = (questionId: string) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    onQuestionsChange(updatedQuestions, groups);
  };

  // Duplicate question
  const duplicateQuestion = (question: Question) => {
    const duplicated = {
      ...question,
      id: `q_${Date.now()}`,
      text: `${question.text} (Copy)`,
      sequence: questions.length + 1
    };
    onQuestionsChange([...questions, duplicated], groups);
  };

  // Handle drag end for reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reorderedQuestions = Array.from(questions);
    const [removed] = reorderedQuestions.splice(result.source.index, 1);
    reorderedQuestions.splice(result.destination.index, 0, removed);

    // Update sequence numbers
    const updatedQuestions = reorderedQuestions.map((q, index) => ({
      ...q,
      sequence: index + 1
    }));

    onQuestionsChange(updatedQuestions, groups);
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.type.includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || q.type === filterType;
    return matchesSearch && matchesType;
  });

  // Add option to question
  const addOption = () => {
    if (!activeQuestion || !activeQuestion.options) return;
    
    const newOption: QuestionOption = {
      id: `opt_${Date.now()}`,
      text: `Option ${activeQuestion.options.length + 1}`,
      value: `option_${activeQuestion.options.length + 1}`
    };
    
    setActiveQuestion({
      ...activeQuestion,
      options: [...activeQuestion.options, newOption]
    });
  };

  // Remove option
  const removeOption = (optionId: string) => {
    if (!activeQuestion || !activeQuestion.options) return;
    
    setActiveQuestion({
      ...activeQuestion,
      options: activeQuestion.options.filter(opt => opt.id !== optionId)
    });
  };

  // Add logic rule
  const addLogicRule = () => {
    if (!activeQuestion) return;
    
    const newRule: QuestionLogic = {
      condition: 'equals',
      value: '',
      action: 'skip_to'
    };
    
    setActiveQuestion({
      ...activeQuestion,
      logic: [...(activeQuestion.logic || []), newRule]
    });
  };

  // Create group
  const createGroup = () => {
    const newGroup: QuestionGroup = {
      id: `group_${Date.now()}`,
      name: 'New Group',
      randomize: false
    };
    setActiveGroup(newGroup);
    setShowGroupForm(true);
  };

  // Save group
  const saveGroup = () => {
    if (!activeGroup) return;
    
    const updatedGroups = groups.find(g => g.id === activeGroup.id)
      ? groups.map(g => g.id === activeGroup.id ? activeGroup : g)
      : [...groups, activeGroup];
    
    onQuestionsChange(questions, updatedGroups);
    setShowGroupForm(false);
    setActiveGroup(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Question Builder</h1>
          <p className="text-gray-600 mt-2">Create sophisticated surveys with logic, validation, and advanced question types</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {previewMode ? 'Edit Mode' : 'Preview Mode'}
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
          >
            Save Survey
          </button>
        </div>
      </div>

      {!previewMode ? (
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Question Types & Tools */}
          <div className="col-span-3 space-y-6">
            {/* Question Types */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-4">Question Types</h3>
              <div className="grid grid-cols-1 gap-2">
                {QUESTION_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => createQuestion(type.value)}
                    className="flex items-center space-x-2 p-3 bg-white rounded border hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Groups */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Question Groups</h3>
                <button
                  onClick={createGroup}
                  className="text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  + Group
                </button>
              </div>
              <div className="space-y-2">
                {groups.map(group => (
                  <div key={group.id} className="p-2 bg-white rounded border">
                    <div className="font-medium text-sm">{group.name}</div>
                    <div className="text-xs text-gray-500">
                      {questions.filter(q => q.groupId === group.id).length} questions
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-4">Filters</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="all">All Types</option>
                  {QUESTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Main Content - Questions List */}
          <div className="col-span-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Questions ({filteredQuestions.length})</h2>
              <div className="text-sm text-gray-500">
                Drag to reorder • Click to edit
              </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="questions">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {filteredQuestions.map((question, index) => (
                      <Draggable key={question.id} draggableId={question.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <div {...provided.dragHandleProps} className="cursor-move text-gray-400">
                                    ⋮⋮
                                  </div>
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                    {QUESTION_TYPES.find(t => t.value === question.type)?.label}
                                  </span>
                                  {question.isRequired && (
                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                      Required
                                    </span>
                                  )}
                                  {question.isTrap && (
                                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                                      Trap
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-medium text-gray-900 mb-1">
                                  {question.text || 'Untitled Question'}
                                </h3>
                                {question.description && (
                                  <p className="text-sm text-gray-600 mb-2">{question.description}</p>
                                )}
                                {question.options && (
                                  <div className="text-sm text-gray-500">
                                    {question.options.length} option(s)
                                  </div>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setActiveQuestion(question);
                                    setShowQuestionForm(true);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => duplicateQuestion(question)}
                                  className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                                  title="Duplicate"
                                >
                                  📋
                                </button>
                                <button
                                  onClick={() => deleteQuestion(question.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {filteredQuestions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-medium mb-2">No questions yet</h3>
                <p>Start by selecting a question type from the sidebar</p>
              </div>
            )}
          </div>

          {/* Right Sidebar - Question Editor */}
          <div className="col-span-3">
            {showQuestionForm && activeQuestion && (
              <div ref={questionFormRef} className="bg-gray-50 p-4 rounded-lg sticky top-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Edit Question</h3>
                  <button
                    onClick={() => setShowQuestionForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Question Text */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Question Text *</label>
                    <textarea
                      value={activeQuestion.text}
                      onChange={(e) => setActiveQuestion({...activeQuestion, text: e.target.value})}
                      className="w-full px-3 py-2 border rounded text-sm"
                      rows={3}
                      placeholder="Enter your question..."
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={activeQuestion.description || ''}
                      onChange={(e) => setActiveQuestion({...activeQuestion, description: e.target.value})}
                      className="w-full px-3 py-2 border rounded text-sm"
                      placeholder="Optional description..."
                    />
                  </div>

                  {/* Options for choice questions */}
                  {['single_choice', 'multiple_choice', 'dropdown', 'ranking'].includes(activeQuestion.type) && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium">Options</label>
                        <button
                          onClick={addOption}
                          className="text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                        >
                          + Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {activeQuestion.options?.map((option, index) => (
                          <div key={option.id} className="flex space-x-2">
                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) => {
                                const updatedOptions = activeQuestion.options?.map(opt =>
                                  opt.id === option.id ? {...opt, text: e.target.value} : opt
                                );
                                setActiveQuestion({...activeQuestion, options: updatedOptions});
                              }}
                              className="flex-1 px-2 py-1 border rounded text-sm"
                              placeholder={`Option ${index + 1}`}
                            />
                            <button
                              onClick={() => removeOption(option.id)}
                              className="text-red-600 hover:text-red-800 px-2"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question Settings */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="required"
                        checked={activeQuestion.isRequired}
                        onChange={(e) => setActiveQuestion({...activeQuestion, isRequired: e.target.checked})}
                        className="rounded"
                      />
                      <label htmlFor="required" className="text-sm">Required</label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="trap"
                        checked={activeQuestion.isTrap || false}
                        onChange={(e) => setActiveQuestion({...activeQuestion, isTrap: e.target.checked})}
                        className="rounded"
                      />
                      <label htmlFor="trap" className="text-sm">Trap Question</label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="qualifier"
                        checked={activeQuestion.isQualifier || false}
                        onChange={(e) => setActiveQuestion({...activeQuestion, isQualifier: e.target.checked})}
                        className="rounded"
                      />
                      <label htmlFor="qualifier" className="text-sm">Qualifier</label>
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowValidationBuilder(!showValidationBuilder)}
                      className="w-full text-left px-3 py-2 bg-white border rounded text-sm hover:bg-gray-50"
                    >
                      Validation Rules ({Object.keys(activeQuestion.validation || {}).length})
                    </button>
                    
                    <button
                      onClick={() => setShowLogicBuilder(!showLogicBuilder)}
                      className="w-full text-left px-3 py-2 bg-white border rounded text-sm hover:bg-gray-50"
                    >
                      Logic Rules ({activeQuestion.logic?.length || 0})
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-4">
                    <button
                      onClick={saveQuestion}
                      className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowQuestionForm(false)}
                      className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            {!showQuestionForm && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Survey Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Questions:</span>
                    <span className="font-medium">{questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Required:</span>
                    <span className="font-medium">{questions.filter(q => q.isRequired).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trap Questions:</span>
                    <span className="font-medium">{questions.filter(q => q.isTrap).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>With Logic:</span>
                    <span className="font-medium">{questions.filter(q => q.logic && q.logic.length > 0).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Groups:</span>
                    <span className="font-medium">{groups.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Preview Mode */
        <div className="max-w-2xl mx-auto">
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">Survey Preview</h2>
            <p className="text-blue-700 text-sm">This is how your survey will appear to respondents</p>
          </div>

          <div className="space-y-6">
            {questions
              .sort((a, b) => a.sequence - b.sequence)
              .map((question, index) => (
                <div key={question.id} className="bg-white p-6 border rounded-lg shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {index + 1}. {question.text}
                      {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    {question.description && (
                      <p className="text-gray-600 text-sm">{question.description}</p>
                    )}
                  </div>

                  {/* Render question based on type */}
                  <div>
                    {question.type === 'text' && (
                      <input type="text" className="w-full px-3 py-2 border rounded" placeholder="Enter your answer..." />
                    )}
                    
                    {question.type === 'textarea' && (
                      <textarea className="w-full px-3 py-2 border rounded" rows={4} placeholder="Enter your answer..." />
                    )}
                    
                    {question.type === 'single_choice' && (
                      <div className="space-y-2">
                        {question.options?.map(option => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <input type="radio" name={question.id} value={option.value} />
                            <label>{option.text}</label>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {question.type === 'multiple_choice' && (
                      <div className="space-y-2">
                        {question.options?.map(option => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <input type="checkbox" value={option.value} />
                            <label>{option.text}</label>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {question.type === 'scale' && (
                      <div className="flex items-center space-x-4">
                        <span className="text-sm">{question.settings?.scaleLabels?.[0] || '1'}</span>
                        <div className="flex space-x-2">
                          {Array.from({length: (question.settings?.scaleMax || 10) - (question.settings?.scaleMin || 1) + 1}, (_, i) => (
                            <button key={i} className="w-8 h-8 border rounded hover:bg-gray-100">
                              {(question.settings?.scaleMin || 1) + i}
                            </button>
                          ))}
                        </div>
                        <span className="text-sm">{question.settings?.scaleLabels?.[1] || '10'}</span>
                      </div>
                    )}
                    
                    {question.type === 'rating' && (
                      <div className="flex space-x-1">
                        {Array.from({length: question.settings?.scaleMax || 5}, (_, i) => (
                          <button key={i} className="text-2xl text-gray-300 hover:text-yellow-400">⭐</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedQuestionBuilder;
