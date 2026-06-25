const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    return sequelize.define(
        'Avaliacao',
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
            nota: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: { min: 1, max: 5 },
            },
            comentario: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            tableName: 'avaliacoes',
            underscored: true,
            timestamps: true,
        }
    )
}
