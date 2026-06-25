const express = require('express')
const { autenticarJWT, exigirAdmin, exigirDonoOuAdmin } = require('../middlewares/auth.middleware')
const { sequelize, Usuario, Categoria, Curso, Matricula, Avaliacao } = require('../models')
const crudFactory = require('../controllers/crud.factory')
const auth = require('../controllers/auth.controller')
const redis = require('../config/redis')
const { matriculasBeforeCreate, avaliacoesBeforeCreate } = require('../controllers/hooks.business')

const router = express.Router()

// rotas publicas
router.post('/login', auth.login)

// readiness: reporta banco e cache. O banco precisa estar migrado (tabela existe).
router.get('/health', async (req, res) => {
    const checks = { app: 'ok', db: 'down', cache: 'down' }

    try {
        await sequelize.query('SELECT 1 FROM usuarios LIMIT 1')
        checks.db = 'ok'
    } catch (_) { /* mantem down */ }

    try {
        if ((await redis.ping()) === 'PONG') checks.cache = 'ok'
    } catch (_) { /* mantem down */ }

    // o cache e opcional: a saude depende do banco estar pronto
    const status = checks.db === 'ok' ? 200 : 503
    return res.status(status).json({
        status: status === 200 ? 'ok' : 'unhealthy',
        uptime: process.uptime(),
        checks,
    })
})

// rotas autenticadas
router.use(autenticarJWT)

// ---- USUARIOS ----
const usuariosCRUD = crudFactory(Usuario, {
    attributes: { exclude: ['senha'] },
})
router.get('/usuarios', usuariosCRUD.list)
router.get('/usuarios/:id', usuariosCRUD.get)
router.post('/usuarios', exigirAdmin, usuariosCRUD.create)
router.put('/usuarios/:id', exigirAdmin, usuariosCRUD.update)
router.delete('/usuarios/:id', exigirAdmin, usuariosCRUD.remove)

// ---- CATEGORIAS ----
const categoriasCRUD = crudFactory(Categoria, {
    include: [{ model: Curso, as: 'cursos' }],
})
router.get('/categorias', categoriasCRUD.list)
router.get('/categorias/:id', categoriasCRUD.get)
router.post('/categorias', exigirAdmin, categoriasCRUD.create)
router.put('/categorias/:id', exigirAdmin, categoriasCRUD.update)
router.delete('/categorias/:id', exigirAdmin, categoriasCRUD.remove)

// ---- CURSOS ----
const cursosCRUD = crudFactory(Curso, {
    include: [{ model: Categoria, as: 'categoria' }],
})
router.get('/cursos', cursosCRUD.list)
router.get('/cursos/:id', cursosCRUD.get)
router.post('/cursos', exigirAdmin, cursosCRUD.create)
router.put('/cursos/:id', exigirAdmin, cursosCRUD.update)
router.delete('/cursos/:id', exigirAdmin, cursosCRUD.remove)

// ---- MATRICULAS (tabela pivo) ----
// aluno so matricula a si mesmo em curso ativo; alterar/remover so o dono ou admin
const matriculasCRUD = crudFactory(Matricula, {
    include: [
        { model: Usuario, as: 'usuario', attributes: { exclude: ['senha'] } },
        { model: Curso, as: 'curso' },
    ],
    onCreatePayload: matriculasBeforeCreate,
    onUpdatePayload: matriculasBeforeCreate,
})
router.get('/matriculas', matriculasCRUD.list)
router.get('/matriculas/:id', matriculasCRUD.get)
router.post('/matriculas', matriculasCRUD.create)
router.put('/matriculas/:id', exigirDonoOuAdmin(Matricula), matriculasCRUD.update)
router.delete('/matriculas/:id', exigirDonoOuAdmin(Matricula), matriculasCRUD.remove)

// ---- AVALIACOES ----
// aluno so avalia em seu nome e onde esta matriculado; alterar/remover so o dono ou admin
const avaliacoesCRUD = crudFactory(Avaliacao, {
    include: [
        { model: Usuario, as: 'usuario', attributes: { exclude: ['senha'] } },
        { model: Curso, as: 'curso' },
    ],
    onCreatePayload: avaliacoesBeforeCreate,
    onUpdatePayload: avaliacoesBeforeCreate,
})
router.get('/avaliacoes', avaliacoesCRUD.list)
router.get('/avaliacoes/:id', avaliacoesCRUD.get)
router.post('/avaliacoes', avaliacoesCRUD.create)
router.put('/avaliacoes/:id', exigirDonoOuAdmin(Avaliacao), avaliacoesCRUD.update)
router.delete('/avaliacoes/:id', exigirDonoOuAdmin(Avaliacao), avaliacoesCRUD.remove)

module.exports = router
