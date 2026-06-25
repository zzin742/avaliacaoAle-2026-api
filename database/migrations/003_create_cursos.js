module.exports = {
    name: '003_create_cursos',

    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('cursos', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            titulo: { type: Sequelize.STRING(160), allowNull: false },
            descricao: { type: Sequelize.TEXT, allowNull: true },
            carga_horaria: { type: Sequelize.INTEGER, allowNull: false },
            preco: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
            categoria_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'categorias', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        })
        await queryInterface.addIndex('cursos', ['categoria_id'], { name: 'cursos_categoria_idx' })
        await queryInterface.addIndex('cursos', ['titulo'], { name: 'cursos_titulo_idx' })
        await queryInterface.addIndex('cursos', ['ativo'], { name: 'cursos_ativo_idx' })
    },

    async down(queryInterface) {
        await queryInterface.dropTable('cursos')
    },
}
