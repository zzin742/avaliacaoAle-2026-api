const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    return sequelize.define(
        'Matricula',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            usuario_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'usuarios', key: 'id' },
            },
            curso_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'cursos', key: 'id' },
            },
            data_matricula: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            status: {
                // VARCHAR + CHECK no banco (definido na migration).
                // Validacao adicional no app via isIn.
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'ativa',
                validate: { isIn: [['ativa', 'concluida', 'cancelada']] },
            },
            progresso: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: { min: 0, max: 100 },
            },
        },
        {
            tableName: 'matriculas',
            underscored: true,
            timestamps: true,
        }
    )
}
