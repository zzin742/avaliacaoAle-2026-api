// Desfaz a ultima migration aplicada (uma de cada vez).

const path = require('node:path')
const sequelize = require('../src/config/database')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'migrations')

module.exports = {
    name: 'migrate:undo',
    description: 'Desfaz a ultima migration aplicada',
    handle: async () => {
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
    },
}
