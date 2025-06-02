const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { setupKeepAlive } = require('./utils/keepAlive');

// Discord bot - cache yapılandırmaları kaldırıldı, varsayılan ayarlar kullanılıyor
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ]
});

// Bot başlangıç banner'ını göster
function displayStartupBanner() {
  console.clear(); // Terminal ekranını temizle
  console.log('\n');
  console.log('\x1b[35m%s\x1b[0m', '╔══════════════════════════════════════════════════════════════╗');
  console.log('\x1b[35m%s\x1b[0m', '║                                                              ║');
  console.log('\x1b[35m%s\x1b[0m', '║                     KAISER BOT BAŞLATILIYOR                  ║');
  console.log('\x1b[35m%s\x1b[0m', '║                                                              ║');
  console.log('\x1b[35m%s\x1b[0m', '╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');
  console.log('\x1b[36m%s\x1b[0m', '                    Bot Başlatma Süreci                       ');
  console.log('\x1b[36m%s\x1b[0m', '           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             ');
  console.log('\n');
}

// Başlangıç banner'ını göster
displayStartupBanner();

// Collections
client.commands = new Collection();
client.slashCommands = new Collection();
client.buttons = new Collection();
client.modLogs = new Collection();

// Config
const config = require('./config');
client.config = config;

// Owner Utils
const { isOwner } = require('./utils/ownerCommands');
client.isOwner = isOwner;

// Keep-Alive sistemini başlat (client hazır olduğunda tam olarak başlatılacak)
let keepAliveSystem = null;

