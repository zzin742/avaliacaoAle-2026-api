const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const SECRET_DIR = process.env.JWT_SECRET_DIR || '/app/.secrets'
const SECRET_FILE = path.join(SECRET_DIR, 'jwt_secret')

function carregarSegredo() {
    const doEnv = process.env.JWT_SECRET
    if (doEnv && doEnv.trim() !== '') return doEnv.trim()

    try {
        if (fs.existsSync(SECRET_FILE)) {
            const salvo = fs.readFileSync(SECRET_FILE, 'utf8').trim()
            if (salvo) return salvo
        }
    } catch (_) {}

    const gerado = crypto.randomBytes(32).toString('hex')
    try {
        fs.mkdirSync(SECRET_DIR, { recursive: true })
        fs.writeFileSync(SECRET_FILE, gerado, { mode: 0o600 })
    } catch (_) {
        console.warn('[jwt] nao foi possivel persistir o segredo; usando apenas em memoria.')
    }
    return gerado
}

module.exports = {
    JWT_SECRET: carregarSegredo(),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
}
