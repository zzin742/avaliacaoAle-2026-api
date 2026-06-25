module.exports = {
    name: '004_create_matriculas',

    async up(queryInterface, Sequelize, options = {}) {
        const { transaction } = options
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
            // status: VARCHAR + CHECK (era ENUM). Trade evita pesadelo de
            // ALTER TYPE pra adicionar valor no futuro.
            status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ativa' },
            progresso: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        }, { transaction })

        // matriculas_usuario_idx REMOVIDO: o indice composto
        // uniq_matricula_usuario_curso (usuario_id, curso_id) ja cobre
        // consultas por usuario_id (prefix matching do B-tree).
        // Manter o simples era dead weight: ocupava espaco e lentificava INSERT/UPDATE.
        await queryInterface.addIndex('matriculas', ['curso_id'], { name: 'matriculas_curso_idx', transaction })
        await queryInterface.addIndex('matriculas', ['usuario_id', 'curso_id'], {
            unique: true,
            name: 'uniq_matricula_usuario_curso',
            transaction,
        })
        await queryInterface.addIndex('matriculas', ['status'], { name: 'matriculas_status_idx', transaction })
        await queryInterface.addIndex('matriculas', ['data_matricula'], { name: 'matriculas_data_idx', transaction })

        // CHECK constraints: progresso 0..100 e status no dominio fechado.
        await queryInterface.sequelize.query(
            `ALTER TABLE matriculas ADD CONSTRAINT chk_matriculas_progresso CHECK (progresso BETWEEN 0 AND 100)`,
            { transaction },
        )
        await queryInterface.sequelize.query(
            `ALTER TABLE matriculas ADD CONSTRAINT chk_matriculas_status CHECK (status IN ('ativa', 'concluida', 'cancelada'))`,
            { transaction },
        )
    },

    async down(queryInterface, Sequelize, options = {}) {
        const { transaction } = options
        await queryInterface.dropTable('matriculas', { transaction })
    },
}
