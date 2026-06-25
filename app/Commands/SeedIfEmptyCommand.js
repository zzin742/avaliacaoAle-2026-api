// Popula o banco apenas se ainda nao houver usuarios.
// Usado no boot do container pra nao apagar dados existentes em reinicializacoes.

const path = require('node:path')
const sequelize = require('../src/config/database')

module.exports = {
    name: 'seed:if-empty',
    description: 'Roda o seed apenas se o banco estiver vazio',
    handle: async () => {
        const [rows] = await sequelize.query('SELECT COUNT(*)::int AS total FROM usuarios')
        const total = rows[0].total
        if (total > 0) {
            console.log(`[seed] ${total} usuario(s) ja existem; pulando seed.`)
            return
        }
        console.log('[seed] banco vazio; populando dados iniciais...')
        const seed = require(path.join(__dirname, '..', 'src', 'seeds', 'seed'))
        await seed()
    },
}
