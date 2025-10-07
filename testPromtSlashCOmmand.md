# Test Story Command

**Command:** `/test-story <story_id_or_description> [--summary]`

**Description:** Test implemented stories or workflows using Puppeteer MCP tools for comprehensive browser testing with intelligent workflow detection, error detection and automated fixing.

**Usage Examples:**
```bash
# Story ID Testing (traditional)
/test-story 4.1    # Test Story 4.1: Course Creation Wizard
/test-story 4.2    # Test Story 4.2: Content Upload & Management
/test-story 5.1    # Test Story 5.1: Question Bank Management

# Natural Language Workflow Testing (new)
/test-story "admin creating course"     # Test admin course creation workflow
/test-story "student enrollment"        # Test student enrollment workflow
/test-story "user login process"        # Test authentication workflow
/test-story "payment processing"        # Test payment workflow
/test-story "manual evaluation"         # Test evaluation workflow

# Summary Output Mode
/test-story "admin creating course" --summary    # Output to manual-test.md
/test-story 4.1 --summary                       # Short summary instead of detailed report
```

**Command Features:**
- **Dual Input Support:** Accept story IDs (4.1) or natural descriptions ("admin creating course")
- **Intelligent Workflow Detection:** Automatically maps descriptions to relevant components and workflows
- **Puppeteer MCP Integration:** Advanced browser automation and testing
- **Smart Error Detection:** Console, network, UI, and database error monitoring
- **Automatic Error Fixing:** Uses appropriate MCP tools (Supabase for DB, code editing for frontend)
- **Multi-Language Testing:** Tests both Arabic (RTL) and English (LTR) layouts
- **Flexible Output Modes:** Detailed reports or short summaries in manual-test.md
- **Database Validation:** Uses Supabase MCP tools for data integrity checks
- **Accessibility Testing:** WCAG 2.1 AA compliance validation
- **Performance Monitoring:** Load times, Core Web Vitals, and optimization
- **Mobile Responsiveness:** Cross-device testing and validation

**Testing Process:**

### Phase 1: Input Analysis & Workflow Detection
1. **Parse Input:** Determine if input is story ID (e.g., "4.1") or natural description
2. **Story ID Mode:** Load story requirements from prd.md and acceptance criteria
3. **Description Mode:** Apply intelligent workflow mapping:
   - "admin creating course" → Course creation workflow + admin components
   - "student enrollment" → Enrollment flow + payment + authentication
   - "user login" → Authentication workflow + user management
   - "payment processing" → Payment flow + Stripe integration + offline payments
   - "manual evaluation" → Assessment + grading + feedback workflows

### Phase 2: Component & Database Discovery
4. **Component Mapping:** Use Glob tool to find relevant components based on workflow
5. **Database Analysis:** Use Supabase MCP tools to identify related tables and data
6. **Navigation Planning:** Determine starting points and user journey paths

### Phase 3: Browser Testing Execution
7. **Browser Launch:** Use Puppeteer MCP tools with appropriate viewport and settings
8. **Workflow Execution:** Navigate and interact based on detected workflow:
   - Fill forms with realistic test data
   - Click through user journey steps
   - Test authentication and authorization
   - Validate database operations in real-time
9. **Multi-Language Testing:** Test both Arabic (RTL) and English (LTR) layouts
10. **Error Monitoring:** Continuous console, network, and UI error detection

### Phase 4: Validation & Error Resolution
11. **Database Validation:** Use Supabase MCP tools to verify data integrity
12. **Performance Analysis:** Monitor load times and Core Web Vitals
13. **Error Fixing:** Automatically resolve issues using appropriate MCP tools
14. **Accessibility Check:** Validate WCAG 2.1 AA compliance

### Phase 5: Report Generation
15. **Output Mode Selection:** Generate detailed report or summary based on --summary flag
16. **Evidence Collection:** Screenshots, error logs, and performance metrics
17. **Actionable Recommendations:** Provide specific fixes and improvements

## Smart Error Resolution System

### Error Detection Categories

#### 1. Console & JavaScript Errors
- **Detection:** Real-time console monitoring via Puppeteer MCP tools
- **Types:** Runtime errors, TypeScript compilation issues, React warnings
- **Resolution:**
  - Use Edit tool to fix code issues
  - Update component logic and imports
  - Fix TypeScript type definitions
  - Resolve dependency conflicts

