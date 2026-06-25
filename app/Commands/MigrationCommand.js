// Executa todas as migrations pendentes em ordem alfabetica.
// Cria a tabela de controle _migrations no primeiro run.

const path = require('node:path')
const fs = require('node:fs')
const sequelize = require('../src/config/database')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'migrations')

async function ensureMigrationsTable() {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) UNIQUE NOT NULL,
            executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `)
}

async function listExecutedMigrations() {
    const [rows] = await sequelize.query('SELECT name FROM _migrations ORDER BY id')
    return new Set(rows.map((r) => r.name))
}

function listMigrationFiles() {
    return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js')).sort()
}

module.exports = {
    name: 'migrate',
    description: 'Executa as migrations pendentes',
    handle: async () => {
        await ensureMigrationsTable()
        const executed = await listExecutedMigrations()
        const files = listMigrationFiles()
        const queryInterface = sequelize.getQueryInterface()
        const { Sequelize } = require('sequelize')

        let aplicadas = 0
        for (const file of files) {
            const migration = require(path.join(MIGRATIONS_DIR, file))
            if (executed.has(migration.name)) {
                console.log(`[skip] ${migration.name}`)
                continue
            }
            console.log(`[up]   ${migration.name}`)
            await sequelize.transaction(async (t) => {
                await migration.up(queryInterface, Sequelize, { transaction: t })
                await sequelize.query('INSERT INTO _migrations (name) VALUES ($1)', {
                    bind: [migration.name],
                    transaction: t,
                })
            })
            aplicadas++
        }

        console.log(`\n[ok] ${aplicadas} migration(s) aplicada(s)`)
    },
}
