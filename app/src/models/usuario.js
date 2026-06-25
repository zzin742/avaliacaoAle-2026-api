const { DataTypes } = require('sequelize')
const bcrypt = require('bcrypt')

module.exports = (sequelize) => {
    const Usuario = sequelize.define(
        'Usuario',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            nome: {
                type: DataTypes.STRING(120),
                allowNull: false,
                validate: { notEmpty: true, len: [2, 120] },
            },
            email: {
                type: DataTypes.STRING(160),
                allowNull: false,
                unique: true,
                validate: { isEmail: true, notEmpty: true },
            },
            senha: {
                // bcrypt gera 60 chars fixos; 72 cobre prefixos. Migration
                // alinhada (era 255, dispensavel — desperdicio de bytes).
                type: DataTypes.STRING(72),
                allowNull: false,
                validate: { notEmpty: true, len: [6, 72] },
            },
            tipo: {
                // VARCHAR + CHECK no banco (definido na migration). Aqui no
                // model usamos STRING + validate.isIn pra validar via app.
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'aluno',
                validate: { isIn: [['aluno', 'admin']] },
            },
        },
        {
            tableName: 'usuarios',
            underscored: true,
            timestamps: true,
            hooks: {
                beforeCreate: async (usuario) => {
                    if (usuario.senha) {
                        usuario.senha = await bcrypt.hash(usuario.senha, 10)
                    }
                },
                beforeUpdate: async (usuario) => {
                    if (usuario.changed('senha')) {
                        usuario.senha = await bcrypt.hash(usuario.senha, 10)
                    }
                },
            },
        }
    )

    Usuario.prototype.verificarSenha = async function (senhaPlana) {
        return bcrypt.compare(senhaPlana, this.senha)
    }

    Usuario.prototype.toJSON = function () {
        const obj = { ...this.get() }
        delete obj.senha
        return obj
    }

    return Usuario
}