// Komutları ve eventleri tek bir yükleme çubuğuyla yükle
async function loadAll() {
  console.log('\n');
  console.log('\x1b[36m%s\x1b[0m', '╔════════════════════════════════════════════════════════════╗');
  console.log('\x1b[36m%s\x1b[0m', '║               KAISER BOT YÜKLENİYOR                        ║');
  console.log('\x1b[36m%s\x1b[0m', '╚════════════════════════════════════════════════════════════╝');
  
  // Tüm komut dosyalarını topla
  const commandFolders = fs.readdirSync('./commands');
  let commandFiles = [];
  for (const folder of commandFolders) {
    const folderFiles = fs.readdirSync(`./commands/${folder}`)
      .filter(file => file.endsWith('.js'))
      .map(file => ({ type: 'command', folder, file }));
    commandFiles = [...commandFiles, ...folderFiles];
  }
  
  // Tüm event dosyalarını topla
  const eventFiles = fs.readdirSync(path.join(__dirname, 'events'))
    .filter(file => file.endsWith('.js'))
    .map(file => ({ type: 'event', file }));
  
  // Tüm dosyaları birleştir
  const allFiles = [...commandFiles, ...eventFiles];
  const totalFiles = allFiles.length;
  
  console.log(`\x1b[33m[BİLGİ]\x1b[0m Toplam ${commandFiles.length} komut ve ${eventFiles.length} event dosyası bulundu.`);
  console.log(`\x1b[36m[BAŞLANIYOR]\x1b[0m Yükleme işlemi başlatılıyor...`);
  console.log('\n');
  
  let loadedFiles = 0;
  let loadedCommands = 0;
  let loadedEvents = 0;
  let errorCount = 0;
  const errorsList = [];
  
  // Yükleme çubuğu uzunluğu
  const barLength = 50;
  
  // Daha verimli bir bekleme fonksiyonu
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // İlerleme çubuğu başlığı
  console.log('\x1b[36m%s\x1b[0m', '╭────────────────── YÜKLEME DURUMU ───────────────────╮');
  
  // Tüm dosyaları yükle
  for (const item of allFiles) {
    try {
      if (item.type === 'command') {
        // Komut yükleme
        const command = require(`./commands/${item.folder}/${item.file}`);
        
        if (command.name) {
          client.commands.set(command.name, command);
          loadedCommands++;
        } else {
          errorCount++;
          errorsList.push(`${item.folder}/${item.file} - İsim özelliği eksik`);
        }
      } else {
        // Event yükleme
        const event = require(`./events/${item.file}`);
        const eventName = item.file.split('.')[0];
        
        if (event.once) {
          client.once(eventName, (...args) => event.execute(...args, client));
        } else {
          client.on(eventName, (...args) => event.execute(...args, client));
        }
        
        loadedEvents++;
      }
      
      loadedFiles++;
      
      // Yükleme çubuğunu güncelle
      const progress = Math.floor((loadedFiles / totalFiles) * barLength);
      const progressBar = '█'.repeat(progress) + '░'.repeat(barLength - progress);
      const percentage = Math.floor((loadedFiles / totalFiles) * 100);
      
      // Dosya tipine göre renk belirle
      const fileTypeColor = item.type === 'command' ? '\x1b[33m' : '\x1b[32m';
      const fileTypeText = item.type === 'command' ? 'KOMUT' : 'EVENT';
      const fileName = item.type === 'command' ? `${item.folder}/${item.file}` : item.file;
      
      // Terminal ekranını temizle ve yükleme çubuğunu göster
      process.stdout.write(`\r│ \x1b[36m[${percentage}%]\x1b[0m [${progressBar}] ${loadedFiles}/${totalFiles} ${fileTypeColor}[${fileTypeText}]\x1b[0m ${fileName.padEnd(30, ' ')}`);
      
    } catch (error) {
      errorCount++;
      const fileName = item.type === 'command' ? `${item.folder}/${item.file}` : item.file;
      errorsList.push(`${fileName} - ${error.message}`);
      loadedFiles++;
      
      // Hata durumunda da yükleme çubuğunu güncelle
      const progress = Math.floor((loadedFiles / totalFiles) * barLength);
      const progressBar = '█'.repeat(progress) + '░'.repeat(barLength - progress);
      const percentage = Math.floor((loadedFiles / totalFiles) * 100);
      
      process.stdout.write(`\r│ \x1b[36m[${percentage}%]\x1b[0m [${progressBar}] ${loadedFiles}/${totalFiles} \x1b[31m[HATA]\x1b[0m ${fileName.padEnd(30, ' ')}`);
    }
    
    // Kısa bir gecikme ekle (yükleme animasyonu için)
    await wait(30);
  }
  
  // İlerleme çubuğu alt kısmı
  console.log('\n\x1b[36m%s\x1b[0m', '╰──────────────────────────────────────────────────────╯');
  
  console.log('\n');
  console.log('\x1b[32m%s\x1b[0m', '╔════════════════════════════════════════════════════════════╗');
  console.log('\x1b[32m%s\x1b[0m', '║                YÜKLEME TAMAMLANDI                         ║');
  console.log('\x1b[32m%s\x1b[0m', '╚════════════════════════════════════════════════════════════╝');
  
  // İstatistikleri göster
  console.log('\n\x1b[36m[ÖZET]\x1b[0m');
  console.log(`\x1b[32m✓\x1b[0m Komutlar: ${loadedCommands}/${commandFiles.length} başarıyla yüklendi`);
  console.log(`\x1b[32m✓\x1b[0m Eventler: ${loadedEvents}/${eventFiles.length} başarıyla yüklendi`);
  console.log(`\x1b[32m✓\x1b[0m Toplam: ${loadedFiles - errorCount}/${totalFiles} dosya başarıyla yüklendi`);
  
  if (errorCount > 0) {
    console.log(`\x1b[31m✗\x1b[0m Hatalar: ${errorCount} dosya yüklenemedi`);
    console.log('\n\x1b[31m[HATA DETAYLARI]\x1b[0m');
    errorsList.forEach((error, index) => {
      console.log(`\x1b[31m${index + 1}.\x1b[0m ${error}`);
    });
  }
  
  console.log('\n');
}