#### 2. Database & Backend Errors
- **Detection:** API response monitoring, Supabase MCP error logs
- **Types:** Connection issues, query failures, constraint violations, RLS policy errors
- **Resolution:**
  - Use Supabase MCP tools to fix schema issues
  - Update RLS policies for proper access
  - Repair data integrity problems
  - Apply necessary migrations

#### 3. UI/UX & Layout Issues
- **Detection:** Element validation, screenshot analysis, responsive testing
- **Types:** Missing elements, layout breaks, RTL/LTR issues, mobile responsiveness
- **Resolution:**
  - Use Edit tool to fix component styling
  - Update CSS/Tailwind classes
  - Fix responsive breakpoints
  - Resolve RTL layout problems

#### 4. Performance & Network Issues
- **Detection:** Network request monitoring, Core Web Vitals tracking
- **Types:** Slow loading, failed requests, large bundle sizes, API timeouts
- **Resolution:**
  - Optimize component rendering
  - Implement lazy loading
  - Fix API endpoint issues
  - Update service configurations

#### 5. Authentication & Authorization Errors
- **Detection:** Login flow testing, protected route validation
- **Types:** Auth failures, permission issues, session problems
- **Resolution:**
  - Use Supabase MCP tools to fix auth policies
  - Update user roles and permissions
  - Fix authentication flow logic
  - Resolve session management issues

### Automatic Fixing Workflow

1. **Error Classification:** Categorize detected errors by type and severity
2. **Impact Assessment:** Determine if error is critical, high, medium, or low priority
3. **Tool Selection:** Choose appropriate MCP tool for resolution:
   - **Supabase MCP:** Database, auth, and backend issues
   - **Edit Tool:** Frontend code and component fixes
   - **Puppeteer MCP:** Browser-specific configuration issues
4. **Fix Application:** Apply fixes automatically with validation
5. **Regression Testing:** Re-test workflow to ensure fix works
6. **Documentation:** Log all fixes applied for reporting

### Error Priority Matrix

**Critical (Auto-fix immediately):**
- Application crashes or won't load
- Database connection failures
- Authentication completely broken
- Core functionality non-functional

**High (Fix during test run):**
- Console errors affecting functionality
- Database constraint violations
- UI elements not responding
- Performance issues > 3 seconds

**Medium (Fix if time permits):**
- Minor console warnings
- Styling inconsistencies
- Non-critical accessibility issues
- Performance issues 1-3 seconds

**Low (Log for future improvement):**
- Cosmetic issues
- Minor optimization opportunities
- Non-critical warnings
- Enhancement suggestions

**Test Coverage:**
- User journey testing (end-to-end workflows)
- Form validation and error handling
- Authentication and authorization
- Database CRUD operations
- Multi-language functionality
- Responsive design across devices
- Performance benchmarks

## Output Modes

### Default Mode (Detailed Report)
**File:** `test-report-{workflow}-{timestamp}.md`
**Content:** Comprehensive test report with:
- Executive summary with pass/fail status
- Detailed test scenario results
- Screenshots and visual evidence
- Complete error logs and resolution steps
- Performance metrics and recommendations
- Database validation results
- Accessibility compliance report

### Summary Mode (`--summary` flag)
**File:** `manual-test.md` (appends to existing file)
**Content:** Short summary with:
- Test execution timestamp
- Workflow tested and overall result
- Critical issues found (if any)
- Errors detected and fixed
- Key metrics (load time, errors resolved)
- Quick recommendation summary

**Summary Format Example:**
```markdown
## Test: Admin Creating Course - 2025-01-19 14:30
**Status:** ✅ PASS
**Duration:** 2m 15s
**Errors Found:** 2 (auto-fixed)
**Performance:** Good (1.2s avg load)
**Issues:** Minor CSS alignment in RTL mode (fixed)
**Database:** All operations successful
```

## Workflow Intelligence Mapping

### Supported Workflow Descriptions
- **"admin creating course"** → `/admin/courses/new` + course creation components
- **"student enrollment"** → Landing page → Course detail → Enrollment flow
- **"user login"** → Authentication forms + user management
- **"payment processing"** → Payment selection → Stripe + offline workflows
- **"manual evaluation"** → Exam interface → Evaluation dashboard → Results
- **"course discovery"** → Landing page → Catalog → Search and filters
- **"certificate generation"** → Assessment completion → Certificate creation

