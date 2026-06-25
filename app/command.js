/**
 * Entrypoint CLI para comandos administrativos.
 * Uso: node command.js <comando>
 *
 * Comandos disponiveis:
 *   migrate         — executa as migrations pendentes
 *   migrate:undo    — desfaz a ultima migration
 *   seed            — popula o banco com dados de teste (100+ registros)
 */
require('dotenv').config()
const path = require('node:path')
const fs = require('node:fs')
const sequelize = require('./src/config/database')

const MIGRATIONS_DIR = path.join(__dirname, 'src', 'migrations')
const SEEDS_DIR = path.join(__dirname, 'src', 'seeds')

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
    return fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.js'))
        .sort()
}

async function migrate() {
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
}

async function migrateUndo() {
    await ensureMigrationsTable()
    const [rows] = await sequelize.query('SELECT name FROM _migrations ORDER BY id DESC LIMIT 1')
    if (!rows[0]) {
        console.log('[ok] nada pra desfazer')
        return
    }
    const ultima = rows[0].name
    const file = `${ultima}.js`
    const migration = require(path.join(MIGRATIONS_DIR, file))
    const queryInterface = sequelize.getQueryInterface()

    console.log(`[down] ${migration.name}`)
    await sequelize.transaction(async (t) => {
        await migration.down(queryInterface, require('sequelize').Sequelize, { transaction: t })
        await sequelize.query('DELETE FROM _migrations WHERE name = $1', {
            bind: [migration.name],
            transaction: t,
        })
    })

    console.log('[ok] migration desfeita')
}

async function seed() {
    const seed = require(path.join(SEEDS_DIR, 'seed'))
    await seed()
}

// Popula o banco apenas se ainda nao houver usuarios.
// Usado no boot para nao apagar dados existentes em reinicializacoes.
async function seedIfEmpty() {
    const [rows] = await sequelize.query('SELECT COUNT(*)::int AS total FROM usuarios')
    const total = rows[0].total
    if (total > 0) {
        console.log(`[seed] ${total} usuario(s) ja existem; pulando seed.`)
        return
    }
    console.log('[seed] banco vazio; populando dados iniciais...')
    await seed()
}

function ensureSecret() {
    require('./src/config/jwt')
    console.log('[jwt] segredo garantido')
}

async function main() {
    const cmd = process.argv[2]
    try {
        if (cmd === 'migrate') await migrate()
        else if (cmd === 'migrate:undo') await migrateUndo()
        else if (cmd === 'seed') await seed()
        else if (cmd === 'seed:if-empty') await seedIfEmpty()
        else if (cmd === 'ensure-secret') ensureSecret()
        else {
            console.error('comandos disponiveis: migrate | migrate:undo | seed | seed:if-empty | ensure-secret')
            process.exit(1)
        }
    } catch (err) {
        console.error('[erro]', err)
        process.exit(1)
    } finally {
        await sequelize.close()
    }
}

main()
