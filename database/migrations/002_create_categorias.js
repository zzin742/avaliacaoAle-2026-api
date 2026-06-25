module.exports = {
    name: '002_create_categorias',

    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('categorias', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            nome: { type: Sequelize.STRING(80), allowNull: false, unique: true },
            descricao: { type: Sequelize.TEXT, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        })
        // nome ja e UNIQUE pela definicao da coluna (gera indice unico automaticamente)
    },

    async down(queryInterface) {
        await queryInterface.dropTable('categorias')
    },
}
