const express = require('express')
const { autenticarJWT } = require('../middlewares/auth.middleware')
const { Usuario, Categoria, Curso, Matricula, Avaliacao } = require('../models')
const crudFactory = require('../controllers/crud.factory')
const auth = require('../controllers/auth.controller')

const router = express.Router()

// rotas publicas
router.post('/login', auth.login)
router.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }))

// rotas autenticadas
router.use(autenticarJWT)

// ---- USUARIOS ----
const usuariosCRUD = crudFactory(Usuario, {
    attributes: { exclude: ['senha'] },
})
router.get('/usuarios', usuariosCRUD.list)
router.get('/usuarios/:id', usuariosCRUD.get)
router.post('/usuarios', usuariosCRUD.create)
router.put('/usuarios/:id', usuariosCRUD.update)
router.delete('/usuarios/:id', usuariosCRUD.remove)

// ---- CATEGORIAS ----
const categoriasCRUD = crudFactory(Categoria, {
    include: [{ model: Curso, as: 'cursos' }],
})
router.get('/categorias', categoriasCRUD.list)
router.get('/categorias/:id', categoriasCRUD.get)
router.post('/categorias', categoriasCRUD.create)
router.put('/categorias/:id', categoriasCRUD.update)
router.delete('/categorias/:id', categoriasCRUD.remove)

// ---- CURSOS ----
const cursosCRUD = crudFactory(Curso, {
    include: [{ model: Categoria, as: 'categoria' }],
})
router.get('/cursos', cursosCRUD.list)
router.get('/cursos/:id', cursosCRUD.get)
router.post('/cursos', cursosCRUD.create)
router.put('/cursos/:id', cursosCRUD.update)
router.delete('/cursos/:id', cursosCRUD.remove)

// ---- MATRICULAS (tabela pivo) ----
const matriculasCRUD = crudFactory(Matricula, {
    include: [
        { model: Usuario, as: 'usuario', attributes: { exclude: ['senha'] } },
        { model: Curso, as: 'curso' },
    ],
})
router.get('/matriculas', matriculasCRUD.list)
router.get('/matriculas/:id', matriculasCRUD.get)
router.post('/matriculas', matriculasCRUD.create)
router.put('/matriculas/:id', matriculasCRUD.update)
router.delete('/matriculas/:id', matriculasCRUD.remove)

// ---- AVALIACOES ----
const avaliacoesCRUD = crudFactory(Avaliacao, {
    include: [
        { model: Usuario, as: 'usuario', attributes: { exclude: ['senha'] } },
        { model: Curso, as: 'curso' },
    ],
})
router.get('/avaliacoes', avaliacoesCRUD.list)
router.get('/avaliacoes/:id', avaliacoesCRUD.get)
router.post('/avaliacoes', avaliacoesCRUD.create)
router.put('/avaliacoes/:id', avaliacoesCRUD.update)
router.delete('/avaliacoes/:id', avaliacoesCRUD.remove)

module.exports = router
