import { FastifyInstance } from 'fastify';
import { InventoryCountRepository } from './repository';
import { AppError } from '../../utils/errors';

export class InventoryVersionService {
  private repository: InventoryCountRepository;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.repository = new InventoryCountRepository(fastify);
  }

  /**
   * Obtener todos los items de la versión actual
   * Solo retorna items que coinciden con currentVersion del conteo
   */
  async getCountItems(countId: string, companyId: string) {
    const count = await this.repository.getCountById(countId, companyId);
    if (!count) {
      throw new AppError(404, 'Inventory count not found');
    }

    // FILTRAR por version actual del conteo
    const items = await this.fastify.prisma.inventoryCount_Item.findMany({
      where: {
        countId,
        version: count.currentVersion, // ← SOLO items de la versión actual
        count: {
          companyId,
        },
      },
      include: {
        variance_reports: {
          where: {
            version: count.currentVersion, // Varianzas de esta versión
          },
          orderBy: {
            version: 'desc',
          },
        },
      },
    });

    return {
      countId,
      currentVersion: count.currentVersion,
      totalVersions: count.totalVersions,
      items: items || [],
    };
  }

  /**
   * Obtener solo los items que tienen varianza en la versión anterior
   * Para usar en recontas (V2, V3, etc.)
   */
  async getVarianceItems(countId: string, companyId: string, previousVersion: number) {
    const count = await this.repository.getCountById(countId, companyId);
    if (!count) {
      throw new AppError(404, 'Inventory count not found');
    }

    // Obtener items que tienen varianza reportada en la versión anterior
    const varianceItems = await this.fastify.prisma.inventoryCount_Item.findMany({
      where: {
        countId,
        count: {
          companyId,
        },
        variance_reports: {
          some: {
            version: previousVersion,
            status: {
              in: ['PENDING', 'APPROVED'], // Items con varianza sin resolver
            },
          },
        },
      },
      include: {
        variance_reports: {
          where: {
            version: previousVersion,
          },
        },
      },
    });

    return {
      countId,
      version: previousVersion + 1,
      previousVersion,
      totalItems: varianceItems?.length || 0,
      items: (varianceItems || []).map((item) => ({
        id: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        uom: item.uom,
        systemQty: item.systemQty,
        previousCountedQty: this.getCountedQtyByVersion(item, previousVersion),
        varianceReport: item.variance_reports[0],
      })),
    };
  }

  /**
   * Registrar conteo para una versión específica
   */
  async submitCount(
    countId: string,
    companyId: string,
    version: number,
    locationId: string,
    items: Array<{
      itemCode: string;
      countedQty: number;
      uom: string;
    }>
  ) {
    const count = await this.repository.getCountById(countId, companyId);
    if (!count) {
      throw new AppError(404, 'Inventory count not found');
    }

    // Validar que la versión sea la correcta
    if (version !== count.currentVersion + 1 && version !== count.currentVersion) {
      throw new AppError(400, `Invalid version. Expected ${count.currentVersion}, got ${version}`);
    }

    // Validar que la ubicación exista
    const location = await this.fastify.prisma.warehouse_Location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new AppError(404, 'Location not found');
    }

    let itemsProcessed = 0;
    let variancesDetected = 0;

    // Procesar cada item
    for (const item of items) {
      const countItem = await this.fastify.prisma.inventoryCount_Item.findFirst({
        where: {
          countId,
          itemCode: item.itemCode,
          locationId,
        },
      });

      if (!countItem) {
        console.warn(`Item ${item.itemCode} not found in count`);
        continue;
      }

      // Actualizar el countedQty para esta versión
      const updateData: any = {
        currentVersion: version,
        status: 'PENDING',
      };

      // Asignar a la columna correcta según versión
      updateData[`countedQty_V${version}`] = item.countedQty;

      const updatedItem = await this.fastify.prisma.inventoryCount_Item.update({
        where: { id: countItem.id },
        data: updateData,
      });

      itemsProcessed++;

      // Calcular varianza
      const countedQty = parseFloat(item.countedQty.toString());
      const systemQty = parseFloat(countItem.systemQty.toString());
      const variance = countedQty - systemQty;
      const variancePercent = systemQty !== 0 ? (variance / systemQty) * 100 : 0;

      // Si hay varianza, crear VarianceReport
      if (Math.abs(variance) > 0.01) {
        // Umbral mínimo de varianza
        variancesDetected++;

        // Buscar si ya existe reporte de varianza para esta versión
        const existingVariance = await this.fastify.prisma.varianceReport.findFirst({
          where: {
            countItemId: countItem.id,
            version: version,
          },
        });

        if (existingVariance) {
          // Actualizar reporte existente
          await this.fastify.prisma.varianceReport.update({
            where: { id: existingVariance.id },
            data: {
              countedQty,
              difference: variance,
              variancePercent,
              status: 'PENDING',
            },
          });
        } else {
          // Crear nuevo reporte de varianza
          await this.fastify.prisma.varianceReport.create({
            data: {
              countId,
              countItemId: countItem.id,
              version: version,
              itemCode: item.itemCode,
              itemName: countItem.itemName,
              systemQty,
              countedQty,
              difference: variance,
              variancePercent,
              companyId,
              status: 'PENDING',
            },
          });
        }
      }
    }

    // Si es nueva versión, actualizar el contador
    if (version === count.currentVersion + 1) {
      await this.fastify.prisma.inventoryCount.update({
        where: { id: countId },
        data: {
          currentVersion: version,
          totalVersions: version,
        },
      });
    }

    return {
      success: true,
      version,
      itemsProcessed,
      variancesDetected,
      message: `Version ${version} submitted with ${itemsProcessed} items and ${variancesDetected} variances`,
    };
  }

  /**
   * Crear nueva versión para recontar items con varianza
   * CREA nuevos registros en BD con version: n+1
   */
  async createNewVersion(countId: string, companyId: string) {
    const count = await this.repository.getCountById(countId, companyId);
    if (!count) {
      throw new AppError(404, 'Inventory count not found');
    }

    // ✅ Aceptar COMPLETED o APPROVED
    if (count.status !== 'COMPLETED' && count.status !== 'APPROVED') {
      throw new AppError(
        400,
        `Solo conteos COMPLETADOS o APROBADOS pueden crear versiones. Estado actual: ${count.status}`
      );
    }

    const newVersion = count.currentVersion + 1;

    console.log(`📋 [createNewVersion] Creando versión V${newVersion} para conteo ${count.code}`);

    // 🔑 CAMBIO IMPORTANTE: Obtener SOLO items con varianza
    const itemsWithVariance = await this.fastify.prisma.inventoryCount_Item.findMany({
      where: {
        countId,
        version: count.currentVersion,
        hasVariance: true, // ← SOLO CON VARIANZA
      },
    });

    if (itemsWithVariance.length === 0) {
      throw new AppError(
        400,
        `✅ ¡Perfecto! No hay items con varianza en V${count.currentVersion}. Conteo completado sin problemas.`
      );
    }

    console.log(`   📋 Copiando SOLO ${itemsWithVariance.length} items CON VARIANZA de V${count.currentVersion} → V${newVersion}`);

    // CREAR nuevos registros para la nueva versión (SOLO items con varianza)
    const newVersionItems = [];
    for (const item of itemsWithVariance) {
      // 🔄 LÓGICA CORRECTA:
      // - Item con varianza: conservar el countedQty que el usuario digitó
      // - Usuario recontas sobre esa cantidad en V2
      const newItem = await this.fastify.prisma.inventoryCount_Item.create({
        data: {
          countId,
          locationId: item.locationId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          barCodeInv: item.barCodeInv,
          barCodeVt: item.barCodeVt,
          category: item.category,
          brand: item.brand,
          subcategory: item.subcategory,
          packQty: item.packQty,
          uom: item.uom,
          baseUom: item.baseUom,
          systemQty: item.systemQty, // Copiado: cantidad en sistema (no cambia)
          countedQty: item.countedQty, // ← CONSERVAR: cantidad que el usuario digitó
          version: newVersion, // ← NUEVA VERSIÓN
          status: 'PENDING',
          hasVariance: item.hasVariance, // ← Copia el estado (true)
          costPrice: item.costPrice,
          salePrice: item.salePrice,
          notes: `Reconteo V${newVersion} (Varianza: system=${item.systemQty} vs contado=${item.countedQty})`,
          countedBy: null,
          countedAt: new Date(),
        },
      });
      newVersionItems.push(newItem);
    }

    // ✅ Actualizar el InventoryCount: cambiar a ACTIVE para recontar
    const updated = await this.fastify.prisma.inventoryCount.update({
      where: { id: countId },
      data: {
        currentVersion: newVersion,
        totalVersions: newVersion,
        status: 'ACTIVE', // ← Regresa a ACTIVE para recontar
      },
    });

    console.log(
      `✅ [createNewVersion] Nueva versión V${newVersion} creada con ${newVersionItems.length} items con varianza para revisar. Status: ACTIVE`
    );

    return {
      success: true,
      countId,
      code: count.code,
      newVersion,
      previousVersion: count.currentVersion,
      itemsWithVariance: newVersionItems.length,
      status: 'ACTIVE',
      message: `✅ V${newVersion} creada con ${newVersionItems.length} items con varianza para recontar`,
      items: newVersionItems.map((item) => ({
        id: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        uom: item.uom,
        systemQty: item.systemQty,
        countedQty: item.countedQty, // Conservado para que usuario revise
        version: newVersion,
        hasVariance: true,
      })),
    };
  }

  /**
   * Obtener historial de versiones de un conteo
   */
  async getVersionHistory(countId: string, companyId: string) {
    const count = await this.repository.getCountById(countId, companyId);
    if (!count) {
      throw new AppError(404, 'Inventory count not found');
    }

    const versions = [];

    for (let v = 1; v <= count.totalVersions; v++) {
      const varianceReports = await this.fastify.prisma.varianceReport.findMany({
        where: {
          countId,
          version: v,
        },
      });

      const withVariance = varianceReports?.filter((r) => Math.abs(Number(r.difference)) > 0.01).length || 0;
      const approved = varianceReports?.filter((r) => r.status === 'APPROVED').length || 0;

      versions.push({
        version: v,
        totalItems: count.countItems?.length || 0,
        itemsWithVariance: withVariance,
        approvedItems: approved,
        status: v === count.currentVersion ? 'IN_PROGRESS' : 'COMPLETED',
      });
    }

    return {
      countId,
      code: count.code,
      currentVersion: count.currentVersion,
      totalVersions: count.totalVersions,
      versions,
    };
  }

  /**
   * Obtener la cantidad contada para una versión específica
   */
  private getCountedQtyByVersion(item: any, version: number): number {
    const fieldName = `countedQty_V${version}`;
    return parseFloat(item[fieldName]?.toString() || '0');
  }
}