### Auto-Detection Logic
1. **Keyword Analysis:** Extract key terms from description
2. **Component Mapping:** Match to relevant React components
3. **Database Context:** Identify related tables and operations
4. **Navigation Planning:** Determine optimal user journey
5. **Test Data:** Prepare appropriate test data for workflow

## Practical Usage Examples

### Example 1: Quick Workflow Testing
```bash
/test-story "admin creating course" --summary
```
**Result:** Tests admin course creation workflow, outputs short summary to `manual-test.md`

### Example 2: Comprehensive Story Testing
```bash
/test-story 4.1
```
**Result:** Tests Story 4.1 acceptance criteria, generates detailed report

### Example 3: Payment Flow Validation
```bash
/test-story "payment processing"
```
**Result:** Tests both Stripe and offline payment workflows with full error detection

### Example 4: Mobile Enrollment Testing
```bash
/test-story "student enrollment" --summary
```
**Result:** Tests enrollment on mobile viewport, validates responsive design

## Integration with Development Workflow

### When to Use `/test-story`
- **After implementing a story:** Validate all acceptance criteria met
- **Before committing changes:** Ensure no regressions introduced
- **Quick workflow validation:** Test specific user journeys
- **Error investigation:** When you suspect issues in specific areas
- **Performance monitoring:** Regular checks on key workflows

### Integration with Other Commands
- **After `/dev-story`:** Use `/test-story` to validate implementation
- **Before deployment:** Run comprehensive testing on all key workflows
- **During debugging:** Use natural language descriptions to test specific areas

### Best Practices
1. **Use descriptive workflow names** for better component detection
2. **Include --summary flag** for quick validation cycles
3. **Run full testing** before major releases or commits
4. **Monitor manual-test.md** for patterns in issues
5. **Let auto-fixing handle** routine errors during development

## Command Backwards Compatibility

The enhanced `/test-story` command maintains full backwards compatibility:
- **Existing usage** `/test-story 4.1` continues to work exactly as before
- **New functionality** adds natural language support without breaking changes
- **Output formats** default to existing detailed reports unless --summary specified
- **All existing features** remain unchanged and available

**Output:** Flexible output based on mode - detailed reports or short summaries in manual-test.md, with automatically applied fixes, intelligent workflow detection, and comprehensive error resolution.

---

# IMPLEMENTATION SECTION

## CRITICAL EXECUTION INSTRUCTIONS FOR CLAUDE CODE

**⚠️ MANDATORY TOOL USAGE ⚠️**

When executing the `/test-story` command, Claude Code MUST:

1. **ONLY use Puppeteer MCP tools** - Specifically the `mcp__puppeteer-enhanced__*` tools
2. **NEVER use Playwright MCP tools** - Do not use any `mcp__playwright__*` tools
3. **Follow the exact tool call sequences** provided in the sections below
4. **Use the provided JavaScript scripts** for console monitoring and error detection

**🚫 FORBIDDEN TOOLS:** Any tool starting with `mcp__playwright__`
**✅ REQUIRED TOOLS:** Only tools starting with `mcp__puppeteer-enhanced__`

## Puppeteer MCP Tools Implementation

**CRITICAL:** This command MUST use Puppeteer MCP tools explicitly. Do NOT use Playwright MCP tools.

### Required Puppeteer MCP Tool Sequence

#### 1. Browser Initialization
```
Use: mcp__puppeteer-enhanced__puppeteer_launch
Parameters:
- headless: false (for visual debugging)
- viewport: { width: 1366, height: 768 }
- stealth: true (to avoid detection)
```

#### 2. Page Management
```
Use: mcp__puppeteer-enhanced__puppeteer_new_page
Parameters:
- pageId: "test-session-{timestamp}"
```

#### 3. Navigation and Interaction
```
Use: mcp__puppeteer-enhanced__puppeteer_navigate
Use: mcp__puppeteer-enhanced__puppeteer_click
Use: mcp__puppeteer-enhanced__puppeteer_type
Use: mcp__puppeteer-enhanced__puppeteer_wait_for_selector
```

#### 4. Console Monitoring (CRITICAL)
```
Use: mcp__puppeteer-enhanced__puppeteer_evaluate
Script: "() => { return console.log.toString(); }"
Purpose: Monitor console errors and warnings in real-time
```

#### 5. Evidence Collection
```
Use: mcp__puppeteer-enhanced__puppeteer_screenshot
Parameters:
- fullPage: true
- path: "test-evidence-{workflow}-{timestamp}.png"
```

