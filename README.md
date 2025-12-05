# VibeCode

<div align="center">

![VibeCode Logo](https://img.shields.io/badge/VibeCode-AI%20IDE-blue?style=for-the-badge)

**🚀 Autonomous development system with support for local and external AI models**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](https://github.com/Pletnev86/VibeCode/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Pletnev86/VibeCode/ci.yml?label=build)](https://github.com/Pletnev86/VibeCode/actions)
[![Downloads](https://img.shields.io/github/downloads/Pletnev86/VibeCode/total?color=green&label=downloads)](https://github.com/Pletnev86/VibeCode/releases)
[![Contributors](https://img.shields.io/github/contributors/Pletnev86/VibeCode?color=blue)](https://github.com/Pletnev86/VibeCode/graphs/contributors)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)](https://github.com/Pletnev86/VibeCode)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-39.2.4-blue.svg)](https://www.electronjs.org/)

[English](README.md) | [Русский](README.ru.md)

</div>

---

## 📖 What is VibeCode?

**VibeCode** is an autonomous AI development system that allows you to create and develop software using local and cloud AI models. The system can **self-develop** based on Vision and Roadmap documents, using AI for code generation, refactoring, and bug fixes.

### 🎯 Key Features

- 🤖 **Local AI Models** — work offline via LM Studio
- 🌐 **Cloud Models** — support for OpenRouter, GPT API
- 🔄 **Automatic Switching** — smart model selection by task
- 🚀 **Self-Build** — automatic project generation from Vision/Roadmap
- 📚 **Knowledge Base** — save and search solutions
- 🔧 **Self-Programming** — system improves itself
- 💬 **Intuitive Interface** — simple chat with AI
- ⭐ **Rating System** — improve responses based on feedback

### 🆚 Differences from Other Solutions

| Feature | VibeCode | Cursor | GitHub Copilot |
|---------|----------|--------|----------------|
| Local Models | ✅ | ❌ | ❌ |
| Self-Programming | ✅ | ❌ | ❌ |
| Knowledge Base | ✅ | ❌ | ❌ |
| Free | ✅ | 💰 | 💰 |
| Offline Work | ✅ | ❌ | ❌ |
| Open Source | ✅ | ❌ | ❌ |

---

## 📸 Screenshots

> **Note:** Add interface screenshots after creation

<!-- 
![Main Interface](screenshots/main.png)
![Self-Build in Action](screenshots/selfbuild.png)
![AI Chat](screenshots/chat.png)
![Knowledge Base](screenshots/knowledge-base.png)
-->

---

## 🚀 Quick Installation

### Requirements

- **Node.js** 16+ and **npm** 8+
- **LM Studio** (optional, for local models)
- **OpenRouter API Key** (optional, for cloud models)

### Step 1: Clone

```bash
git clone https://github.com/Pletnev86/VibeCode.git
cd VibeCode
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure

```bash
# Copy example configuration
cp config.json.example config.json

# Open config.json and add your OpenRouter API key (optional)
```

### Step 4: Run

```bash
npm start
```

### LM Studio Setup (for local models)

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Load models:
   - `deepseek/deepseek-r1-0528-qwen3-8b` (for reasoning)
   - `nomic-ai-gpt4all-falcon` (for code generation)
3. Start server on port **1234**

📖 **Detailed Guide:** [docs/en/SETUP.md](docs/en/SETUP.md)

---

## 💻 How to Use

### Self-Build (Project Generation)

1. Click **"Self-Build"** button in the sidebar
2. System automatically:
   - Reads `docs/Vision.md` and `docs/Roadmap.md`
   - Forms prompt for AI
   - Generates project files
   - Saves them to `/src`

### AI Chat

1. Select AI provider:
   - **LM Studio** — for local models (free, offline)
   - **OpenRouter** — for cloud models (requires API key)
2. Select model from list
3. Enter query in input field
4. Click "Send"

### Module Enhancement

1. Click **"Enhance Modules"** button
2. Describe task (e.g., "Add error handling to router.js")
3. System analyzes modules and makes changes

### Project Analysis

1. Click **"Analyze Project"** button
2. Specify project path
3. System analyzes structure and creates description

📖 **Detailed Guide:** [docs/en/USAGE.md](docs/en/USAGE.md)

---

## 🏛️ Architecture

VibeCode is built on modular architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Electron App                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   main.js    │  │  preload.js  │  │  index.html  │  │
│  │  (IPC)       │  │  (Bridge)    │  │  (UI)        │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│ AI Router    │ │  Agents     │ │   Libs      │
│              │ │             │ │             │
│ • LM Studio  │ │ • SelfDev   │ │ • Knowledge │
│ • OpenRouter │ │ • Enhancer  │ │ • Watcher   │
│ • Smart Mode │ │ • Controller│ │ • Executor  │
└──────────────┘ └─────────────┘ └─────────────┘
```

### Main Components

- **Electron App** (`src/`) — desktop application with UI
- **AI Router** (`ai/router.js`) — routes requests to AI models
- **Agents** (`agents/`) — autonomous agents for various tasks
- **Libraries** (`lib/`) — helper libraries

### Data Flow

```
User (UI)
    ↓
Electron Main Process (main.js)
    ↓
IPC (preload.js)
    ↓
SelfDev Agent / Module Enhancer
    ↓
AI Router → LM Studio / OpenRouter
    ↓
Code Generation
    ↓
File Parsing
    ↓
Execution Layer (safe saving)
    ↓
Knowledge Base (save result)
```

📖 **Detailed Architecture:** [docs/en/ARCHITECTURE.md](docs/en/ARCHITECTURE.md)

---

## 🗺️ Roadmap

### ✅ Current Version: 0.1.0 (MVP)

- [x] Electron application
- [x] AI Router (LM Studio + OpenRouter)
- [x] SelfDev Agent
- [x] Knowledge Base (SQLite)
- [x] Chat interface
- [x] Self-Build functionality
- [x] Module Enhancer
- [x] Provider switching

### 🚧 In Development: v0.2

- [ ] Refactor Agent
- [ ] Fix Agent
- [ ] Explain Agent
- [ ] Improve file parsing in Self-Build
- [ ] Fix knowledge base (better-sqlite3)
- [ ] Full UI functionality restoration

### 📅 Planned: v0.5

- [ ] Monaco Editor integration
- [ ] Code autotesting
- [ ] PC-Control Agent (AutoIt)
- [ ] Multi-tab editor
- [ ] Vision system for screenshot reading

### 🔮 Future: v1.0+

- [ ] Full Cursor Clone functionality
- [ ] Whisper for voice input
- [ ] Background agent work
- [ ] Local Vision+Code models

📖 **Full Roadmap:** [docs/en/Roadmap.md](docs/en/Roadmap.md)

---

## 📚 Documentation

### For Users
- [🔧 SETUP.md](docs/en/SETUP.md) - **Setup Guide (OpenRouter, LM Studio)**
- [🚀 QUICK_START.md](docs/en/QUICK_START.md) - Quick Start
- [📘 USAGE.md](docs/en/USAGE.md) - User Guide
- [🔄 PROVIDER_SWITCH.md](docs/en/PROVIDER_SWITCH.md) - Provider Switching
- [🔧 TROUBLESHOOTING.md](docs/en/TROUBLESHOOTING.md) - Troubleshooting

### For Developers
- [🎯 CURSOR_SETUP.md](docs/en/CURSOR_SETUP.md) - **Setup for Cursor IDE**
- [🤝 CONTRIBUTING.md](docs/en/CONTRIBUTING.md) - **Contributor Guide**
- [📖 Vision.md](docs/en/Vision.md) - Project Vision
- [🗺️ Roadmap.md](docs/en/Roadmap.md) - Development Plan
- [🏛️ ARCHITECTURE.md](docs/en/ARCHITECTURE.md) - System Architecture
- [💡 EXAMPLES.md](docs/en/EXAMPLES.md) - Usage Examples

---

## 🔧 Development

### Development Setup

```bash
git clone https://github.com/Pletnev86/VibeCode.git
cd VibeCode
npm install
```

### Scripts

```bash
npm start          # Run application
npm run dev        # Development mode (with DevTools)
npm run rebuild    # Rebuild native modules
npm test           # Run tests
```

### Project Structure

```
VibeCode/
├── src/              # Electron application
│   ├── main.js       # Main process (IPC handlers)
│   ├── preload.js    # IPC bridge
│   ├── index.html    # UI structure
│   └── ui.js         # UI logic
├── ai/               # AI Router and providers
│   └── router.js     # Request router to AI
├── agents/           # System agents
│   ├── selfdev.js    # SelfDev Agent (self-development)
│   ├── module-enhancer.js  # Module enhancement
│   └── inter-agent-controller.js  # Agent controller
├── lib/              # Libraries
│   ├── knowledge-base.js      # Knowledge Base (SQLite)
│   ├── document-watcher.js   # Change tracking
│   ├── execution-layer.js    # Safe execution
│   └── project-analyzer.js   # Project analysis
├── docs/             # Documentation
│   ├── en/           # English documentation
│   └── ru/           # Russian documentation
└── config.json       # Configuration
```

---

## 🤝 Contributing

We welcome contributions to the project! 

1. Fork the repository
2. Create a branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

📖 **More Info:** [docs/en/CONTRIBUTING.md](docs/en/CONTRIBUTING.md)

---

## 📊 Project Status

🚧 **In Active Development**

- **Current Version:** 0.1.0
- **Status:** MVP ready, working on v0.2
- **License:** Apache License 2.0

---

## 👥 Authors

- **Pletnev86** - [GitHub](https://github.com/Pletnev86)

---

## 🙏 Acknowledgments

- [LM Studio](https://lmstudio.ai/) - for local model support
- [OpenRouter](https://openrouter.ai/) - for API access to various models
- [Electron](https://www.electronjs.org/) - for desktop application framework

---

## 📝 License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

⭐ **If you liked the project, give it a star!**

[⬆ Back to Top](#vibecode)

</div>
