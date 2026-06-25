module.exports = {
    name: '001_create_usuarios',

    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('usuarios', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            nome: { type: Sequelize.STRING(120), allowNull: false },
            email: { type: Sequelize.STRING(160), allowNull: false, unique: true },
            senha: { type: Sequelize.STRING(255), allowNull: false },
            tipo: { type: Sequelize.ENUM('aluno', 'admin'), allowNull: false, defaultValue: 'aluno' },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        })
        // email ja e UNIQUE pela definicao da coluna (gera indice unico automaticamente)
        await queryInterface.addIndex('usuarios', ['tipo'], { name: 'usuarios_tipo_idx' })
    },

    async down(queryInterface) {
        await queryInterface.dropTable('usuarios')
    },
}
