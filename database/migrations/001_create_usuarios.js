module.exports = {
    name: '001_create_usuarios',

    // up/down recebem { transaction } no 3o argumento e repassam pra
    // queryInterface — assim o DDL roda na MESMA transacao do INSERT no
    // _migrations (correcao da auditoria: antes o DDL vazava da transacao).
    async up(queryInterface, Sequelize, options = {}) {
        const { transaction } = options
        await queryInterface.createTable('usuarios', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            nome: { type: Sequelize.STRING(120), allowNull: false },
            email: { type: Sequelize.STRING(160), allowNull: false, unique: true },
            senha: { type: Sequelize.STRING(72), allowNull: false }, // bcrypt = 60 chars; 72 cobre prefixos
            // tipo: VARCHAR + CHECK (era ENUM nativo Postgres, troca elimina
            // dor de cabeca pra adicionar valor no futuro — ALTER TYPE ADD VALUE
            // tem restricoes severas dentro de transacao em algumas versoes).
            tipo: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'aluno' },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        }, { transaction })

        await queryInterface.sequelize.query(
            `ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_tipo CHECK (tipo IN ('aluno', 'admin'))`,
            { transaction },
        )

        // email ja e UNIQUE pela coluna (cria indice unico automaticamente).
        await queryInterface.addIndex('usuarios', ['tipo'], { name: 'usuarios_tipo_idx', transaction })
    },

    async down(queryInterface, Sequelize, options = {}) {
        const { transaction } = options
        await queryInterface.dropTable('usuarios', { transaction })
    },
}
