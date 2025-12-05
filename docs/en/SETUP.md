# 🔧 VibeCode Setup Guide

## 📋 Contents

1. [Quick Setup](#quick-setup)
2. [LM Studio Setup](#lm-studio-setup)
3. [OpenRouter Setup](#openrouter-setup)
4. [Configuration](#configuration)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Setup

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/Pletnev86/VibeCode.git
cd VibeCode

# Install dependencies
npm install
```

### Step 2: Create Configuration

```bash
# Copy example configuration
cp config.json.example config.json
```

### Step 3: Configure API Keys

Open `config.json` and add your API keys (see sections below).

---

## 🤖 LM Studio Setup

### What is LM Studio?

**LM Studio** is an application for running local language models on your computer. This allows you to use AI without internet and without paying for API.

### Installing LM Studio

1. Download LM Studio from the official website: https://lmstudio.ai/
2. Install the application
3. Launch LM Studio

### Loading Models

1. In LM Studio, go to the **"Search"** tab
2. Find and download the following models:
   - **`deepseek/deepseek-r1-0528-qwen3-8b`** - for reasoning, explanations, translations
   - **`nomic-ai-gpt4all-falcon`** - for code generation (English only)

### Starting the Server

1. In LM Studio, go to the **"Local Server"** tab
2. Select one of the loaded models
3. Click **"Start Server"**
4. Make sure the server is running on port **1234**
5. Status should be **"Server is running"**

### Configuration in config.json

LM Studio settings are already configured in `config.json`:

```json
"lmStudio": {
  "enabled": true,
  "baseUrl": "http://localhost:1234/v1",
  "models": {
    "deepseek": "deepseek/deepseek-r1-0528-qwen3-8b",
    "falcon": "nomic-ai-gpt4all-falcon"
  },
  "timeout": 120000
}
```

**Important:** Make sure:
- ✅ LM Studio is running
- ✅ Server is running on port 1234
- ✅ Model is loaded and active

---

## 🌐 OpenRouter Setup

### What is OpenRouter?

**OpenRouter** is a service that provides access to various AI models (GPT-4, Claude, DeepSeek, etc.) through a single API.

### Getting API Key

1. Go to: https://openrouter.ai/
2. Register or log in to your account
3. Go to **"Keys"** section (https://openrouter.ai/keys)
4. Click **"Create Key"**
5. Copy the created key (starts with `sk-or-v1-...`)

### Configuration in config.json

Open `config.json` and find the `openRouter` section:

```json
"openRouter": {
  "enabled": true,
  "apiKey": "YOUR_OPENROUTER_API_KEY_HERE",  // ← Insert your key here
  "baseUrl": "https://openrouter.ai/api/v1",
  "timeout": 60000,
  "defaultModel": "openai/gpt-4o-mini",
  "selectedModel": "gpt4",
  "models": {
    "gpt4": "openai/gpt-4o-mini",
    "claude": "anthropic/claude-3.5-sonnet",
    "deepseek": "deepseek/deepseek-chat"
  },
  "autoFallback": true,
  "checkTokens": true
}
```

**Replace** `"YOUR_OPENROUTER_API_KEY_HERE"` with your actual key.

### Available Models

You can choose any of the available models:

- **`openai/gpt-4o-mini`** - fast and cheap model from OpenAI
- **`anthropic/claude-3.5-sonnet`** - powerful model from Anthropic
- **`deepseek/deepseek-chat`** - affordable alternative

Change `"selectedModel"` to the desired model.

### Checking Token Balance

OpenRouter shows token balance on the account page. If tokens run out, the system will automatically switch to LM Studio (if `autoFallback: true`).

---

## ⚙️ Configuration

### config.json Structure

```json
{
  "ai": {
    "providers": {
      "lmStudio": { ... },      // Local models
      "openRouter": { ... },    // External models via API
      "gpt": { ... }            // Direct OpenAI access (optional)
    },
    "smartAutoMode": { ... }    // Automatic model selection
  },
  "agents": {
    "selfdev": { ... }          // SelfDev Agent settings
  },
  "execution": { ... }          // Execution settings
}
```

### Enabling/Disabling Providers

To use only LM Studio:
```json
"lmStudio": {
  "enabled": true
},
"openRouter": {
  "enabled": false
}
```

To use only OpenRouter:
```json
"lmStudio": {
  "enabled": false
},
"openRouter": {
  "enabled": true,
  "apiKey": "your_key"
}
```

### Smart Auto Mode

Automatically selects model by task type:

```json
"smartAutoMode": {
  "enabled": true,
  "defaultModel": "falcon",           // Default model
  "fallbackModel": "deepseek",        // Fallback model
  "openRouterFallback": true,         // Use OpenRouter as fallback
  "checkTokens": true                 // Check token balance
}
```

---

## ✅ Verification

### Running the Application

```bash
npm start
```

### Testing LM Studio

1. Make sure LM Studio is running
2. In the application, select **"LM Studio"** provider
3. Send a test message
4. You should receive a response from the local model

### Testing OpenRouter

1. Make sure API key is added to `config.json`
2. In the application, select **"OpenRouter"** provider
3. Send a test message
4. You should receive a response from the selected model

### Testing Self-Build

1. Click **"Self-Build"** button in the interface
2. System should read Vision.md and Roadmap.md
3. Project files should be generated

---

## 🔧 Troubleshooting

### Problem: LM Studio Not Responding

**Solution:**
1. Check that LM Studio is running
2. Check that server is running on port 1234
3. Check that model is loaded and active
4. Check settings in `config.json`: `baseUrl: "http://localhost:1234/v1"`

### Problem: OpenRouter Returns Error

**Solution:**
1. Check that API key is correctly copied to `config.json`
2. Check token balance at https://openrouter.ai/
3. Check internet connection
4. Try a different model

### Problem: Knowledge Base Not Working

**Solution:**
1. Make sure `better-sqlite3` is installed:
   ```bash
   npm install better-sqlite3
   ```
2. If compilation error, try:
   ```bash
   npm run rebuild
   ```
3. System will continue working without knowledge base, but without saving history

### Problem: Files Created in Wrong Directory

**Solution:**
1. Check that `src/main.js` uses correct paths
2. Make sure files are saved to `src/`, not `src/src/`

---

## 📚 Additional Documentation

- [README.md](../../README.md) - Project overview
- [QUICK_START.md](QUICK_START.md) - Quick start
- [USAGE.md](USAGE.md) - Usage guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Troubleshooting
- [PROVIDER_SWITCH.md](PROVIDER_SWITCH.md) - Provider switching

---

## 🆘 Need Help?

If you encounter problems:

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Create an Issue on GitHub: https://github.com/Pletnev86/VibeCode/issues
3. Check logs in application console (DevTools: F12)

---

**Done!** Now you can use VibeCode. 🎉

