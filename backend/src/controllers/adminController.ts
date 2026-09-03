import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * GET /api/admin/stats - Dashboard statistics
 */
export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalNgos,
      verifiedNgos,
      totalRequests,
      pendingRequests,
      acceptedRequests,
      completedRequests,
      cancelledRequests,
      totalReports,
      pendingReports,
      requestsByType,
      requestsByCity
    ] = await Promise.all([
      prisma.users.count(),
      prisma.ngos.count(),
      prisma.ngos.count({
        where: {
          verification_status: {
            in: ['GOVERNMENT_VERIFIED', 'CONTACT_VERIFIED', 'MANUALLY_VERIFIED']
          }
        }
      }),
      prisma.help_requests.count(),
      prisma.help_requests.count({ where: { status: 'PENDING' } }),
      prisma.help_requests.count({ where: { status: 'ACCEPTED' } }),
      prisma.help_requests.count({ where: { status: 'COMPLETED' } }),
      prisma.help_requests.count({ where: { status: 'CANCELLED' } }),
      prisma.reports.count(),
      prisma.reports.count({ where: { status: 'PENDING' } }),
      prisma.help_requests.groupBy({
        by: ['request_type'],
        _count: { request_id: true }
      }),
      prisma.help_requests.groupBy({
        by: ['city_id'],
        _count: { request_id: true }
      })
    ]);

    // Resolve city names for requestsByCity
    const cityIds = requestsByCity.map((r) => r.city_id);
    const cities = await prisma.cities.findMany({
      where: { city_id: { in: cityIds } }
    });
    const cityMap = new Map(cities.map((c) => [c.city_id, c.city_name]));

    const requestsByCityNamed = requestsByCity.map((r) => ({
      city: cityMap.get(r.city_id) || 'Unknown',
      city_id: r.city_id,
      count: r._count.request_id
    }));

    const requestsByTypeFormatted = requestsByType.map((r) => ({
      type: r.request_type,
      count: r._count.request_id
    }));

    res.status(200).json({
      stats: {
        totalUsers,
        totalNgos,
        verifiedNgos,
        totalRequests,
        pendingRequests,
        acceptedRequests,
        completedRequests,
        cancelledRequests,
        totalReports,
        pendingReports,
        requestsByType: requestsByTypeFormatted,
        requestsByCity: requestsByCityNamed
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

/**
 * GET /api/admin/ngos - List all NGOs for admin management
 */
export const getAdminNgos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && typeof status === 'string') {
      where.verification_status = status as any;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { ngo_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { registration_number: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [ngos, total] = await Promise.all([
      prisma.ngos.findMany({
        where,
        include: {
          ngo_services: true,
          cities: true,
          users: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              is_active: true,
              created_at: true
            }
          },
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
    console.error('Error fetching admin NGOs:', error);
    res.status(500).json({ error: 'Failed to fetch NGOs' });
  }
};

/**
 * PATCH /api/admin/ngos/:id/verify - Verify an NGO
 */
export const verifyNgo = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const { verification_status: newStatus, remarks } = req.body;
    const validStatuses = ['GOVERNMENT_VERIFIED', 'CONTACT_VERIFIED', 'MANUALLY_VERIFIED'];
    if (!newStatus || !validStatuses.includes(newStatus)) {
      res.status(400).json({
        error: `verification_status must be one of: ${validStatuses.join(', ')}`
      });
      return;
    }

    const ngo = await prisma.ngos.findUnique({ where: { ngo_id: ngoId } });
    if (!ngo) {
      res.status(404).json({ error: 'NGO not found' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedNgo = await tx.ngos.update({
        where: { ngo_id: ngoId },
        data: {
          verification_status: newStatus as any,
          updated_at: new Date()
        }
      });

      // Also mark the NGO's user account as verified
      await tx.users.update({
        where: { user_id: ngo.user_id },
        data: { is_verified: true, updated_at: new Date() }
      });

      // Create verification record
      await tx.ngo_verification.create({
        data: {
          ngo_id: ngoId,
          verification_method: newStatus,
          verified_by: req.user!.email,
          remarks: remarks || `Verified by admin (${req.user!.email})`
        }
      });

      return updatedNgo;
    });

    res.status(200).json({
      message: 'NGO verified successfully',
      ngo: result
    });
  } catch (error: any) {
    console.error('Error verifying NGO:', error);
    res.status(500).json({ error: 'Failed to verify NGO' });
  }
};

/**
 * PATCH /api/admin/ngos/:id/reject - Reject/reset NGO verification
 */
export const rejectNgo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ngoId = parseInt(req.params.id as string, 10);
    if (isNaN(ngoId)) {
      res.status(400).json({ error: 'Invalid NGO ID' });
      return;
    }

    const { remarks } = req.body;

    const ngo = await prisma.ngos.findUnique({ where: { ngo_id: ngoId } });
    if (!ngo) {
      res.status(404).json({ error: 'NGO not found' });
      return;
    }

    const updatedNgo = await prisma.ngos.update({
      where: { ngo_id: ngoId },
      data: {
        verification_status: 'PENDING',
        updated_at: new Date()
      }
    });

    // Create verification rejection record
    await prisma.ngo_verification.create({
      data: {
        ngo_id: ngoId,
        verification_method: 'REJECTED',
        verified_by: req.user?.email || 'admin',
        remarks: remarks || 'Verification rejected by admin'
      }
    });

    res.status(200).json({
      message: 'NGO verification rejected',
      ngo: updatedNgo
    });
  } catch (error: any) {
    console.error('Error rejecting NGO:', error);
    res.status(500).json({ error: 'Failed to reject NGO verification' });
  }
};

/**
 * GET /api/admin/users - List all users
 */
export const getAdminUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (role && typeof role === 'string') {
      where.role = role as any;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        select: {
          user_id: true,
          full_name: true,
          email: true,
          phone_number: true,
          role: true,
          is_active: true,
          is_verified: true,
          created_at: true,
          updated_at: true,
          cities: true
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.users.count({ where })
    ]);

    res.status(200).json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * PATCH /api/admin/users/:id/status - Toggle user active status
 */
export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    // Prevent admin from deactivating themselves
    if (req.user && req.user.user_id === userId) {
      res.status(400).json({ error: 'Cannot modify your own account status' });
      return;
    }

    const user = await prisma.users.findUnique({ where: { user_id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updatedUser = await prisma.users.update({
      where: { user_id: userId },
      data: {
        is_active: !user.is_active,
        updated_at: new Date()
      },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        role: true,
        is_active: true
      }
    });

    res.status(200).json({
      message: `User ${updatedUser.is_active ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

/**
 * GET /api/admin/requests - List all requests (admin view)
 */
export const getAdminRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, type, city_id, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && typeof status === 'string') where.status = status as any;
    if (type && typeof type === 'string') where.request_type = type as any;
    if (city_id && typeof city_id === 'string') where.city_id = parseInt(city_id, 10);

    const [requests, total] = await Promise.all([
      prisma.help_requests.findMany({
        where,
        include: {
          cities: true,
          users: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              role: true
            }
          },
          request_responses: {
            include: {
              users: {
                select: {
                  user_id: true,
                  full_name: true,
                  ngos: {
                    select: { ngo_name: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.help_requests.count({ where })
    ]);

    res.status(200).json({
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

/**
 * GET /api/admin/reports - Get all reports
 */
export const getAdminReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && typeof status === 'string') where.status = status as any;

    const [reports, total] = await Promise.all([
      prisma.reports.findMany({
        where,
        include: {
          ngos: {
            select: {
              ngo_id: true,
              ngo_name: true,
              verification_status: true
            }
          },
          users: {
            select: {
              user_id: true,
              full_name: true,
              email: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.reports.count({ where })
    ]);

    res.status(200).json({
      reports,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

/**
 * PATCH /api/admin/reports/:id - Resolve a report
 */
export const resolveReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reportId = parseInt(req.params.id as string, 10);
    if (isNaN(reportId)) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    const { status } = req.body;
    const validStatuses = ['REVIEWED', 'RESOLVED'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const report = await prisma.reports.findUnique({ where: { report_id: reportId } });
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const updatedReport = await prisma.reports.update({
      where: { report_id: reportId },
      data: { status: status as any }
    });

    res.status(200).json({
      message: 'Report updated successfully',
      report: updatedReport
    });
  } catch (error: any) {
    console.error('Error resolving report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
};
