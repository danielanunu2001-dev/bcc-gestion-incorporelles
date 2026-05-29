const { sequelize } = require('./src/config/database');
const bcrypt = require('bcrypt');

async function init() {
  try {
    console.log('🔄 Création des tables...');
    
