module.exports = function crudFactory(Model, options = {}) {
    const include = options.include || []
    const attributes = options.attributes // permite { exclude: ['senha'] }
    const onCreatePayload = options.onCreatePayload || ((req) => req.body)
    const onUpdatePayload = options.onUpdatePayload || ((req) => req.body)

    return {
        async list(req, res, next) {
            try {
                const page = Math.max(parseInt(req.query.page || '1', 10), 1)
                const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100)
                const offset = (page - 1) * limit

                const { rows, count } = await Model.findAndCountAll({
                    include,
                    attributes,
                    limit,
                    offset,
                    order: [['id', 'ASC']],
                    distinct: true, // evita inflar o count quando ha JOIN
                })

                return res.json({
                    dados: rows,
                    paginacao: {
                        pagina: page,
                        por_pagina: limit,
                        total: count,
                        total_paginas: Math.ceil(count / limit),
                    },
                })
            } catch (err) {
                next(err)
            }
        },

        async get(req, res, next) {
            try {
                const item = await Model.findByPk(req.params.id, { include, attributes })
                if (!item) return res.status(404).json({ erro: 'Registro nao encontrado' })
                return res.json(item)
            } catch (err) {
                next(err)
            }
        },

        async create(req, res, next) {
            try {
                const payload = onCreatePayload(req)
                const novo = await Model.create(payload)
                return res.status(201).json(novo)
            } catch (err) {
                next(err)
            }
        },

        async update(req, res, next) {
            try {
                const item = await Model.findByPk(req.params.id)
                if (!item) return res.status(404).json({ erro: 'Registro nao encontrado' })
                const payload = onUpdatePayload(req)
                await item.update(payload)
                return res.json(item)
            } catch (err) {
                next(err)
            }
        },

        async remove(req, res, next) {
            try {
                const item = await Model.findByPk(req.params.id)
                if (!item) return res.status(404).json({ erro: 'Registro nao encontrado' })
                await item.destroy()
                return res.status(204).end()
            } catch (err) {
                next(err)
            }
        },
    }
}
