import type { PrismaClient, Project, User } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../../lib/app-error.js";
import { getContractLedgerTotals } from "../../lib/ledger.js";
import type { CreateProjectBody } from "./schemas.js";

async function latestContractFor(prisma: PrismaClient, projectId: string) {
  return prisma.contract.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { milestones: { orderBy: { order: "asc" } } },
  });
}

async function toProjectSummary(prisma: PrismaClient, project: Project) {
  const contract = await latestContractFor(prisma, project.id);
  const spent = contract ? (await getContractLedgerTotals(prisma, contract.id)).released : 0;
  const progressPercent = project.budgetPlanned === 0 ? 0 : (spent / project.budgetPlanned) * 100;

  return {
    id: project.id,
    title: project.title,
    sizeLabel: project.sizeLabel,
    description: project.description,
    status: project.status,
    budgetPlanned: project.budgetPlanned,
    spent,
    progressPercent,
    createdAt: project.createdAt,
    contract,
  };
}

export function createProjectsService(prisma: PrismaClient) {
  return {
    async listForUser(user: Pick<User, "id" | "role">) {
      const projects =
        user.role === "PROFESSIONAL"
          ? await prisma.project.findMany({
              where: { contracts: { some: { professionalId: user.id } } },
              orderBy: { createdAt: "desc" },
            })
          : await prisma.project.findMany({
              where: { clientId: user.id },
              orderBy: { createdAt: "desc" },
            });

      const summaries = await Promise.all(
        projects.map((project) => toProjectSummary(prisma, project)),
      );
      return summaries.map(({ contract: _contract, ...summary }) => summary);
    },

    async create(clientId: string, body: CreateProjectBody) {
      return prisma.project.create({ data: { ...body, clientId } });
    },

    async getById(id: string, requestingUserId: string) {
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        throw new NotFoundError("Project not found");
      }

      const summary = await toProjectSummary(prisma, project);
      const isClient = project.clientId === requestingUserId;
      const isProfessional = summary.contract?.professionalId === requestingUserId;
      if (!isClient && !isProfessional) {
        throw new ForbiddenError("You do not have access to this project");
      }

      const { contract, ...rest } = summary;
      return {
        ...rest,
        activeContract: contract
          ? {
              id: contract.id,
              professionalId: contract.professionalId,
              amount: contract.amount,
              status: contract.status,
              startDate: contract.startDate,
              estimatedEnd: contract.estimatedEnd,
              workingDays: contract.workingDays,
              milestones: contract.milestones,
            }
          : null,
      };
    },
  };
}

export type ProjectsService = ReturnType<typeof createProjectsService>;
