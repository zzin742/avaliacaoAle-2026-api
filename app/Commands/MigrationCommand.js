// Executa todas as migrations pendentes em ordem alfabetica.
// Cria a tabela de controle _migrations no primeiro run.
//
// Garantias:
//  - Advisory lock: duas instancias concorrentes nao conflitam (a segunda espera).
//  - DDL + INSERT em UMA unica transacao (passa { transaction } pro queryInterface).
//  - Checksum: detecta migration editada apos ja ter sido aplicada (drift).

const path = require('node:path')
const fs = require('node:fs')
const sequelize = require('../src/config/database')
const { ensureMigrationsTable, acquireMigrationLock, checksum } = require('../src/utils/migrationUtils')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations')

function listMigrationFiles() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        throw new Error(`pasta de migrations nao encontrada: ${MIGRATIONS_DIR}`)
    }
    return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js')).sort()
}

module.exports = {
    name: 'migrate',
    description: 'Executa as migrations pendentes',
    handle: async () => {
        await ensureMigrationsTable()
        const files = listMigrationFiles()
        const { Sequelize } = require('sequelize')

        let aplicadas = 0
        for (const file of files) {
            const filePath = path.join(MIGRATIONS_DIR, file)
            const migration = require(filePath)
            const content = fs.readFileSync(filePath, 'utf8')
            const fileChecksum = checksum(content)

            // Uma transacao por migration, com lock no inicio.
            await sequelize.transaction(async (t) => {
                await acquireMigrationLock(t)

                // Re-verifica DENTRO do lock (outra instancia pode ter aplicado).
                const [rows] = await sequelize.query(
                    'SELECT checksum FROM _migrations WHERE name = $1',
                    { bind: [migration.name], transaction: t },
                )

                if (rows.length > 0) {
                    if (rows[0].checksum && rows[0].checksum !== fileChecksum) {
                        throw new Error(
                            `[drift] ${migration.name}: checksum diverge do banco. ` +
                                `Migration aplicada foi editada apos execucao. ` +
                                `Aplicado=${rows[0].checksum.slice(0, 8)}... Arquivo=${fileChecksum.slice(0, 8)}...`,
                        )
                    }
                    console.log(`[skip] ${migration.name}`)
                    return
                }

                console.log(`[up]   ${migration.name}`)
                const t0 = process.hrtime.bigint()

                // CRITICO: passa { transaction: t } pra que TODO o DDL da migration
                // rode dentro da mesma transacao. Migrations devem aceitar o terceiro
                // argumento e repassar pra queryInterface.
                await migration.up(sequelize.getQueryInterface(), Sequelize, { transaction: t })

                await sequelize.query(
                    'INSERT INTO _migrations (name, checksum) VALUES ($1, $2)',
                    { bind: [migration.name, fileChecksum], transaction: t },
                )

                const ms = Number(process.hrtime.bigint() - t0) / 1e6
                console.log(`[ok]   ${migration.name} em ${ms.toFixed(1)}ms`)
                aplicadas++
            })
        }

        console.log(`\n[fim] ${aplicadas} migration(s) aplicada(s)`)
    },
}
