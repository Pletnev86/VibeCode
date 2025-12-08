/**
 * Скрипт для восстановления из резервной копии
 * 
 * Использование:
 *   node restore-backup.js                    - восстановить из последней рабочей версии
 *   node restore-backup.js [backup-name]     - восстановить из конкретной копии
 */

const BackupManager = require('./lib/backup-manager');
const path = require('path');

async function restore() {
  const backupManager = new BackupManager();
  
  // Получаем имя бэкапа из аргументов или используем последнюю рабочую версию
  const backupName = process.argv[2];
  
  try {
    if (backupName) {
      // Восстанавливаем из указанной копии
      console.log(`🔄 Восстановление из резервной копии: ${backupName}`);
      await backupManager.restoreBackup(backupName);
      console.log('✅ Восстановление завершено успешно!');
    } else {
      // Ищем последнюю рабочую версию
      const backups = backupManager.listBackups();
      const workingBackups = backups.filter(b => b.name.startsWith('working-version-'));
      
      if (workingBackups.length === 0) {
        console.error('❌ Рабочие резервные копии не найдены');
        console.log('\nДоступные резервные копии:');
        backups.forEach(b => console.log(`  - ${b.name}`));
        process.exit(1);
      }
      
      // Берем самую новую рабочую версию
      const latestBackup = workingBackups[0]; // Уже отсортированы по дате
      console.log(`🔄 Восстановление из последней рабочей версии: ${latestBackup.name}`);
      await backupManager.restoreBackup(latestBackup.name);
      console.log('✅ Восстановление завершено успешно!');
    }
  } catch (error) {
    console.error('❌ Ошибка восстановления:', error.message);
    process.exit(1);
  }
}

// Запуск
restore();




