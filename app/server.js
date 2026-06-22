require('dotenv').config()
const express = require('express')
const swaggerUi = require('swagger-ui-express')

const swaggerSpec = require('./src/config/swagger')
const router = require('./src/routes')
const logger = require('./src/middlewares/log.middleware')
const errorHandler = require('./src/middlewares/error.middleware')
const { sequelize } = require('./src/models')

const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

// Middlewares globais
app.use(express.json({ limit: '1mb' }))
app.use(logger)

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec))

// Rotas da API
app.use(router)

// 404 explicito
app.use((req, res) => res.status(404).json({ erro: 'Rota nao encontrada' }))

// Handler de erro (deve ser o ultimo)
app.use(errorHandler)

async function start() {
    try {
        await sequelize.authenticate()
        console.log('[db] conectado ao PostgreSQL')

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`[http] servidor escutando em http://0.0.0.0:${PORT}`)
            console.log(`[swagger] docs em http://0.0.0.0:${PORT}/api-docs`)
        })
    } catch (err) {
        console.error('[fatal] falha ao iniciar servidor:', err)
        process.exit(1)
    }
}

start()
