import { initDb } from '../src/db';

async function run() {
  console.log('🔄 Iniciando configuração do banco de dados...');
  
  try {
    await initDb();
    console.log('✅ Banco de dados gerado e populado com sucesso!');
    console.log('   - Tabelas criadas');
    console.log('   - Usuário admin criado (se não existia)');
    console.log('   - Dados de exemplo inseridos');
  } catch (error) {
    console.error('❌ Erro ao gerar banco de dados:', error);
    process.exit(1);
  }
}

run();
