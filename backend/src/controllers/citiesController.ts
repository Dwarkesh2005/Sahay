import { Request, Response } from 'express';
import { prisma } from '../db';

export const ALLOWED_GUJARAT_CITIES = [
  'Ahmedabad',
  'Surat',
  'Vadodara',
  'Rajkot',
  'Bhavnagar',
  'Jamnagar',
  'Gandhinagar',
  'Anand',
  'Bharuch',
  'Vapi'
];

/**
 * GET /api/cities - Get all allowed cities in the platform
 * Restricted to the specified 10 Gujarat cities.
 */
export const getCities = async (_req: Request, res: Response): Promise<void> => {
  try {
    const citiesList = await prisma.cities.findMany({
      where: {
        city_name: {
          in: ALLOWED_GUJARAT_CITIES
        }
      },
      orderBy: [
        { city_name: 'asc' }
      ]
    });

    res.status(200).json(citiesList);
  } catch (error: any) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
};

