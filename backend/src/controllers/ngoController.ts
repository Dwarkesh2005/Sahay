import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/authMiddleware';
import { ALLOWED_GUJARAT_CITIES } from './citiesController';

/**
 * GET /api/ngos - Search & filter NGOs
 * Query params: service, city_id, search, verified (true/false), page, limit
 */
export const getNgos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { service, city_id, search, verified, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      cities: {
        city_name: { in: ALLOWED_GUJARAT_CITIES }
      }
    };

    // Filter by service type
    if (service && typeof service === 'string') {
      where.ngo_services = {
        some: { service: service as any }
      };
    }

    // Filter by city
    if (city_id && typeof city_id === 'string') {
      where.city_id = parseInt(city_id, 10);
    }

    // Filter by verification status
    if (verified === 'true') {
      where.verification_status = {
        in: ['GOVERNMENT_VERIFIED', 'CONTACT_VERIFIED', 'MANUALLY_VERIFIED']
      };
    }

    // Search by name or description
    if (search && typeof search === 'string') {
      where.OR = [
        { ngo_name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [ngos, total] = await Promise.all([
      prisma.ngos.findMany({
        where,
        include: {
          ngo_services: true,
          cities: true,
          ngo_verification: {
            orderBy: { verification_date: 'desc' },
            take: 1
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.ngos.count({ where })
    ]);

    res.status(200).json({
      ngos,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching NGOs:', error);
    res.status(500).json({ error: 'Failed to fetch NGOs' });
  }
};

/**
 * GET /api/ngos/:id - Get single NGO details
 */
export const getNgoById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ngoId = parseInt(req.params.id as string, 10);
    if (isNaN(ngoId)) {
      res.status(400).json({ error: 'Invalid NGO ID' });
      return;
    }

    const ngo = await prisma.ngos.findUnique({
      where: { ngo_id: ngoId },
      include: {
        ngo_services: true,
        cities: true,
        ngo_verification: {
          orderBy: { verification_date: 'desc' }
        },
        users: {
          select: {
            full_name: true,
            email: true,
            is_active: true,
            created_at: true
          }
        }
      }
    });

    if (!ngo) {
      res.status(404).json({ error: 'NGO not found' });
      return;
    }

    res.status(200).json({ ngo });
  } catch (error: any) {
    console.error('Error fetching NGO:', error);
    res.status(500).json({ error: 'Failed to fetch NGO details' });
  }
};

/**
 * PUT /api/ngos/my/profile - Update own NGO profile (NGO role only)
 */
export const updateMyNgoProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const ngo = await prisma.ngos.findUnique({
      where: { user_id: req.user.user_id }
    });

    if (!ngo) {
      res.status(404).json({ error: 'NGO profile not found for this user' });
      return;
    }

    const {
      ngo_name,
      registration_number,
      pan,
      ngo_darpan_id,
      contact_person,
      phone_number,
      email,
      website,
      address,
      description,
      services
    } = req.body;

    const updateData: any = { updated_at: new Date() };
    if (ngo_name) updateData.ngo_name = ngo_name;
    if (registration_number !== undefined) updateData.registration_number = registration_number || null;
    if (pan !== undefined) updateData.pan = pan ? pan.toUpperCase().trim() : null;
    if (ngo_darpan_id !== undefined) updateData.ngo_darpan_id = ngo_darpan_id || null;
    if (contact_person) updateData.contact_person = contact_person;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (email) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (address) updateData.address = address;
    if (description !== undefined) updateData.description = description;

    const result = await prisma.$transaction(async (tx) => {
      const updatedNgo = await tx.ngos.update({
        where: { ngo_id: ngo.ngo_id },
        data: updateData
      });

      // Update services if provided
      if (services && Array.isArray(services)) {
        // Remove existing services and re-add
        await tx.ngo_services.deleteMany({
          where: { ngo_id: ngo.ngo_id }
        });
        if (services.length > 0) {
          await tx.ngo_services.createMany({
            data: services.map((service: string) => ({
              ngo_id: ngo.ngo_id,
              service: service as any
            })),
            skipDuplicates: true
          });
        }
      }

      return tx.ngos.findUnique({
        where: { ngo_id: ngo.ngo_id },
        include: {
          ngo_services: true,
          cities: true
        }
      });
    });

    res.status(200).json({
      message: 'NGO profile updated successfully',
      ngo: result
    });
  } catch (error: any) {
    console.error('Error updating NGO profile:', error);
    res.status(500).json({ error: 'Failed to update NGO profile' });
  }
};

/**
 * POST /api/ngos/:id/report - Report an NGO
 */
export const reportNgo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const ngoId = parseInt(req.params.id as string, 10);
    if (isNaN(ngoId)) {
      res.status(400).json({ error: 'Invalid NGO ID' });
      return;
    }

    const { reason } = req.body;
    if (!reason || reason.trim().length < 10) {
      res.status(400).json({ error: 'Report reason must be at least 10 characters' });
      return;
    }

    // Verify NGO exists
    const ngo = await prisma.ngos.findUnique({ where: { ngo_id: ngoId } });
    if (!ngo) {
      res.status(404).json({ error: 'NGO not found' });
      return;
    }

    const report = await prisma.reports.create({
      data: {
        ngo_id: ngoId,
        user_id: req.user.user_id,
        reason: reason.trim(),
        status: 'PENDING'
      }
    });

    res.status(201).json({
      message: 'Report submitted successfully',
      report
    });
  } catch (error: any) {
    console.error('Error reporting NGO:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
};
