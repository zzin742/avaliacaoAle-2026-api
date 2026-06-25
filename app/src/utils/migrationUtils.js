// Utilitarios compartilhados pelos comandos de migration.
// Centraliza ensureMigrationsTable e advisory lock pra evitar duplicacao
// entre MigrationCommand e MigrationRollbackCommand.

const sequelize = require('../config/database')

// Cria a tabela de controle se ainda nao existir.
// Inclui hash do conteudo pra detectar drift (alguem editar migration ja aplicada).
async function ensureMigrationsTable() {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) UNIQUE NOT NULL,
            checksum VARCHAR(64),
            executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `)
    // Backfill: bancos antigos sem a coluna checksum
    await sequelize.query(`
        ALTER TABLE _migrations
        ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)
    `)
}

// Lock de sessao distribuido pra serializar migrate concorrente.
// Duas instancias rodando 'migrate' ao mesmo tempo: a segunda espera a primeira.
// hashtext gera int8 estavel a partir da string.
async function acquireMigrationLock(transaction) {
    await sequelize.query(`SELECT pg_advisory_xact_lock(hashtext('avaliacaoAle_migrations'))`, {
        transaction,
    })
}

// Hash SHA-256 do conteudo do arquivo. Detecta edicao silenciosa de migration
// ja aplicada (drift entre ambientes).
function checksum(content) {
    const crypto = require('node:crypto')
    return crypto.createHash('sha256').update(content).digest('hex')
}

module.exports = { ensureMigrationsTable, acquireMigrationLock, checksum }
