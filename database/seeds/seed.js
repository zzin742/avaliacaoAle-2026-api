/**
 * Seed completo com 100+ registros realistas para a Avaliacao Pratica.
 * Total: 30 usuarios + 8 categorias + 25 cursos + 80 matriculas + 60 avaliacoes = 203 registros.
 */
// O Dockerfile copia database/ pra /app/database/ dentro do container,
// entao o caminho relativo aqui aponta pra /app/src/models (../../src/models).
const { Usuario, Categoria, Curso, Matricula, Avaliacao, sequelize } = require('../../src/models')

const CATEGORIAS = [
    { nome: 'Programação', descricao: 'Linguagens, frameworks e fundamentos de desenvolvimento de software.' },
    { nome: 'Banco de Dados', descricao: 'SQL, NoSQL, modelagem, performance e administração.' },
    { nome: 'DevOps & Cloud', descricao: 'Containers, CI/CD, observabilidade e nuvem.' },
    { nome: 'Front-end', descricao: 'HTML, CSS, JavaScript e frameworks como React e Vue.' },
    { nome: 'Mobile', descricao: 'Desenvolvimento Android, iOS, React Native e Flutter.' },
    { nome: 'Inteligência Artificial', descricao: 'Machine Learning, Deep Learning e LLMs.' },
    { nome: 'Segurança', descricao: 'Pentest, criptografia, hardening e segurança ofensiva.' },
    { nome: 'Soft Skills', descricao: 'Comunicação, liderança, metodologias ágeis e produtividade.' },
]

const NOMES = [
    'Maria Silva', 'João Oliveira', 'Ana Santos', 'Pedro Souza', 'Carla Pereira',
    'Lucas Costa', 'Beatriz Lima', 'Rafael Almeida', 'Juliana Ferreira', 'Gustavo Rodrigues',
    'Mariana Carvalho', 'Felipe Martins', 'Camila Ribeiro', 'Bruno Gomes', 'Larissa Araújo',
    'Diego Barbosa', 'Vanessa Rocha', 'Eduardo Cardoso', 'Patrícia Mendes', 'Thiago Dias',
    'Aline Castro', 'Marcelo Pinto', 'Renata Cavalcanti', 'Vinícius Nascimento', 'Fernanda Moreira',
    'Rodrigo Teixeira', 'Tatiana Correia', 'Henrique Ramos', 'Priscila Vieira', 'Daniel Freitas',
]

const CURSOS_BASE = [
    { titulo: 'Node.js do Zero ao Avançado', cat: 'Programação', ch: 60, preco: 199.90 },
    { titulo: 'JavaScript Moderno (ES2024)', cat: 'Programação', ch: 40, preco: 149.90 },
    { titulo: 'Python para Iniciantes', cat: 'Programação', ch: 30, preco: 99.90 },
    { titulo: 'TypeScript Profissional', cat: 'Programação', ch: 35, preco: 179.90 },
    { titulo: 'Go: Concorrência e Performance', cat: 'Programação', ch: 45, preco: 229.90 },
    { titulo: 'PostgreSQL Avançado', cat: 'Banco de Dados', ch: 50, preco: 249.90 },
    { titulo: 'MongoDB na Prática', cat: 'Banco de Dados', ch: 30, preco: 159.90 },
    { titulo: 'Modelagem de Dados Relacional', cat: 'Banco de Dados', ch: 25, preco: 129.90 },
    { titulo: 'Redis para Cache e Filas', cat: 'Banco de Dados', ch: 20, preco: 119.90 },
    { titulo: 'Docker e Containers', cat: 'DevOps & Cloud', ch: 40, preco: 189.90 },
    { titulo: 'Kubernetes: Deploy de Aplicações', cat: 'DevOps & Cloud', ch: 50, preco: 299.90 },
    { titulo: 'AWS Solutions Architect', cat: 'DevOps & Cloud', ch: 80, preco: 399.90 },
    { titulo: 'CI/CD com GitHub Actions', cat: 'DevOps & Cloud', ch: 25, preco: 139.90 },
    { titulo: 'React: Do Básico ao Avançado', cat: 'Front-end', ch: 60, preco: 219.90 },
    { titulo: 'Vue.js 3 + Composition API', cat: 'Front-end', ch: 40, preco: 179.90 },
    { titulo: 'CSS Moderno e Responsivo', cat: 'Front-end', ch: 30, preco: 119.90 },
    { titulo: 'React Native: Apps Cross-Platform', cat: 'Mobile', ch: 50, preco: 269.90 },
    { titulo: 'Flutter Essencial', cat: 'Mobile', ch: 45, preco: 239.90 },
    { titulo: 'Android Nativo com Kotlin', cat: 'Mobile', ch: 60, preco: 289.90 },
    { titulo: 'Machine Learning com Python', cat: 'Inteligência Artificial', ch: 70, preco: 349.90 },
    { titulo: 'Engenharia de Prompts com LLMs', cat: 'Inteligência Artificial', ch: 20, preco: 99.90 },
    { titulo: 'Deep Learning Fundamentos', cat: 'Inteligência Artificial', ch: 60, preco: 319.90 },
    { titulo: 'Pentest Web', cat: 'Segurança', ch: 50, preco: 279.90 },
    { titulo: 'Criptografia Aplicada', cat: 'Segurança', ch: 30, preco: 169.90 },
    { titulo: 'Metodologias Ágeis: Scrum e Kanban', cat: 'Soft Skills', ch: 20, preco: 89.90 },
]