### Workflow-Specific Puppeteer Implementation

#### Admin Course Creation Workflow
```javascript
// 1. Launch Puppeteer browser
mcp__puppeteer-enhanced__puppeteer_launch({
  headless: false,
  viewport: { width: 1366, height: 768 },
  stealth: true
})

// 2. Create new page
mcp__puppeteer-enhanced__puppeteer_new_page({
  pageId: "admin-course-creation"
})

// 3. Navigate to admin panel
mcp__puppeteer-enhanced__puppeteer_navigate({
  pageId: "admin-course-creation",
  url: "http://localhost:5173/admin/courses/new"
})

// 4. Console monitoring setup
mcp__puppeteer-enhanced__puppeteer_evaluate({
  pageId: "admin-course-creation",
  script: `
    () => {
      const errors = [];
      const originalConsoleError = console.error;
      console.error = (...args) => {
        errors.push(args.join(' '));
        originalConsoleError.apply(console, args);
      };
      return { setupComplete: true };
    }
  `
})

// 5. Fill course creation form
mcp__puppeteer-enhanced__puppeteer_type({
  pageId: "admin-course-creation",
  selector: "input[name='title']",
  text: "Test Course Title"
})

// 6. Click create button
mcp__puppeteer-enhanced__puppeteer_click({
  pageId: "admin-course-creation",
  selector: "button[type='submit']"
})

// 7. Take screenshot for evidence
mcp__puppeteer-enhanced__puppeteer_screenshot({
  pageId: "admin-course-creation",
  fullPage: true
})
```

#### Student Enrollment Workflow
```javascript
// 1. Launch browser for enrollment testing
mcp__puppeteer-enhanced__puppeteer_launch({
  headless: false,
  viewport: { width: 375, height: 667 }, // Mobile viewport
  stealth: true
})

// 2. Create enrollment test page
mcp__puppeteer-enhanced__puppeteer_new_page({
  pageId: "student-enrollment"
})

// 3. Start from landing page
mcp__puppeteer-enhanced__puppeteer_navigate({
  pageId: "student-enrollment",
  url: "http://localhost:5173/"
})

// 4. Monitor console for errors
mcp__puppeteer-enhanced__puppeteer_evaluate({
  pageId: "student-enrollment",
  script: `
    () => {
      window.testErrors = [];
      const originalError = console.error;
      console.error = (...args) => {
        window.testErrors.push({
          timestamp: new Date().toISOString(),
          error: args.join(' ')
        });
        originalError.apply(console, args);
      };
      return { monitoringSetup: true };
    }
  `
})

// 5. Navigate through enrollment flow
mcp__puppeteer-enhanced__puppeteer_click({
  pageId: "student-enrollment",
  selector: ".course-card:first-child .enroll-button"
})

// 6. Wait for enrollment form
mcp__puppeteer-enhanced__puppeteer_wait_for_selector({
  pageId: "student-enrollment",
  selector: "form[data-testid='enrollment-form']"
})
```

#### Payment Processing Workflow
```javascript
// 1. Launch browser for payment testing
mcp__puppeteer-enhanced__puppeteer_launch({
  headless: false,
  viewport: { width: 1366, height: 768 },
  stealth: true
})

// 2. Create payment test page
mcp__puppeteer-enhanced__puppeteer_new_page({
  pageId: "payment-processing"
})

// 3. Navigate to payment page
mcp__puppeteer-enhanced__puppeteer_navigate({
  pageId: "payment-processing",
  url: "http://localhost:5173/payment"
})

// 4. Network monitoring setup
mcp__puppeteer-enhanced__puppeteer_evaluate({
  pageId: "payment-processing",
  script: `
    () => {
      window.networkErrors = [];
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        try {
          const response = await originalFetch(...args);
          if (!response.ok) {
            window.networkErrors.push({
              url: args[0],
              status: response.status,
              statusText: response.statusText
            });
          }
          return response;
        } catch (error) {
          window.networkErrors.push({
            url: args[0],
            error: error.message
          });
          throw error;
        }
      };
      return { networkMonitoringSetup: true };
    }
  `
})
```

