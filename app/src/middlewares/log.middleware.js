// loga metodo, URL, status e tempo de cada requisicao
module.exports = function logger(req, res, next) {
    const inicio = process.hrtime.bigint()

    res.on('finish', () => {
        const fim = process.hrtime.bigint()
        const duracaoMs = Number(fim - inicio) / 1_000_000
        const horario = new Date().toISOString()
        console.log(
            `[${horario}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duracaoMs.toFixed(2)}ms)`
        )
    })

    next()
}
