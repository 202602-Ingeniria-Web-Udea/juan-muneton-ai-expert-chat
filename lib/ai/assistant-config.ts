import "server-only";

import { prisma } from "@/lib/prisma";

export async function getAssistantConfig() {
  const config = await prisma.assistantConfig.findUnique({
    where: {
      id: 1,
    },
  });

  if (!config) {
    throw new Error("No se encontró la configuración del asistente.");
  }

  if (!config.enabled) {
    throw new Error("El asistente se encuentra deshabilitado.");
  }

  return config;
}
