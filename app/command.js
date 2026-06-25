/**
 * Entrypoint CLI para comandos administrativos.
 * Carrega dinamicamente todos os comandos da pasta app/Commands/.
 *
 * Uso: node command.js <nome-do-comando>
 *      node command.js --help    (lista os comandos disponiveis)
 */

require('dotenv').config()
const path = require('node:path')
const fs = require('node:fs')
const sequelize = require('./src/config/database')

const COMMANDS_DIR = path.join(__dirname, 'Commands')

function loadCommands() {
    const arquivos = fs
        .readdirSync(COMMANDS_DIR)
        .filter((f) => f.endsWith('Command.js'))

    const comandos = {}
    for (const arquivo of arquivos) {
        const comando = require(path.join(COMMANDS_DIR, arquivo))
        if (!comando.name || typeof comando.handle !== 'function') {
            console.warn(`[aviso] ${arquivo} ignorado (faltando name ou handle)`)
            continue
        }
        comandos[comando.name] = comando
    }
    return comandos
}

function printHelp(comandos) {
    console.log('Comandos disponiveis:\n')
    const nomes = Object.keys(comandos).sort()
    const larguraMax = Math.max(...nomes.map((n) => n.length))
    for (const nome of nomes) {
        const desc = comandos[nome].description || ''
        console.log(`  ${nome.padEnd(larguraMax + 2)} ${desc}`)
    }
}

async function main() {
    const cmdNome = process.argv[2]
    const comandos = loadCommands()

    if (!cmdNome || cmdNome === '--help' || cmdNome === '-h') {
        printHelp(comandos)
        await sequelize.close()
        return
    }

    const comando = comandos[cmdNome]
    if (!comando) {
        console.error(`[erro] comando "${cmdNome}" nao encontrado\n`)
        printHelp(comandos)
        await sequelize.close()
        process.exit(1)
    }

    try {
        await comando.handle()
    } catch (err) {
        console.error('[erro]', err)
        process.exit(1)
    } finally {
        await sequelize.close()
    }
}

main()
