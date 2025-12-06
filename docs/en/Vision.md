# Vision — VibeCode

## 1. Project Goal

Create a local, maximally autonomous IDE that works like Cursor, which:

- Uses local models from LM Studio (DeepSeek-R1 Qwen-3 8B, GPT4All Falcon)
- Can connect external models (OpenRouter, ChatGPT)
- Has automatic mode that selects model itself
- Can control PC (like Copilot Computer Control)
- Autotests code (built-in test runner)
- Implements "agents" (like in Cursor)

---

## 2. Main Architecture

```
┌───────────────────────────────┐
│ User Interface                │
│ (Monaco Editor + Chat Panel)  │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ InterAgent Controller                 │
│ - routes tasks between AI            │
│ - auto mode for model selection       │
│ - orchestration (context → model)    │
└────────────────┬──────────────────────┘
                 │
┌────────────────┴─────────────────────────┐
│ AI Layer                                  │
│ LM Studio | OpenRouter | GPT              │
│ deepseek | mistral | o1                   │
└────────────────┬─────────────────────────┘
                 │
┌────────────────┴────────────┐
│ Execution Layer              │
│ Autotests                    │
│ Run Python/JS                 │
│ PC Control                   │
└────────────────┬─────────────┘
                 │
            File System
```

---

## 3. Main Components

### 3.1 Electron Application

**Main Files:**
- `main.js` — creates application window and loads preload.js
- `preload.js` — bridge between frontend and Node.js (secure IPC)
- `index.html` — interface structure
- `ui.js` — chat interface logic and textarea for tasks

**Purpose:** Provides desktop application with web interface and access to Node.js API.

### 3.2 AI Router (`ai/router.js`)

**Functionality:**
- Routes requests between LM Studio, Falcon and OpenRouter
- Minimal logic for model selection by task type
- Manages connections to various AI providers

**Purpose:** Single entry point for all AI requests with automatic selection of optimal model.

### 3.3 SelfDev Agent (`agents/selfdev.js`)

**Functionality:**
- Reads `vision.md` and `roadmap.md` to understand project goals
- Generates tasks for system based on vision
- Creates code files from tasks
- Writes action logs to track progress

**Purpose:** Autonomous agent for self-programming system based on vision and roadmap.

### 3.4 Execution Layer

**Components:**
- Minimal executor: file writing, script execution via Node.js
- Possibility of AutoIt integration for PC control
- Possibility of autotesting (Test Runner)

**Purpose:** Safe command execution and system management.

---

## 4. Multiple AI Models Support

### 4.1 LM Studio (Local Models)

**Used Models:**

- **deepseek/deepseek-r1-0528-qwen3-8b**
  - Best for reasoning
  - Understands Russian
  - Cheap, fast
  - Local reasoning agent

- **nomic-ai-gpt4all-falcon**
  - Understands only English
  - Best for code generation
  - Needs auto-translation RU → EN → RU

**API:** `POST http://localhost:1234/v1/chat/completions`

### 4.2 OpenRouter

Connected via: `POST https://openrouter.ai/api/v1/chat/completions` with API key

Provides access to:
- OpenAI o3
- Claude 3.7
- Mistral Large
- Qwen 3 72B

### 4.3 ChatGPT

Support for GPT-4.1 and GPT-O1 via official API.

### 4.4 Auto Mode for Model Selection ("Smart Auto Mode")

**Algorithm:**
- If `task.type == "code"` and `model == falcon`: translate(RU→EN) → use falcon → translate(EN → RU)
- If `task.type == "explanation"` or `"refactoring"`: deepseek
- If `task.type == "complex analysis"`: GPT-4.1 or Claude 3.7 via OpenRouter
- If `task.type == "quick answer"`: deepseek 8B
- If `task.type == "large file generation"`: mistral large
- If network unavailable: fallback = deepseek

---

## 5. InterAgent Controller

Main "brain" of the system.

**Functions:**
- Determines task type
- Selects AI model
- Forms prompts
- Routes code / context
- Runs tests
- Creates patches (like Cursor diffs)
- Controls PC (on request)

---

## 6. Agent Modes (Cursor-like Agents)

### 6.1 RefactorAgent
- **Input:** code + instructions
- **Output:** improved code

### 6.2 FixAgent
Tries to fix errors, then runs autotests.

