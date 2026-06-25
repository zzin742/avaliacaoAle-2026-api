module.exports = {
    name: '004_create_matriculas',

    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('matriculas', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            usuario_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'usuarios', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            curso_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'cursos', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            data_matricula: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            status: { type: Sequelize.ENUM('ativa', 'concluida', 'cancelada'), allowNull: false, defaultValue: 'ativa' },
            progresso: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        })

        await queryInterface.addIndex('matriculas', ['usuario_id'], { name: 'matriculas_usuario_idx' })
        await queryInterface.addIndex('matriculas', ['curso_id'], { name: 'matriculas_curso_idx' })
        await queryInterface.addIndex('matriculas', ['usuario_id', 'curso_id'], {
            unique: true,
            name: 'uniq_matricula_usuario_curso',
        })
        await queryInterface.addIndex('matriculas', ['status'], { name: 'matriculas_status_idx' })
        await queryInterface.addIndex('matriculas', ['data_matricula'], { name: 'matriculas_data_idx' })

        // CHECK constraint pra progresso (0..100)
        await queryInterface.sequelize.query(`
            ALTER TABLE matriculas
            ADD CONSTRAINT chk_matriculas_progresso CHECK (progresso BETWEEN 0 AND 100)
        `)
    },

    async down(queryInterface) {
        await queryInterface.dropTable('matriculas')
    },
}
