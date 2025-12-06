# 🤝 Contributing to VibeCode

Thank you for your interest in VibeCode! We welcome any contribution.

## 📋 Contents

1. [Getting Started](#getting-started)
2. [Running Locally](#running-locally)
3. [Branch Rules](#branch-rules)
4. [Current Tasks](#current-tasks)
5. [Development Process](#development-process)
6. [Code Standards](#code-standards)
7. [Creating Pull Request](#creating-pull-request)
8. [Issues Workflow](#issues-workflow)

---

## 🚀 Getting Started

### 1. Fork the Repository

Click the "Fork" button on the repository page.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/VibeCode.git
cd VibeCode
```

### 3. Setup Project

See [SETUP.md](SETUP.md) for detailed instructions.

### 4. Create a Branch

```bash
git checkout -b feature/feature-name
```

---

## 🚀 Running Locally

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Pletnev86/VibeCode.git
cd VibeCode

# 2. Install dependencies
npm install

# 3. Configure
cp config.json.example config.json
# Open config.json and add API keys (optional)

# 4. Run the application
npm start
```

### Development Mode

```bash
# Run with DevTools
npm run dev

# Rebuild native modules (if needed)
npm run rebuild
```

### Requirements

- **Node.js** 16+ and **npm** 8+
- **LM Studio** (optional, for local models)
- **OpenRouter API Key** (optional, for cloud models)

📖 **Detailed Guide:** [SETUP.md](SETUP.md)

---

## 🌿 Branch Rules

### Naming Convention

Use prefixes for change types:

- `feature/` - new feature
  ```bash
  git checkout -b feature/add-monaco-editor
  ```

- `fix/` - bug fix
  ```bash
  git checkout -b fix/parsing-files-path
  ```

- `docs/` - documentation
  ```bash
  git checkout -b docs/update-readme
  ```

- `refactor/` - refactoring
  ```bash
  git checkout -b refactor/improve-router
  ```

- `test/` - tests
  ```bash
  git checkout -b test/add-unit-tests
  ```

### Branch Structure

```
main/master (production)
  ├── develop (development)
  │   ├── feature/xxx
  │   ├── fix/xxx
  │   └── refactor/xxx
```

### Working with Branches

1. **Always create branch from `master`** (or `develop` if exists)
2. **One branch = one task**
3. **Use clear names** in English
4. **Delete branch after merge**

### Syncing with Upstream

```bash
# Add upstream (once)
git remote add upstream https://github.com/Pletnev86/VibeCode.git

# Before creating new branch, sync
git checkout master
git fetch upstream
git merge upstream/master
```

---

## 🎯 Current Tasks

### 🔴 Critical (urgently needed)

#### 1. Fix Knowledge Base (better-sqlite3)

**Problem:** `better-sqlite3` doesn't compile on some systems.

**What's needed:**
- Fix better-sqlite3 compilation issue
- Or find alternative (node-sqlite3, sql.js)
- Ensure graceful degradation (work without DB)

**Files:**
- `lib/knowledge-base.js`
- `src/main.js` (initialization)

**Priority:** 🔴 High

---

#### 2. Improve File Parsing in Self-Build

**Problem:** Self-Build sometimes creates files in wrong directory (`src/src/`).

**What's needed:**
- Improve `parseFilesFromResult()` in `agents/selfdev.js`
- Improve path normalization
- Add path validation before saving

**Files:**
- `agents/selfdev.js` (methods `parseFilesFromResult`, `normalizePath`)

**Priority:** 🔴 High

---

#### 3. Restore Full UI Functionality

**Problem:** UI files were overwritten, need to check all functions.

**What's needed:**
- Check all buttons (Self-Build, Analyze Project, Enhance Modules)
- Check provider switching
- Check log display
- Add error handling

**Files:**
- `src/index.html`
- `src/ui.js`
- `src/main.js` (IPC handlers)

**Priority:** 🔴 High

---

### 🟡 Important (needed soon)

#### 4. Implement Refactor Agent

**What's needed:**
- Create `agents/refactor.js`
- Integrate with InterAgentController
- Add IPC handler in `src/main.js`
- Add button in UI

**Priority:** 🟡 Medium

**See example:** `agents/selfdev.js`

---

#### 5. Implement Fix Agent

**What's needed:**
- Create `agents/fix.js`
- Analyze code errors
- Generate fixes
- Integrate with system

**Priority:** 🟡 Medium

---

#### 6. Implement Explain Agent

**What's needed:**
- Create `agents/explain.js`
- Code explanation in English/Russian
- UI integration

**Priority:** 🟡 Medium

---

#### 7. Improve Error Handling

**What's needed:**
- Add try-catch everywhere
- Improve error logging
- Show clear messages to user

**Priority:** 🟡 Medium

---

### 🟢 Desirable (can be done gradually)

#### 8. Add Monaco Editor

**What's needed:**
- Integrate Monaco Editor into UI
- Syntax highlighting support
- Code autocompletion

**Priority:** 🟢 Low

---

#### 9. Implement Autotesting

**What's needed:**
- Integration with Jest or other test framework
- Automatic test execution
- Display results in UI

**Priority:** 🟢 Low

---

#### 10. Implement PC-Control Agent (AutoIt)

**What's needed:**
- AutoIt integration
- PC control via AI
- Safe command execution

**Priority:** 🟢 Low

---

## 🔄 Development Process

### 1. Choose a Task

- Look at task list above
- Or choose from [docs/Roadmap.md](Roadmap.md)
- Or create Issue with problem description

### 2. Create Branch

Follow [branch rules](#branch-rules):

```bash
git checkout -b feature/feature-name
# or
git checkout -b fix/bug-description
```

### 3. Develop

- Write code
- Add comments in English
- Follow code standards (see below)

### 4. Test

```bash
npm start
# Check that everything works
```

### 5. Commit

```bash
git add .
git commit -m "feat: add feature X"
# or
git commit -m "fix: fix bug Y"
```

**Commit Format:**
- `feat:` - new feature
- `fix:` - bug fix
- `docs:` - documentation
- `refactor:` - refactoring
- `test:` - tests

### 6. Push

```bash
git push origin feature/feature-name
```

### 7. Create Pull Request

- Go to GitHub
- Click "New Pull Request"
- Describe changes
- Reference related Issues

---

## 📝 Code Standards

### Comments

```javascript
/**
 * Function description
 * 
 * @param {string} param1 - Parameter description
 * @returns {Promise<Object>} Return value description
 */
async function myFunction(param1) {
  // Comment in English for complex logic
  return result;
}
```

### Naming

- **Functions:** `camelCase` - `sendMessage()`
- **Classes:** `PascalCase` - `SelfDevAgent`
- **Constants:** `UPPER_SNAKE_CASE` - `MAX_RETRIES`
- **Files:** `kebab-case` - `self-dev-agent.js`

### Structure

```javascript
// 1. Imports
const fs = require('fs');
const path = require('path');

// 2. Constants
const DEFAULT_TIMEOUT = 30000;

// 3. Class/functions
class MyClass {
  constructor() {
    // ...
  }
}

// 4. Export
module.exports = MyClass;
```

---

## 🔍 Creating Pull Request

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation

## Related Issues
Closes #123

## Checklist
- [ ] Code tested
- [ ] Documentation updated
- [ ] Commits follow standards
```

### Review Process

1. **Automatic checks** - CI/CD (if configured)
2. **Code review** - review by other developers
3. **Testing** - functionality verification
4. **Merge** - after approval

---

## 📋 Issues Workflow

### Issue Types

#### 🐛 Bug Report

**Template:**
```markdown
**Description:**
Brief problem description

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. ...

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happened

**Environment:**
- OS: Windows 10
- Node.js: 18.0.0
- Version: 0.1.0

**Logs:**
```
Insert error logs
```
```

#### ✨ Feature Request

**Template:**
```markdown
**Description:**
What you want to add

**Problem:**
What problem this solves

**Solution:**
How it should work

**Alternatives:**
Other solution options
```

#### 📝 Documentation

**Template:**
```markdown
**What's needed:**
Description of needed documentation

**Where:**
Where documentation should be

**Why:**
Why it's needed
```

#### 🔧 Enhancement

**Template:**
```markdown
**What to improve:**
Current behavior description

**How to improve:**
Improvement proposal

**Benefits:**
What this will provide
```

### Issue Labels

- `bug` - Bug
- `enhancement` - Enhancement
- `feature` - New feature
- `documentation` - Documentation
- `help wanted` - Help needed
- `good first issue` - Good for beginners
- `priority: high` - High priority
- `priority: medium` - Medium priority
- `priority: low` - Low priority

### Issues Workflow

1. **Creating Issue**
   - Use templates above
   - Add appropriate labels
   - Specify priority

2. **Assignment**
   - Maintainers assign executor
   - Or you can take Issue yourself

3. **Working on Issue**
   - Create branch `fix/issue-123` or `feature/issue-123`
   - Work on solution
   - Create Pull Request with `Closes #123`

4. **Closing Issue**
   - Issue closes automatically on PR merge
   - Or manually if problem solved another way

### Rules

- ✅ **One Issue = one task**
- ✅ **Use clear names**
- ✅ **Add context and examples**
- ✅ **Link Issue with PR via `Closes #123`**
- ❌ **Don't create duplicates** - search existing Issues first

---

## 📚 Useful Resources

- [Vision.md](Vision.md) - Project vision
- [Roadmap.md](Roadmap.md) - Development plan
- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture
- [SETUP.md](SETUP.md) - Project setup
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Troubleshooting

---

## ❓ Questions?

- Create Issue on GitHub
- Write in Discussions
- Contact maintainers

---

**Thank you for contributing!** 🎉


