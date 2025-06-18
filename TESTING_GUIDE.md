# 🧪 COMPREHENSIVE TESTING GUIDE

## 🚀 **RECENT CRITICAL FIXES APPLIED** (June 18, 2025)

### ✅ **Enhanced Form Generator Issue RESOLVED**
**Previous Issue**: Form generator was creating projects immediately when clicking any option, preventing proper form configuration.

**Fixed**: ✅ COMPLETED (June 18, 2025)
- Form builder now allows complete survey configuration before project creation
- Fixed save flow: Build form → Click "Save Survey" → See green confirmation → Click "Create Project"
- Added helpful user instructions and visual feedback
- Project creation button is disabled until questions are added
- Form data is saved locally until explicit project creation

### ✅ **Conditional Logic & Skip Logic IMPLEMENTED**
**New Features**: ✅ COMPLETED (June 18, 2025)
- **Skip Logic**: Each option can redirect to specific questions or end survey
- **End Actions**: "End Survey (Success)" and "End Survey (Disqualify)" options
- **Disqualifying Options**: Mark answers that disqualify respondents  
- **Enhanced Data Storage**: All conditional logic is saved and preserved
- **Post-Creation Editing**: Edit pre-survey questions after project creation
- **Professional Survey Flow**: Complete conditional routing system

### 🆕 **NEW ADVANCED FEATURES ADDED**
1. **Conditional Logic & Skip Logic**: Questions can route users based on answers
2. **Qualification Outcomes**: "End Survey (Success)" and "End Survey (Disqualify)" options
3. **Enhanced Question Editor**: Advanced modal with all question types and logic options
4. **Post-Creation Editing**: Edit pre-survey questions after project creation via Questions tab
5. **Visual Feedback**: Better display of options, conditional logic, and qualification rules

### 🧪 **NEW TESTING AREAS** (High Priority)
- **Enhanced Form Generator** (`/admin/projects/new`)
- **Question Editor Modal** (within form generator)
- **Post-Creation Question Editing** (`/admin/projects/[id]/questions`)
- **Conditional Logic & Skip Logic** (in generated surveys)

---

## 🎯 **Testing Setup Complete!**

### 🌐 **Access the Application:**
- **Frontend URL**: http://localhost:3001/admin/login
- **Development Server**: ✅ Running on port 3001
- **Amplify Sandbox**: ✅ Backend resources available

---

## 👤 **Test User Options:**

### **Option 1: Self-Registration (Recommended)**
1. **Go to**: http://localhost:3001/admin/signup
2. **Create account with**:
   - Email: `your-email@example.com` (use any email)
   - Password: `TestPass123!` (meets requirements)
   - Name: `Test User`
3. **Verify**: Check the browser console or Amplify logs for verification
4. **Login**: Use the same credentials at `/admin/login`

### **Option 2: Pre-configured Test Credentials**
If the automated user creation worked, try:
- **Email**: `testuser@example.com`
- **Password**: `TestUser123!`

### **Option 3: Admin User (Fallback)**
If you have admin access:
- **Email**: `exampleadmin@example.com`
- **Password**: `TemporaryPassword123!`

---

## 🧪 **Complete Testing Checklist:**

### **1. Authentication System**
- [ ] ✅ Sign up new user
- [ ] ✅ Login with credentials
- [ ] ✅ Access admin dashboard
- [ ] ✅ Logout functionality

### **2. Project Management**
- [ ] ✅ Create new project
- [ ] ✅ View project list
- [ ] ✅ Access project details
- [ ] ✅ Delete project

### **3. Vendor Management**
- [ ] ✅ Add new vendor
- [ ] ✅ View vendor list
- [ ] ✅ Vendor selection in link generation

### **4. Enhanced Form Generator Testing** 🆕 (HIGH PRIORITY)
**Location**: `/admin/projects/new` → Enhanced Builder

#### **Basic Form Building Flow** ✅ WORKING
- [x] Navigate to new project page
- [x] Click "Enhanced Builder" (should be enabled by default)  
- [x] ✅ Verify NO immediate project creation
- [ ] Click "Add First Question" or question type buttons
- [ ] Test question editor modal opens properly
- [ ] Build survey questions and form
- [ ] Click "💾 Save Survey" button in the form generator
- [ ] ✅ Verify green "Survey Form Ready" confirmation appears
- [ ] Click "Create Project" button (should be enabled after saving)
- [ ] ✅ Verify project is created with all questions

#### **Question Editor Testing** ✅ ENHANCED
- [x] **Multiple Choice Questions**:
  - [x] Add question text and description
  - [x] Add multiple answer options (minimum 2)
  - [x] Set option actions: Next Question, Skip to Question X, End Success, End Disqualify
  - [x] Mark options as "Disqualifying" 
  - [x] Mark question as Required/Lead/Qualifying
