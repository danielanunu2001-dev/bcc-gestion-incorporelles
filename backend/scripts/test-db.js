const { Client } = require('pg');

const configs = [
  { name: 'Sans mot de passe', password: '' },
  { name: 'Mot de passe string', password: 'Anunudaniel2001' },
  { name: 'Mot de passe number', password: 12345 },
];

async function testConnection() {
  console.log('🔍 Test des connexions PostgreSQL\n');
  
  for (const config of configs) {
    console.log(`Test ${config.name}...`);
    
    const client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'postgres',  // se connecter d'abord à postgres
      user: 'postgres',
      password: config.password
    });

    try {
      await client.connect();
      console.log(`   ✅ Succès avec:`, typeof config.password, config.password);
      
      // Vérifier si bcc_gestion existe
      const res = await client.query(
        "SELECT 1 FROM pg_database WHERE datname = 'bcc_gestion'"
      );
      
      if (res.rows.length === 0) {
        console.log('   ⚠️  La base bcc_gestion n\'existe pas');
        await client.query('CREATE DATABASE bcc_gestion');
        console.log('   ✅ Base bcc_gestion créée');
      } else {
        console.log('   ✅ Base bcc_gestion existe');
      }
      
      await client.end();
      break;  // Arrêter au premier succès
      
    } catch (err) {
      console.log(`   ❌ Échec:`, err.message);
      await client.end().catch(() => {});
    }
    console.log('');
  }
}

testConnection();