const COMENTARIOS = [
    'Excelente curso, muito didático.',
    'Conteúdo atualizado e prático.',
    'Recomendo, mas poderia ter mais exercícios.',
    'O melhor que fiz sobre o tema.',
    'Bem estruturado, instrutor preparado.',
    'Aprendi muito, valeu cada minuto.',
    'Material de apoio poderia ser melhor.',
    'Cumpriu o prometido.',
    'Ritmo um pouco rápido, mas bom.',
    'Esperava mais profundidade em algumas partes.',
    null, null, null, // alguns sem comentário
]

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

module.exports = async function seed() {
    console.log('[seed] iniciando carga inicial...')

    // O schema e criado pelas migrations (node command.js migrate).
    // O seed apenas popula os dados — nao define schema.

    // ---- Limpar tabelas (na ordem inversa das FKs) ----
    await Avaliacao.destroy({ where: {} })
    await Matricula.destroy({ where: {} })
    await Curso.destroy({ where: {} })
    await Categoria.destroy({ where: {} })
    await Usuario.destroy({ where: {} })

    // Resetar sequencias (Postgres)
    await sequelize.query(`
        ALTER SEQUENCE usuarios_id_seq RESTART WITH 1;
        ALTER SEQUENCE categorias_id_seq RESTART WITH 1;
        ALTER SEQUENCE cursos_id_seq RESTART WITH 1;
        ALTER SEQUENCE matriculas_id_seq RESTART WITH 1;
        ALTER SEQUENCE avaliacoes_id_seq RESTART WITH 1;
    `)

    // ---- USUARIOS ----
    console.log('[seed] criando 30 usuarios...')
    const usuarios = []
    // 1 admin fixo
    usuarios.push(await Usuario.create({
        nome: 'Administrador',
        email: 'admin@cursos.com',
        senha: 'admin123',
        tipo: 'admin',
    }))
    // 29 alunos
    for (let i = 0; i < 29; i++) {
        const nome = NOMES[i % NOMES.length]
        const emailBase = nome.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')
        const u = await Usuario.create({
            nome,
            email: `${emailBase}${i + 1}@cursos.com`,
            senha: 'senha123',
            tipo: 'aluno',
        })
        usuarios.push(u)
    }

    // ---- CATEGORIAS ----
    console.log('[seed] criando 8 categorias...')
    const categorias = await Categoria.bulkCreate(CATEGORIAS)
    const catByName = Object.fromEntries(categorias.map((c) => [c.nome, c]))

    // ---- CURSOS ----
    console.log('[seed] criando 25 cursos...')
    const cursos = []
    for (const c of CURSOS_BASE) {
        const curso = await Curso.create({
            titulo: c.titulo,
            descricao: `Curso completo de ${c.titulo}, com ${c.ch}h de conteúdo prático e exercícios.`,
            carga_horaria: c.ch,
            preco: c.preco,
            categoria_id: catByName[c.cat].id,
            ativo: true,
        })
        cursos.push(curso)
    }

    // ---- MATRICULAS (80, distribuidas) ----
    console.log('[seed] criando 80 matriculas...')
    const matriculaSet = new Set()
    let matriculasCriadas = 0
    while (matriculasCriadas < 80) {
        const u = rand(usuarios.slice(1)) // sem o admin
        const c = rand(cursos)
        const key = `${u.id}-${c.id}`
        if (matriculaSet.has(key)) continue
        matriculaSet.add(key)

        const status = rand(['ativa', 'ativa', 'ativa', 'concluida', 'cancelada'])
        const progresso = status === 'concluida' ? 100 : status === 'cancelada' ? randInt(0, 50) : randInt(0, 99)
        const dataMatricula = new Date(Date.now() - randInt(0, 180) * 24 * 60 * 60 * 1000)

        await Matricula.create({
            usuario_id: u.id,
            curso_id: c.id,
            status,
            progresso,
            data_matricula: dataMatricula,
        })
        matriculasCriadas++
    }

    // ---- AVALIACOES (60, apenas de matriculas nao canceladas) ----
    console.log('[seed] criando 60 avaliacoes...')
    const matriculas = (await Matricula.findAll()).filter((m) => m.status !== 'cancelada')
    const avaliacaoSet = new Set()
    let avaliacoesCriadas = 0
    let tentativas = 0
    while (avaliacoesCriadas < 60 && tentativas < 200) {
        tentativas++
        const m = rand(matriculas)
        const key = `${m.usuario_id}-${m.curso_id}`
        if (avaliacaoSet.has(key)) continue
        avaliacaoSet.add(key)

        // Notas tendem a ser positivas (4-5 mais comuns)
        const nota = rand([3, 3, 4, 4, 4, 5, 5, 5, 5, 2, 1])
        await Avaliacao.create({
            usuario_id: m.usuario_id,
            curso_id: m.curso_id,
            nota,
            comentario: rand(COMENTARIOS),
        })
        avaliacoesCriadas++
    }

    const totais = {
        usuarios: await Usuario.count(),
        categorias: await Categoria.count(),
        cursos: await Curso.count(),
        matriculas: await Matricula.count(),
        avaliacoes: await Avaliacao.count(),
    }
    const total = Object.values(totais).reduce((a, b) => a + b, 0)
    console.log('\n[seed] CONCLUIDO:', totais, `(TOTAL: ${total} registros)`)
    console.log('[seed] credenciais admin: admin@cursos.com / admin123')
}
