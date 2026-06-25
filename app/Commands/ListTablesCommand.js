// Lista todas as tabelas do banco com a contagem de registros em cada uma.
// Util pra inspecionar o estado do banco rapidamente.

const sequelize = require('../src/config/database')

module.exports = {
    name: 'list-tables',
    description: 'Lista as tabelas do banco com contagem de registros',
    handle: async () => {
        const [tabelas] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `)

        if (tabelas.length === 0) {
            console.log('[ok] nenhuma tabela encontrada')
            return
        }

        console.log(`[ok] ${tabelas.length} tabela(s) no banco:\n`)
        for (const { table_name } of tabelas) {
            const [[{ total }]] = await sequelize.query(`SELECT COUNT(*)::int AS total FROM "${table_name}"`)
            console.log(`  ${table_name.padEnd(20)} ${total} registro(s)`)
        }
    },
}
