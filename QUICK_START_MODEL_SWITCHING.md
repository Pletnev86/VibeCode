# ⚡ Быстрый старт: Переключение моделей OpenRouter

## 🎯 Приоритет по умолчанию

1. **Бесплатная:** `deepseek/deepseek-r1:free`
2. **Платная #1:** `deepseek/deepseek-r1`
3. **Платная #2:** `anthropic/claude-3.5-sonnet`
4. **Платная #3:** `openai/gpt-4o-mini`
5. **Fallback:** Локальная модель (LM Studio)

---

## 📝 Минимальный код для переноса

### 1. Константы (добавить в начало файла)

```javascript
const FREE_MODEL = 'deepseek/deepseek-r1:free';
const PAID_MODELS = [
  process.env.OPENROUTER_PAID_MODEL_1 || 'deepseek/deepseek-r1',
  process.env.OPENROUTER_PAID_MODEL_2 || 'anthropic/claude-3.5-sonnet',
  process.env.OPENROUTER_PAID_MODEL_3 || 'openai/gpt-4o-mini',
];
const OPENROUTE_KEY = process.env.OPENROUTE_KEY || '';
```

### 2. Управление состоянием

```javascript
const botModes = new Map();

function getBotMode(botId) {
    if (!botModes.has(botId)) {
        botModes.set(botId, { 
            currentModel: FREE_MODEL,
            paidModelIndex: 0
        });
    }
    return botModes.get(botId);
}

function setBotMode(botId, modeObj) {
    botModes.set(botId, { ...getBotMode(botId), ...modeObj });
}
```

### 3. Функция запроса (ключевая часть)

```javascript
async function queryLlm(messages, botId = 'default', recursionLevel = 0) {
  const botState = getBotMode(botId);
  const modelToUse = botState.currentModel || FREE_MODEL;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
        max_tokens: 512
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const isQuotaError = response.status === 429 || response.status === 402;
      
      // Переключение на платную модель при ошибке квоты
      if (isQuotaError && botState.currentModel === FREE_MODEL && PAID_MODELS.length > 0) {
        const nextPaidModel = PAID_MODELS[botState.paidModelIndex || 0];
        setBotMode(botId, { 
          currentModel: nextPaidModel,
          paidModelIndex: botState.paidModelIndex || 0
        });
        if (recursionLevel < 1) {
          return await queryLlm(messages, botId, recursionLevel + 1);
        }
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || '';
    
    // Сохраняем успешную модель
    if (modelToUse !== FREE_MODEL) {
      setBotMode(botId, { currentModel: modelToUse });
    }
    
    return reply;
    
  } catch (err) {
    // Переключение на следующую платную модель
    if (botState.paidModelIndex < PAID_MODELS.length - 1 && recursionLevel < PAID_MODELS.length) {
      const nextIndex = (botState.paidModelIndex || 0) + 1;
      setBotMode(botId, { 
        currentModel: PAID_MODELS[nextIndex],
        paidModelIndex: nextIndex
      });
      return await queryLlm(messages, botId, recursionLevel + 1);
    }
    
    throw err;
  }
}
```

---

## 🔧 Настройка через .env

```env
OPENROUTE_KEY=sk-or-v1-ваш-ключ
OPENROUTER_PAID_MODEL_1=deepseek/deepseek-r1
OPENROUTER_PAID_MODEL_2=anthropic/claude-3.5-sonnet
OPENROUTER_PAID_MODEL_3=openai/gpt-4o-mini
```

---

## ✅ Использование

```javascript
const response = await queryLlm('Привет!', 'user123');
```

---

**Полная инструкция:** см. `INSTRUKCIYA_PERENOS_MODEL_SWITCHING.md`

