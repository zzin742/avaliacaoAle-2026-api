const { Matricula, Curso } = require('../models')

class RegraNegocioError extends Error {
    constructor(msg, status = 400) {
        super(msg)
        this.status = status
    }
}

// matricula: aluno so se matricula a si mesmo, em curso ativo, sempre comecando do zero
async function matriculasBeforeCreate(req) {
    const body = { ...req.body }

    if (req.usuario.tipo !== 'admin') {
        body.usuario_id = req.usuario.id
        body.progresso = 0
        body.status = 'ativa'
    }
    if (!body.curso_id) {
        throw new RegraNegocioError('curso_id e obrigatorio')
    }

    const curso = await Curso.findByPk(body.curso_id)
    if (!curso) {
        throw new RegraNegocioError('curso nao encontrado', 404)
    }
    if (curso.ativo === false) {
        throw new RegraNegocioError('curso inativo nao aceita matricula')
    }

    return body
}

// avaliacao: aluno so avalia em seu proprio nome e precisa estar matriculado no curso
async function avaliacoesBeforeCreate(req) {
    const body = { ...req.body }

    if (req.usuario.tipo !== 'admin') {
        body.usuario_id = req.usuario.id
    }
    if (!body.curso_id) {
        throw new RegraNegocioError('curso_id e obrigatorio')
    }

    const matricula = await Matricula.findOne({
        where: { usuario_id: body.usuario_id, curso_id: body.curso_id },
    })
    if (!matricula) {
        throw new RegraNegocioError('voce precisa estar matriculado no curso para avalia-lo', 422)
    }

    return body
}

module.exports = {
    RegraNegocioError,
    matriculasBeforeCreate,
    avaliacoesBeforeCreate,
}
