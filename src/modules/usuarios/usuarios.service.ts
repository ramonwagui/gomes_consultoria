import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "../../lib/prisma";
import { CreateUserInput, UpdateUserInput } from "./usuarios.schema";

export const listUsers = async () => {
  return prisma.user.findMany({
    include: {
      convenetePermissions: {
        include: {
          convenete: true
        },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });
};

export const getUserById = async (id: number) => {
  return prisma.user.findUnique({
    where: { id },
    include: {
      convenetePermissions: {
        include: {
          convenete: true
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });
};

const replaceUserConvenetePermissions = async (userId: number, proponenteIds: number[]) => {
  const uniqueIds = Array.from(new Set(proponenteIds));
  await prisma.$transaction([
    prisma.userConvenetePermission.deleteMany({ where: { userId } }),
    ...uniqueIds.map((conveneteId) =>
      prisma.userConvenetePermission.create({
        data: {
          userId,
          conveneteId
        }
      })
    )
  ]);
};

export const createUser = async (input: CreateUserInput) => {
  const passwordHash = await bcrypt.hash(input.senha, 10);
  const proponenteIds = input.role === UserRole.DEMONSTRACAO ? [] : (input.proponente_ids ?? []);
  const created = await prisma.user.create({
    data: {
      nome: input.nome.trim(),
      email: input.email.toLowerCase().trim(),
      passwordHash,
      role: input.role
    }
  });

  await replaceUserConvenetePermissions(created.id, proponenteIds);
  return getUserById(created.id);
};

export const updateUser = async (id: number, input: UpdateUserInput) => {
  const data: {
    nome?: string;
    email?: string;
    role?: UpdateUserInput["role"];
    passwordHash?: string;
  } = {};

  if (input.nome !== undefined) {
    data.nome = input.nome.trim();
  }
  if (input.email !== undefined) {
    data.email = input.email.toLowerCase().trim();
  }
  if (input.role !== undefined) {
    data.role = input.role;
  }
  if (input.senha !== undefined) {
    data.passwordHash = await bcrypt.hash(input.senha, 10);
  }

  await prisma.user.update({
    where: { id },
    data
  });

  if (input.role === UserRole.DEMONSTRACAO) {
    await replaceUserConvenetePermissions(id, []);
  } else if (input.proponente_ids !== undefined) {
    await replaceUserConvenetePermissions(id, input.proponente_ids);
  }

  return getUserById(id);
};

export const updateUserAvatar = async (
  id: number,
  payload: {
    avatarPath: string;
    avatarMimeType: string;
  }
) => {
  await prisma.user.update({
    where: { id },
    data: {
      avatarPath: payload.avatarPath,
      avatarMimeType: payload.avatarMimeType
    }
  });
  return getUserById(id);
};

export const clearUserAvatar = async (id: number) => {
  await prisma.user.update({
    where: { id },
    data: {
      avatarPath: null,
      avatarMimeType: null
    }
  });
  return getUserById(id);
};