#### User Login Process Workflow
```javascript
// 1. Launch browser for authentication testing
mcp__puppeteer-enhanced__puppeteer_launch({
  headless: false,
  viewport: { width: 1366, height: 768 },
  stealth: true
})

// 2. Create login test page
mcp__puppeteer-enhanced__puppeteer_new_page({
  pageId: "user-login"
})

// 3. Navigate to login page
mcp__puppeteer-enhanced__puppeteer_navigate({
  pageId: "user-login",
  url: "http://localhost:5173/auth/login"
})

// 4. Setup authentication monitoring
mcp__puppeteer-enhanced__puppeteer_evaluate({
  pageId: "user-login",
  script: `
    () => {
      window.authErrors = [];
      // Monitor authentication API calls
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        try {
          const response = await originalFetch(...args);
          if (args[0].includes('/auth/') && !response.ok) {
            window.authErrors.push({
              timestamp: new Date().toISOString(),
              url: args[0],
              status: response.status,
              statusText: response.statusText
            });
          }
          return response;
        } catch (error) {
          if (args[0].includes('/auth/')) {
            window.authErrors.push({
              timestamp: new Date().toISOString(),
              url: args[0],
              error: error.message
            });
          }
          throw error;
        }
      };
      return { authMonitoringSetup: true };
    }
  `
})

// 5. Fill login form
mcp__puppeteer-enhanced__puppeteer_type({
  pageId: "user-login",
  selector: "input[name='email']",
  text: "test@example.com"
})

mcp__puppeteer-enhanced__puppeteer_type({
  pageId: "user-login",
  selector: "input[name='password']",
  text: "testpassword123"
})

// 6. Submit login form
mcp__puppeteer-enhanced__puppeteer_click({
  pageId: "user-login",
  selector: "button[type='submit']"
})

// 7. Wait for authentication redirect
mcp__puppeteer-enhanced__puppeteer_wait_for_selector({
  pageId: "user-login",
  selector: "[data-testid='dashboard']",
  timeout: 10000
})
```

#### Manual Evaluation Workflow
```javascript
// 1. Launch browser for evaluation testing
mcp__puppeteer-enhanced__puppeteer_launch({
  headless: false,
  viewport: { width: 1366, height: 768 },
  stealth: true
})

// 2. Create evaluation test page
mcp__puppeteer-enhanced__puppeteer_new_page({
  pageId: "manual-evaluation"
})

// 3. Navigate to evaluation dashboard
mcp__puppeteer-enhanced__puppeteer_navigate({
  pageId: "manual-evaluation",
  url: "http://localhost:5173/instructor/evaluations"
})

// 4. Setup evaluation monitoring
mcp__puppeteer-enhanced__puppeteer_evaluate({
  pageId: "manual-evaluation",
  script: `
    () => {
      window.evaluationData = {
        submissions: [],
        grades: [],
        feedback: []
      };

      // Monitor evaluation actions
      document.addEventListener('click', (e) => {
        if (e.target.matches('[data-action="grade"]')) {
          window.evaluationData.grades.push({
            timestamp: new Date().toISOString(),
            action: 'grade_clicked',
            target: e.target.dataset.submissionId
          });
        }
      });

      return { evaluationMonitoringSetup: true };
    }
  `
})

// 5. Click on first submission to evaluate
mcp__puppeteer-enhanced__puppeteer_click({
  pageId: "manual-evaluation",
  selector: ".submission-item:first-child .evaluate-button"
})

// 6. Wait for evaluation form
mcp__puppeteer-enhanced__puppeteer_wait_for_selector({
  pageId: "manual-evaluation",
  selector: "form[data-testid='evaluation-form']"
})

// 7. Fill evaluation form
mcp__puppeteer-enhanced__puppeteer_type({
  pageId: "manual-evaluation",
  selector: "input[name='score']",
  text: "85"
})

mcp__puppeteer-enhanced__puppeteer_type({
  pageId: "manual-evaluation",
  selector: "textarea[name='feedback']",
  text: "Good work! Consider improving the conclusion section."
})

// 8. Submit evaluation
mcp__puppeteer-enhanced__puppeteer_click({
  pageId: "manual-evaluation",
  selector: "button[data-action='submit-evaluation']"
})
```

