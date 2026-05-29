const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('bcc_gestion', 'postgres', 'Anunudaniel2001', {
  host: 'localhost',
  dialect: 'postgres',
  port: 5432,
  logging: console.log
});

async function test() {
  try {
    // Test direct SQL
    const [results] = await sequelize.query('SELECT * FROM users WHERE email = $1', {
      bind: ['admin@bcc.cd']
    });
    
    console.log('Résultat SQL direct:', results);
    console.log('Nombre de résultats:', results.length);
    
    if (results.length > 0) {
      console.log('Utilisateur trouvé:', results[0].email);
    } else {
      console.log('Aucun utilisateur trouvé par SQL direct');
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
}

test();