### 6.3 ExplainAgent
Explains code (DeepSeek).

### 6.4 PatchAgent (like Cursor)
Creates diff patches:
```diff
@@ -12,7 +12,7 @@
- let a = 10
+ const count = 10
```

### 6.5 AutocompleteAgent (Copilot copy)
Requests based on last 200 characters.

### 6.6 PC-Control Agent
PC control via AutoIt (planned).

---

## 7. Code Autotesting

System creates and runs tests itself.

**Supported Languages:**
- JavaScript (Jest)
- Python (pytest lite built-in)
- PHP (pest)

**Architecture:**
```
user → agent → generate tests → run executor → report → apply fix
```

---

## 8. PC Control (Automation Agent)

**Functions:**
- Type on keyboard
- Move mouse
- Open programs
- Switch windows
- Run processes

**Via:** AutoIt (native Windows automation language)

**Example:**
```javascript
await pc.moveMouse(100, 200)
await pc.type("npm install")
await pc.key("enter")
```

Model responds "what to do", agent executes.

---

## 9. Falcon <-> Russian Translation System

Since Falcon understands only English:

1. DeepSeek translates RU → EN
2. Falcon generates code
3. DeepSeek translates EN → RU (if explanation needed)

AI Controller automatically creates such pipeline.

---

## 10. Project Structure

```
/src
  /main
    main.js
    preload.js
  /agents
    auto.js
    refactor.js
    fix.js
    explain.js
    patch.js
    autocomplete.js
    pc-control.js
  /ui
    index.html
    editor.js
    chat.js
  /core
    ai-controller.js
    translators.js
    router.js
    executor.js
  /test runner/
/ai
  router.js (AI Router)
  profiles.js
  /providers
    lmstudio.js
    openrouter.js
    openai.js
    ollama.js
    custom.js
```

---

## 11. Minimum Startup Requirements

### 11.1 Technology Stack

1. **Node.js + npm** — runtime environment
2. **Electron** — framework for desktop application
3. **LM Studio** — locally installed with models:
   - DeepSeek-R1
   - Falcon
4. **Ability to make POST requests** to LM Studio API

### 11.2 Project Structure

```
/src
  main.js          # Electron entry point
  preload.js       # IPC bridge
  index.html       # UI structure
  ui.js            # UI logic
/ai
  router.js        # AI router
/agents
  selfdev.js       # SelfDev agent
/docs
  vision.md        # Project vision
  roadmap.md       # Development plan
```

---

## 12. Near-term Startup Goals

### 12.1 Minimal Working Project

- Create basic Electron application structure
- Implement simple chat interface
- Setup connection to LM Studio
- Implement basic AI Router

### 12.2 Self-Build Functionality

- "Self-Build" button for generating first files
- AI should be able to read `vision.md` and `roadmap.md`
- Code generation based on project vision
- Logging all actions

### 12.3 Preparation for Self-Programming

- Architecture for autonomous development
- Task system and execution
- Feedback mechanism and improvement

### 12.4 Planned Agents (future development)

- **Refactor Agent** — code refactoring
- **Fix Agent** — error fixing
- **Explain Agent** — code explanation
- **Patch Agent** — applying patches
- **Autocomplete Agent** — autocompletion
- **PC-Control Agent** — PC control via AutoIt

---

## 13. Development Principles

### 13.1 Modularity

All components should be independent modules with clear interfaces.

### 13.2 Extensibility

Architecture should allow easy addition of new agents, models and features.

### 13.3 Security

Code execution should be isolated and controlled.

### 13.4 Logging

All system actions should be logged for tracking and debugging.

---

## 14. Long-term Vision

VibeCode should become an autonomous development system that:

1. **Self-develops** based on vision and roadmap
2. **Selects optimal models** for various task types
3. **Controls computer** to perform complex tasks
4. **Tests its code** before applying changes
5. **Learns** based on results of its work

---

## 15. Key Success Metrics

- ✅ System starts and connects to LM Studio
- ✅ Chat interface accepts commands and receives responses
- ✅ Self-Build generates working files
- ✅ AI Router correctly selects models
- ✅ SelfDev Agent reads vision and roadmap
- ✅ System can create and save files
- ✅ Provider switching works
- ✅ Automatic translation for Falcon works

---

*Document created to describe VibeCode project vision*