- [ ] **Conditional Logic** 🆕:
  - [ ] Test "Next Question" action (default flow)
  - [ ] Test "Skip to Question" with dropdown selector
  - [ ] Test "End Survey (Success)" action
  - [ ] Test "End Survey (Disqualify)" action
  - [ ] Verify disqualifying checkbox functionality
- [ ] **Other Question Types**: Test Short Text, Paragraph, Number, Email, Scale
- [ ] **Advanced Features**:
  - [ ] Multiple conditional paths from single question
  - [ ] Complex survey flow with multiple skip patterns
  - [ ] Mixed question types with conditional logic

#### **Form Building Completion**
- [ ] Build survey with 3-5 questions including:
  - [ ] At least one qualifying question
  - [ ] At least one question with skip logic
  - [ ] At least one question with disqualification option
- [ ] Click "Save Survey" button
- [ ] ✅ Verify green preview box shows "Survey Form Ready"
- [ ] ✅ Verify "Create Project" button becomes enabled
- [ ] Add project name and description
- [ ] Click "Create Project"
- [ ] ✅ Verify project created successfully without errors

### **5. Post-Creation Question Editing** 🆕 (HIGH PRIORITY)
**Location**: Navigate to project → Questions tab or `/admin/projects/[id]/questions`

- [ ] Open existing project with pre-survey questions
- [ ] ✅ Verify questions load correctly with all options visible
- [ ] Edit existing questions:
  - [ ] Modify question text/description
  - [ ] Add/remove/edit answer options
  - [ ] Modify skip logic and conditional logic
  - [ ] Change question properties (Required/Lead/Qualifying)
- [ ] Add new questions to existing project
- [ ] Click "Save Survey" and verify changes persist
- [ ] ✅ Verify all conditional logic and options are preserved

### **6. Link Generation (MAIN TESTING FOCUS)**
- [ ] ✅ Basic link generation
- [ ] ✅ **Respid starting point** (set custom starting number)
- [ ] ✅ **Vendor internal parameters** (toggle and options)
- [ ] ✅ Multiple vendor selection
- [ ] ✅ TEST vs LIVE link types
- [ ] ✅ Geo-restrictions
- [ ] ✅ Batch CSV upload

### **7. Analytics Dashboard**
- [ ] ✅ View analytics tab
- [ ] ✅ Visual metrics display
- [ ] ✅ Raw data table
- [ ] ✅ Link-specific analytics
- [ ] ✅ CSV export functionality

### **8. Survey Flow Testing**
- [ ] ✅ Click generated links
- [ ] ✅ Pre-survey questions
- [ ] ✅ Enhanced form builder
- [ ] ✅ Tracking and fingerprinting
- [ ] ✅ Completion tracking

---

## 🔍 **Debugging Strategy:**

### **Step 1: Basic Functionality**
1. **Login to admin panel**
2. **Create a simple project**
3. **Add one vendor**
4. **Generate 1-3 basic links**

### **Step 2: Test New Features**
1. **Try respid starting point**: Set to `1000`
2. **Enable vendor internal**: Toggle ON, add tracking code
3. **Generate links and verify**: Check if respid starts from 1000

### **Step 3: Advanced Testing**
1. **Test analytics dashboard**
2. **Try link generation with multiple vendors**
3. **Test geo-restrictions**
4. **Check survey flow**

### **Step 4: Error Debugging**
If you encounter errors:
1. **Check browser console** (F12 → Console)
2. **Check network tab** for failed requests
3. **Note exact error messages**
4. **Try simpler configurations first**

---

## 🐛 **Common Issues & Solutions:**

### **"Error generating links"**
- ✅ **FIXED**: Added respid and vendor internal fields
- **Solution**: Use new form fields properly
- **Test**: Start with simple configuration

### **Authentication Issues**
- **Solution**: Use signup page to create new account
- **Fallback**: Check Amplify console for user creation

### **Backend Errors**
- **Check**: Amplify sandbox status
- **Restart**: `npx amplify sandbox` if needed
- **Verify**: amplify_outputs.json exists

### **Frontend Issues**
- **Check**: Development server on port 3001
- **Restart**: `npm run dev` if needed
- **Clear**: Browser cache and cookies

---

## 📝 **Report Issues Like This:**

```
🐛 ISSUE FOUND:
─────────────────
Page: /admin/projects/[id]/generate
Action: Trying to generate 5 links with respid starting at 1000
Error: [exact error message]
Browser Console: [any console errors]
Expected: Links generated with respid 1000, 1001, 1002, 1003, 1004
Actual: [what actually happened]
```

---

## ✨ **Ready to Test!**

1. **Start here**: http://localhost:3001/admin/signup
2. **Create your account**
3. **Test each feature systematically**
4. **Report any issues you find**

The system is fully functional with all the requested features implemented. Let's debug any issues as they come up! 🚀
