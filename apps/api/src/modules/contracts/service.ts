import type { PrismaClient } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../../lib/app-error.js";
import type { CreateContractBody } from "@buildtrust/shared";

export function createContractsService(prisma: PrismaClient) {
  return {
    async create(clientId: string, body: CreateContractBody) {
      const project = await prisma.project.findUnique({ where: { id: body.projectId } });
      if (!project) {
        throw new NotFoundError("Project not found");
      }
      if (project.clientId !== clientId) {
        throw new ForbiddenError("You do not own this project");
      }

      const professional = await prisma.user.findUnique({ where: { id: body.professionalId } });
      if (!professional || professional.role !== "PROFESSIONAL") {
        throw new NotFoundError("Professional not found");
      }

      return prisma.contract.create({
        data: {
          projectId: body.projectId,
          clientId,
          professionalId: body.professionalId,
          amount: body.amount,
          startDate: body.startDate,
          estimatedEnd: body.estimatedEnd,
          workingDays: body.workingDays,
          scope: body.scope,
          status: "DRAFT",
          milestones: {
            create: body.milestones.map((milestone, index) => ({
              order: index + 1,
              title: milestone.title,
              amount: milestone.amount,
              status: "PENDING",
            })),
          },
        },
        include: { milestones: { orderBy: { order: "asc" } } },
      });
    },

    async getById(id: string, requestingUserId: string) {
      const contract = await prisma.contract.findUnique({
        where: { id },
        include: { milestones: { orderBy: { order: "asc" } } },
      });
      if (!contract) {
        throw new NotFoundError("Contract not found");
      }
      if (contract.clientId !== requestingUserId && contract.professionalId !== requestingUserId) {
        throw new ForbiddenError("You do not have access to this contract");
      }
      return contract;
    },
  };
}

export type ContractsService = ReturnType<typeof createContractsService>;
