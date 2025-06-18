# Pre-Survey Toggle Testing Guide

## Overview
The pre-survey toggle allows users to enable or disable pre-survey questions when creating a new project. This guide provides comprehensive testing steps to validate the functionality.

## Features Implemented

### 1. Pre-Survey Toggle
- **Location**: Project creation page (`/admin/projects/new`)
- **Function**: Toggle switch to enable/disable pre-survey questions
- **Default**: Enabled (checked)
- **Visual**: Blue toggle when enabled, gray when disabled

### 2. Conditional Form Builder
- **When Enabled**: Shows the enhanced form builder section
- **When Disabled**: Hides the form builder section completely
- **Dynamic Messages**: Shows appropriate status messages

### 3. Project Creation Logic
- **Pre-Survey Enabled**: Requires at least one question before creating project
- **Pre-Survey Disabled**: Can create project without any questions
- **Database Storage**: Stores the toggle state in project settings

## Test Cases

### Test Case 1: Pre-Survey Enabled (Default)
1. Navigate to `/admin/projects/new`
2. Verify the toggle is **ON** (blue) by default
3. Verify the message shows "✅ Pre-survey questions will be included"
4. Verify the form builder section is visible
5. Try to create project without questions - should show error
6. Add questions using the enhanced form builder
7. Create project - should succeed and include pre-survey questions

### Test Case 2: Pre-Survey Disabled
1. Navigate to `/admin/projects/new`
2. Click the toggle to **disable** pre-survey questions
3. Verify the toggle is **OFF** (gray)
4. Verify the message shows "⏭️ Skip pre-survey questions"
5. Verify the form builder section is hidden
6. Fill in project name and description
7. Create project - should succeed without requiring questions

### Test Case 3: Toggle Between States
1. Start with pre-survey enabled
2. Add some questions using the form builder
3. Toggle pre-survey off
4. Verify form builder disappears but questions remain in state
5. Toggle pre-survey back on
6. Verify form builder reappears with previous questions

### Test Case 4: Submit Button States
1. **Pre-Survey Enabled + No Questions**: Button disabled, shows "Add Questions First"
2. **Pre-Survey Enabled + Has Questions**: Button enabled, shows "Create Project"
3. **Pre-Survey Disabled**: Button enabled regardless of questions, shows "Create Project"

### Test Case 5: Project Settings Storage
1. Create project with pre-survey enabled
2. Check database for `settings.enablePreSurvey = true`
3. Create project with pre-survey disabled
4. Check database for `settings.enablePreSurvey = false`

## UI Elements to Verify

### Toggle Component
```
[ Pre-Survey Questions ]
Enable pre-survey questions to qualify and screen respondents before they access the main survey.
[TOGGLE] Enabled/Disabled
```

### Status Messages
- **Enabled**: Green box with "✅ Pre-survey questions will be included. Configure them in the section below."
- **Disabled**: Gray box with "⏭️ Skip pre-survey questions. Respondents will go directly to the main survey."

### Form Builder Section
- Only visible when toggle is enabled
- Contains enhanced form generator
- Shows question preview when questions exist

## Technical Implementation Details

### State Management
```typescript
const [enablePreSurvey, setEnablePreSurvey] = useState(true);
```

### Conditional Rendering
```jsx
{enablePreSurvey && (
  <div className="mb-6 border-t border-gray-200 pt-6">
    {/* Form builder content */}
  </div>
)}
```

### Project Creation Logic
```typescript
const projectSettings = {
  preSurveyQuestions: enablePreSurvey ? questions : [],
  enablePreSurvey: enablePreSurvey,
  // ... other settings
};
```

### Validation Logic
```typescript
if (enablePreSurvey && questions.length === 0) {
  setError('Please add at least one question or disable pre-survey questions');
  return;
}
```

## Expected Behavior Summary

| Pre-Survey Toggle | Form Builder Visible | Questions Required | Can Create Project |
|------------------|-------------------|------------------|------------------|
| ✅ Enabled       | Yes               | Yes              | Only with questions |
| ❌ Disabled      | No                | No               | Yes (always) |

## Error Scenarios

### 1. Pre-Survey Enabled Without Questions
- **Error**: "Please add at least one question to your survey before creating the project, or disable pre-survey questions"
- **Solution**: Either add questions or disable pre-survey toggle

### 2. Empty Project Name
- **Error**: "Project name is required"
- **Solution**: Fill in project name field

## Success Indicators

1. ✅ Toggle switches smoothly between states
2. ✅ Form builder appears/disappears correctly
3. ✅ Status messages update appropriately
4. ✅ Submit button behavior changes correctly
5. ✅ Projects create successfully in both modes
6. ✅ Pre-survey questions are stored when enabled
7. ✅ No pre-survey questions when disabled

## Browser Testing URLs

1. **New Project Page**: `http://localhost:3001/admin/projects/new`
2. **Admin Dashboard**: `http://localhost:3001/admin`
3. **Project List**: `http://localhost:3001/admin/projects`

## Database Verification

After creating projects, check the `projects` table:
- `settings` column should contain JSON with `enablePreSurvey` boolean
- `preSurveyQuestions` array should be empty when toggle is disabled
- `preSurveyQuestions` array should contain questions when toggle is enabled

## Notes

- The toggle state is **not** persisted across page reloads (intentional)
- Default state is **enabled** for new projects
- Questions remain in component state when toggling (for UX convenience)
- The enhanced form builder only appears when pre-survey is enabled
- Project creation respects the toggle state for validation and data storage
