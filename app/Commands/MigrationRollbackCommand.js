// Desfaz a ultima migration aplicada (uma de cada vez).
//
// Garantias:
//  - Garante que a tabela _migrations existe (nao crasha em banco virgem).
//  - Advisory lock evita rollback concorrente.
//  - DDL down + DELETE em uma unica transacao.
//  - Detecta arquivo da migration sumido (mensagem clara, nao stack trace bruto).

const path = require('node:path')
const fs = require('node:fs')
const sequelize = require('../src/config/database')
const { ensureMigrationsTable, acquireMigrationLock } = require('../src/utils/migrationUtils')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations')

module.exports = {
    name: 'migrate:undo',
    description: 'Desfaz a ultima migration aplicada',
    handle: async () => {
        await ensureMigrationsTable()

        await sequelize.transaction(async (t) => {
            await acquireMigrationLock(t)

            const [rows] = await sequelize.query(
                'SELECT name FROM _migrations ORDER BY id DESC LIMIT 1',
                { transaction: t },
            )

            if (!rows[0]) {
                console.log('[ok] nada pra desfazer (tabela _migrations vazia)')
                return
            }

            const ultima = rows[0].name
            const filePath = path.join(MIGRATIONS_DIR, `${ultima}.js`)

            if (!fs.existsSync(filePath)) {
                throw new Error(
                    `[erro] arquivo da migration "${ultima}" nao existe em ${MIGRATIONS_DIR}. ` +
                        `Possivelmente foi renomeado/apagado. ` +
                        `Restaure o arquivo OU remova manualmente do _migrations.`,
                )
            }

            const migration = require(filePath)
            if (typeof migration.down !== 'function') {
                throw new Error(`[erro] migration "${ultima}" nao tem funcao down() implementada`)
            }

            console.log(`[down] ${ultima}`)
            const t0 = process.hrtime.bigint()

            await migration.down(sequelize.getQueryInterface(), require('sequelize').Sequelize, {
                transaction: t,
            })

            await sequelize.query('DELETE FROM _migrations WHERE name = $1', {
                bind: [ultima],
                transaction: t,
            })

            const ms = Number(process.hrtime.bigint() - t0) / 1e6
            console.log(`[ok]   ${ultima} desfeita em ${ms.toFixed(1)}ms`)
        })
    },
}
