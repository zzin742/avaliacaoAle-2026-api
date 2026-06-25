// Garante que o segredo JWT existe no volume compartilhado.
// Roda no boot pra que web e migrate compartilhem o mesmo segredo.

module.exports = {
    name: 'ensure-secret',
    description: 'Gera ou carrega o segredo JWT do volume',
    handle: async () => {
        require('../src/config/jwt')
        console.log('[jwt] segredo garantido')
    },
}
