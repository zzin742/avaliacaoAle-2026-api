module.exports = {
    name: '005_create_avaliacoes',

    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('avaliacoes', {
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
            nota: { type: Sequelize.INTEGER, allowNull: false },
            comentario: { type: Sequelize.TEXT, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        })

        await queryInterface.addIndex('avaliacoes', ['usuario_id'], { name: 'avaliacoes_usuario_idx' })
        await queryInterface.addIndex('avaliacoes', ['curso_id'], { name: 'avaliacoes_curso_idx' })
        await queryInterface.addIndex('avaliacoes', ['usuario_id', 'curso_id'], {
            unique: true,
            name: 'uniq_avaliacao_usuario_curso',
        })
        await queryInterface.addIndex('avaliacoes', ['nota'], { name: 'avaliacoes_nota_idx' })

        await queryInterface.sequelize.query(`
            ALTER TABLE avaliacoes
            ADD CONSTRAINT chk_avaliacoes_nota CHECK (nota BETWEEN 1 AND 5)
        `)
    },

    async down(queryInterface) {
        await queryInterface.dropTable('avaliacoes')
    },
}
