import { assetsRepository, AssetsRepository } from './assets.repository';
import {
  NotFoundError,
  ConflictError
} from '../../common/errors/app-error';
import {
  CreateAssetInput,
  UpdateAssetInput,
  AssignAssetInput,
  AssetQueryInput
} from '@ems/validation';
import { prisma } from '../../config/database';

export class AssetsService {
  constructor(private repo: AssetsRepository = assetsRepository) {}

  async listAssets(query: AssetQueryInput) {
    return this.repo.findAssets(query);
  }

  async getAssetById(id: string) {
    const asset = await this.repo.findById(id);
    if (!asset) {
      throw new NotFoundError('Asset record not found');
    }
    return asset;
  }

  async createAsset(input: CreateAssetInput, actorId?: string) {
    const existing = await this.repo.findBySerialNumber(input.serialNumber.trim());
    if (existing) {
      throw new ConflictError('An asset with this serial number already exists');
    }

    if (input.assignedToId) {
      const user = await prisma.user.findUnique({ where: { id: input.assignedToId } });
      if (!user) {
        throw new NotFoundError('Assigned user not found');
      }
    }

    const asset = await this.repo.create({
      name: input.name.trim(),
      serialNumber: input.serialNumber.trim(),
      type: input.type,
      status: input.status,
      assignedToId: input.assignedToId,
      notes: input.notes?.trim() || null
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: 'ASSET_CREATED',
        entity: 'Asset',
        entityId: asset.id,
        metadata: {
          name: asset.name,
          serialNumber: asset.serialNumber,
          type: asset.type,
          assignedToId: asset.assignedToId
        }
      }
    });

    return asset;
  }

  async updateAsset(id: string, input: UpdateAssetInput, actorId?: string) {
    const asset = await this.repo.findById(id);
    if (!asset) {
      throw new NotFoundError('Asset record not found');
    }

    if (input.serialNumber && input.serialNumber.trim() !== asset.serialNumber) {
      const existing = await this.repo.findBySerialNumber(input.serialNumber.trim());
      if (existing) {
        throw new ConflictError('An asset with this serial number already exists');
      }
    }

    if (input.assignedToId !== undefined && input.assignedToId !== null) {
      const user = await prisma.user.findUnique({ where: { id: input.assignedToId } });
      if (!user) {
        throw new NotFoundError('Assigned user not found');
      }
    }

    const updated = await this.repo.update(id, {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.serialNumber ? { serialNumber: input.serialNumber.trim() } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.assignedToId !== undefined
        ? {
            assignedToId: input.assignedToId,
            assignedDate: input.assignedToId ? new Date() : null,
            status: input.assignedToId ? 'ASSIGNED' : 'AVAILABLE'
          }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes ? input.notes.trim() : null } : {})
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: 'ASSET_UPDATED',
        entity: 'Asset',
        entityId: id,
        metadata: input as any
      }
    });

    return updated;
  }

  async deleteAsset(id: string, actorId?: string) {
    const asset = await this.repo.findById(id);
    if (!asset) {
      throw new NotFoundError('Asset record not found');
    }

    await this.repo.delete(id);

    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: 'ASSET_DELETED',
        entity: 'Asset',
        entityId: id,
        metadata: { name: asset.name, serialNumber: asset.serialNumber }
      }
    });

    return { message: 'Asset record deleted successfully' };
  }

  async assignAsset(id: string, input: AssignAssetInput, actorId?: string) {
    const asset = await this.repo.findById(id);
    if (!asset) {
      throw new NotFoundError('Asset record not found');
    }

    if (input.assignedToId) {
      const user = await prisma.user.findUnique({ where: { id: input.assignedToId } });
      if (!user || !user.isActive) {
        throw new NotFoundError('Active employee not found');
      }
    }

    const isReclaim = !input.assignedToId;

    const updated = await this.repo.update(id, {
      assignedToId: input.assignedToId,
      assignedDate: isReclaim ? null : new Date(),
      status: isReclaim ? 'AVAILABLE' : 'ASSIGNED',
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {})
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: isReclaim ? 'ASSET_RECLAIMED' : 'ASSET_ASSIGNED',
        entity: 'Asset',
        entityId: id,
        metadata: {
          assetName: asset.name,
          serialNumber: asset.serialNumber,
          assignedToId: input.assignedToId,
          isReclaim
        }
      }
    });

    return updated;
  }

  async getAssetsByUserId(userId: string) {
    return this.repo.findByUserId(userId);
  }
}

export const assetsService = new AssetsService();
