/**
 * Скрипт для проверки логов и определения, какая модель OpenRouter использовалась
 */

const fs = require('fs');
const path = require('path');

// Находим последний лог-файл
const logsDir = path.join(__dirname, 'logs');
const logFiles = fs.readdirSync(logsDir)
  .filter(file => file.startsWith('vibecode-') && file.endsWith('.log'))
  .sort()
  .reverse();

if (logFiles.length === 0) {
  console.log('❌ Лог-файлы не найдены');
  process.exit(1);
}

const latestLog = path.join(logsDir, logFiles[0]);
console.log(`📄 Проверяю лог-файл: ${logFiles[0]}\n`);

// Читаем последние 200 строк
const content = fs.readFileSync(latestLog, 'utf8');
const lines = content.split('\n').filter(line => line.trim());

// Ищем записи о запросах к OpenRouter
const openRouterRequests = [];
const chatMessages = [];

lines.forEach((line, index) => {
  try {
    const log = JSON.parse(line);
    
    // Записи о сообщениях в чат
    if (log.message && log.message.includes('📤 Сообщение пользователя в чат')) {
      chatMessages.push({
        timestamp: log.timestamp,
        options: log.data?.options || {},
        message: log.data?.messagePreview || ''
      });
    }
    
    // Записи о запросах к OpenRouter
    if (log.message && log.message.includes('OpenRouter: отправка запроса к модели')) {
      const modelMatch = log.message.match(/модели (.+)$/);
      openRouterRequests.push({
        timestamp: log.timestamp,
        model: modelMatch ? modelMatch[1] : 'неизвестно',
        source: log.source || 'unknown'
      });
    }
    
    // Записи о выборе модели
    if (log.message && (log.message.includes('Выбранная модель') || log.message.includes('Используется модель'))) {
      const modelMatch = log.message.match(/модель[и:]\s*(.+)$/i);
      if (modelMatch) {
        openRouterRequests.push({
          timestamp: log.timestamp,
          model: modelMatch[1].trim(),
          source: 'model-selection',
          type: 'selected'
        });
      }
    }
  } catch (e) {
    // Пропускаем некорректные JSON строки
  }
});

console.log('🔍 Найдено запросов к OpenRouter:', openRouterRequests.length);
console.log('📨 Найдено сообщений в чат:', chatMessages.length);
console.log('\n');

if (openRouterRequests.length > 0) {
  console.log('📊 Последние запросы к OpenRouter:');
  console.log('─'.repeat(80));
  openRouterRequests.slice(-10).forEach((req, i) => {
    const time = new Date(req.timestamp).toLocaleTimeString();
    const type = req.type === 'selected' ? '🔹 Выбрана модель' : '🌐 Запрос к модели';
    console.log(`${i + 1}. [${time}] ${type}: ${req.model}`);
  });
  console.log('─'.repeat(80));
  console.log('\n');
  
  // Проверяем, использовалась ли deepseek-free
  const usedDeepseekFree = openRouterRequests.some(req => 
    req.model && req.model.includes('deepseek-r1:free')
  );
  
  if (usedDeepseekFree) {
    console.log('✅ Модель deepseek/deepseek-r1:free использовалась!');
  } else {
    console.log('❌ Модель deepseek/deepseek-r1:free НЕ использовалась');
    console.log('   Использовались модели:');
    const uniqueModels = [...new Set(openRouterRequests.map(r => r.model).filter(Boolean))];
    uniqueModels.forEach(model => {
      const count = openRouterRequests.filter(r => r.model === model).length;
      console.log(`   - ${model} (${count} раз)`);
    });
  }
} else {
  console.log('⚠️ Запросы к OpenRouter не найдены в логах');
}

if (chatMessages.length > 0) {
  console.log('\n📨 Последние сообщения в чат:');
  console.log('─'.repeat(80));
  chatMessages.slice(-5).forEach((msg, i) => {
    const time = new Date(msg.timestamp).toLocaleTimeString();
    const provider = msg.options.useOpenRouter ? 'OpenRouter' : 'LM Studio';
    const model = msg.options.openRouterModel || msg.options.model || 'не указана';
    console.log(`${i + 1}. [${time}] ${provider} | Модель: ${model}`);
    console.log(`   Сообщение: ${msg.message.substring(0, 50)}...`);
  });
  console.log('─'.repeat(80));
}

console.log('\n💡 Совет: Чтобы использовать deepseek-free, выберите в UI:');
console.log('   1. AI Провайдер → OpenRouter (API)');
console.log('   2. Модель OpenRouter → deepseek/deepseek-r1:free');


