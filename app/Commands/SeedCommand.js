// Popula o banco com 203 registros de teste (usuarios, categorias, cursos, matriculas, avaliacoes).

const path = require('node:path')

module.exports = {
    name: 'seed',
    description: 'Popula o banco com dados de teste',
    handle: async () => {
        const seed = require(path.join(__dirname, '..', 'database', 'seeds', 'seed'))
        await seed()
    },
}
