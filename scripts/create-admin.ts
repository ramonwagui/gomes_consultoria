import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@gestconv360.com'; // Usando um email padrão para o login
  const password = '123456';
  
  // Verifica se o usuário já existe
  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (existingAdmin) {
    console.log(`O usuário ${email} já existe no banco de dados!`);
    return;
  }

  // Gera o hash da senha
  const passwordHash = await bcrypt.hash(password, 10);

  // Cria o usuário
  const admin = await prisma.user.create({
    data: {
      nome: 'Administrador do Sistema',
      email,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('✅ Usuário administrador criado com sucesso!');
  console.log(`Email de login: ${admin.email}`);
  console.log(`Senha: ${password}`);
}

main()
  .catch((e) => {
    console.error('Erro ao criar usuário:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