// Prefix kontrolü helper fonksiyon - performans iyileştirmesi
function startsWithPrefix(content, prefixList) {
  content = content.toLowerCase();
  
  if (!Array.isArray(prefixList)) {
    prefixList = [prefixList];
  }
  
  for (const prefix of prefixList) {
    const lowerPrefix = prefix.toLowerCase();
    if (content.startsWith(lowerPrefix)) {
      return {
        matches: true,
        usedPrefix: prefix
      };
    }
  }
  
  return {
    matches: false,
    usedPrefix: null
  };
}

// Bot hazır olduğunda
client.once('ready', () => {
  console.log('\n');
  console.log('\x1b[32m%s\x1b[0m', '╔══════════════════════════════════════════════════════════════╗');
  console.log('\x1b[32m%s\x1b[0m', '║                                                              ║');
  console.log('\x1b[32m%s\x1b[0m', '║                     KAISER BOT HAZIR!                        ║');
  console.log('\x1b[32m%s\x1b[0m', '║                                                              ║');
  console.log('\x1b[32m%s\x1b[0m', '╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  // Bot istatistiklerini göster
  console.log('\x1b[33m%s\x1b[0m', '                     BOT İSTATİSTİKLERİ                       ');
  console.log('\x1b[33m%s\x1b[0m', '           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             ');
  console.log('\n');
  console.log(`\x1b[36m➤\x1b[0m Bot Adı: \x1b[33m${client.user.tag}\x1b[0m`);
  console.log(`\x1b[36m➤\x1b[0m Bot ID: \x1b[33m${client.user.id}\x1b[0m`);
  console.log(`\x1b[36m➤\x1b[0m Sunucu Sayısı: \x1b[33m${client.guilds.cache.size}\x1b[0m`);
  console.log(`\x1b[36m➤\x1b[0m Kullanıcı Sayısı: \x1b[33m${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}\x1b[0m`);
  console.log(`\x1b[36m➤\x1b[0m Kanal Sayısı: \x1b[33m${client.channels.cache.size}\x1b[0m`);
  console.log(`\x1b[36m➤\x1b[0m Komut Sayısı: \x1b[33m${client.commands.size}\x1b[0m`);
  console.log(`\x1b[36m➤\x1b[0m Bot Sahibi ID: \x1b[33m${config.ownerId}\x1b[0m`);
  console.log(`\x1b[36m➤\x1b[0m Komut Prefixleri: \x1b[33m${Array.isArray(config.prefix) ? config.prefix.join(', ') : config.prefix}\x1b[0m`);
  console.log('\n');
  
  // Başlatma zamanını göster
  const startTime = new Date();
  console.log(`\x1b[32m[HAZIR]\x1b[0m Bot başarıyla başlatıldı! \x1b[33m${startTime.toLocaleString()}\x1b[0m`);
  console.log('\x1b[36m%s\x1b[0m', '━'.repeat(70));
  
  // Keep-alive sistemini başlat
  keepAliveSystem = setupKeepAlive(client, {
    port: process.env.PORT || 3000,
    pingInterval: 5 * 60 * 1000, // 5 dakika
    statusInterval: 15 * 60 * 1000 // 15 dakika
  });
});

// Error handling - hata mesajlarını daha ayrıntılı göster
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

// Komutları ve eventleri yükle - async olarak çalıştır
(async () => {
  await loadAll();
  
  // Bot giriş
  client.login(config.token);
})();

// Uygulama kapatıldığında temizlik işlemleri
process.on('SIGINT', () => {
  console.log('\n\x1b[33m[KAPATILIYOR]\x1b[0m Bot güvenli bir şekilde kapatılıyor...');
  
  // Keep-alive sistemini kapat
  if (keepAliveSystem) {
    keepAliveSystem.shutdown();
  }
  
  // Botu kapat
  client.destroy();
  console.log('\x1b[32m[BOT]\x1b[0m Discord bağlantısı kapatıldı');
  
  // Çıkış yap
  setTimeout(() => {
    console.log('\x1b[32m[TAMAMLANDI]\x1b[0m Bot başarıyla kapatıldı');
    process.exit(0);
  }, 1000);
}); 