#### Course Discovery Workflow
```javascript
// 1. Launch browser for discovery testing
mcp__puppeteer-enhanced__puppeteer_launch({
  headless: false,
  viewport: { width: 1366, height: 768 },
  stealth: true
})

// 2. Create discovery test page
mcp__puppeteer-enhanced__puppeteer_new_page({
  pageId: "course-discovery"
})

// 3. Navigate to courses catalog
mcp__puppeteer-enhanced__puppeteer_navigate({
  pageId: "course-discovery",
  url: "http://localhost:5173/courses"
})

// 4. Setup search and filter monitoring
mcp__puppeteer-enhanced__puppeteer_evaluate({
  pageId: "course-discovery",
  script: `
    () => {
      window.discoveryActions = {
        searches: [],
        filters: [],
        courseViews: []
      };

      // Monitor search actions
      const searchInput = document.querySelector('input[type="search"]');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          window.discoveryActions.searches.push({
            timestamp: new Date().toISOString(),
            query: e.target.value,
            resultsCount: document.querySelectorAll('.course-card').length
          });
        });
      }

      return { discoveryMonitoringSetup: true };
    }
  `
})

// 5. Test search functionality
mcp__puppeteer-enhanced__puppeteer_type({
  pageId: "course-discovery",
  selector: "input[type='search']",
  text: "programming"
})

// 6. Wait for search results
mcp__puppeteer-enhanced__puppeteer_wait_for_selector({
  pageId: "course-discovery",
  selector: ".course-card",
  timeout: 5000
})

// 7. Test filter functionality
mcp__puppeteer-enhanced__puppeteer_click({
  pageId: "course-discovery",
  selector: "select[name='category'] option[value='technology']"
})

// 8. Click on first course to view details
mcp__puppeteer-enhanced__puppeteer_click({
  pageId: "course-discovery",
  selector: ".course-card:first-child"
})
```

### Error Detection Implementation

#### Console Error Monitoring
```javascript
// Use this script with mcp__puppeteer-enhanced__puppeteer_evaluate
const consoleMonitoringScript = `
  () => {
    if (window.errorCollector) return window.errorCollector;

    window.errorCollector = {
      errors: [],
      warnings: [],
      networkErrors: []
    };

    // Console error capture
    const originalError = console.error;
    console.error = (...args) => {
      window.errorCollector.errors.push({
        timestamp: new Date().toISOString(),
        message: args.join(' '),
        stack: new Error().stack
      });
      originalError.apply(console, args);
    };

    // Console warning capture
    const originalWarn = console.warn;
    console.warn = (...args) => {
      window.errorCollector.warnings.push({
        timestamp: new Date().toISOString(),
        message: args.join(' ')
      });
      originalWarn.apply(console, args);
    };

    // Network error monitoring
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          window.errorCollector.networkErrors.push({
            timestamp: new Date().toISOString(),
            url: args[0],
            status: response.status,
            statusText: response.statusText
          });
        }
        return response;
      } catch (error) {
        window.errorCollector.networkErrors.push({
          timestamp: new Date().toISOString(),
          url: args[0],
          error: error.message
        });
        throw error;
      }
    };

    return window.errorCollector;
  }
`;
```

#### Error Retrieval
```javascript
// Use this script to get collected errors
const getErrorsScript = `
  () => {
    return window.errorCollector || { errors: [], warnings: [], networkErrors: [] };
  }
`;
```

### Multi-Language Testing Implementation

#### RTL (Arabic) Testing
```javascript
// Switch to Arabic and test RTL layout
mcp__puppeteer-enhanced__puppeteer_evaluate({
  pageId: "test-page",
  script: `
    () => {
      // Switch to Arabic language
      localStorage.setItem('language', 'ar');
      // Trigger language change
      window.dispatchEvent(new Event('languagechange'));
      // Verify RTL direction
      return {
        language: localStorage.getItem('language'),
        direction: document.documentElement.getAttribute('dir'),
        rtlActive: document.documentElement.getAttribute('dir') === 'rtl'
      };
    }
  `
})
```

#### LTR (English) Testing
```javascript
// Switch to English and test LTR layout
mcp__puppeteer-enhanced__puppeteer_evaluate({
  pageId: "test-page",
  script: `
    () => {
      localStorage.setItem('language', 'en');
      window.dispatchEvent(new Event('languagechange'));
      return {
        language: localStorage.getItem('language'),
        direction: document.documentElement.getAttribute('dir'),
        ltrActive: document.documentElement.getAttribute('dir') === 'ltr'
      };
    }
  `
})
```

### Performance Monitoring Implementation

#### Core Web Vitals Collection
```javascript
// Use with mcp__puppeteer-enhanced__puppeteer_evaluate
const performanceScript = `
  () => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const metrics = {
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          firstPaint: 0,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0
        };

        entries.forEach((entry) => {
          if (entry.name === 'first-paint') {
            metrics.firstPaint = entry.startTime;
          }
          if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = entry.startTime;
          }
          if (entry.entryType === 'largest-contentful-paint') {
            metrics.largestContentfulPaint = entry.startTime;
          }
        });

        resolve(metrics);
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

      // Fallback timeout
      setTimeout(() => {
        resolve({
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          firstPaint: 0,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0
        });
      }, 5000);
    });
  }
`;
```

### Mandatory Tool Usage Checklist

**ALWAYS use these Puppeteer MCP tools (NEVER Playwright):**

✅ `mcp__puppeteer-enhanced__puppeteer_launch` - Browser initialization
✅ `mcp__puppeteer-enhanced__puppeteer_new_page` - Page creation
✅ `mcp__puppeteer-enhanced__puppeteer_navigate` - URL navigation
✅ `mcp__puppeteer-enhanced__puppeteer_click` - Element clicking
✅ `mcp__puppeteer-enhanced__puppeteer_type` - Text input
✅ `mcp__puppeteer-enhanced__puppeteer_evaluate` - Console monitoring
✅ `mcp__puppeteer-enhanced__puppeteer_screenshot` - Evidence capture
✅ `mcp__puppeteer-enhanced__puppeteer_wait_for_selector` - Element waiting
✅ `mcp__puppeteer-enhanced__puppeteer_close_page` - Page cleanup
✅ `mcp__puppeteer-enhanced__puppeteer_close_browser` - Browser cleanup

**DO NOT USE:** Any `mcp__playwright__*` tools

---

## COMMAND EXECUTION TEMPLATE

When Claude Code executes `/test-story`, follow this exact sequence:

### Step 1: Initialize Testing Environment
```
1. Parse user input (story ID or workflow description)
2. Determine workflow type based on input
3. Initialize Puppeteer browser using mcp__puppeteer-enhanced__puppeteer_launch
4. Create new page using mcp__puppeteer-enhanced__puppeteer_new_page
```

### Step 2: Setup Error Monitoring
```
5. Use mcp__puppeteer-enhanced__puppeteer_evaluate to setup console monitoring
6. Use mcp__puppeteer-enhanced__puppeteer_evaluate to setup network monitoring
7. Use mcp__puppeteer-enhanced__puppeteer_evaluate to setup performance monitoring
```

### Step 3: Execute Workflow
```
8. Use mcp__puppeteer-enhanced__puppeteer_navigate to go to starting URL
9. Use mcp__puppeteer-enhanced__puppeteer_click and mcp__puppeteer-enhanced__puppeteer_type for interactions
10. Use mcp__puppeteer-enhanced__puppeteer_wait_for_selector for element waits
11. Use mcp__puppeteer-enhanced__puppeteer_screenshot for evidence collection
```

### Step 4: Multi-Language Testing
```
12. Switch to Arabic using mcp__puppeteer-enhanced__puppeteer_evaluate
13. Test RTL layout and functionality
14. Switch to English using mcp__puppeteer-enhanced__puppeteer_evaluate
15. Test LTR layout and functionality
```

### Step 5: Error Collection and Reporting
```
16. Use mcp__puppeteer-enhanced__puppeteer_evaluate to collect all errors
17. Use mcp__puppeteer-enhanced__puppeteer_evaluate to collect performance metrics
18. Generate test report based on --summary flag
19. Use mcp__puppeteer-enhanced__puppeteer_close_page and mcp__puppeteer-enhanced__puppeteer_close_browser
```

### Example Command Execution Flow
```
User inputs: /test-story "admin creating course"

Claude Code should execute:
1. mcp__puppeteer-enhanced__puppeteer_launch(...)
2. mcp__puppeteer-enhanced__puppeteer_new_page(...)
3. mcp__puppeteer-enhanced__puppeteer_evaluate(...) [setup monitoring]
4. mcp__puppeteer-enhanced__puppeteer_navigate(...)
5. mcp__puppeteer-enhanced__puppeteer_type(...) [fill course form]
6. mcp__puppeteer-enhanced__puppeteer_click(...) [submit form]
7. mcp__puppeteer-enhanced__puppeteer_screenshot(...)
8. [Continue with Arabic/English testing]
9. mcp__puppeteer-enhanced__puppeteer_evaluate(...) [collect results]
10. mcp__puppeteer-enhanced__puppeteer_close_browser(...)
```