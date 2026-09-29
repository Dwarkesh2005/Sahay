import { Request, Response } from 'express';
import { prisma } from '../db';

/**
 * GET /api/cities - Get all cities in the database
 * Returns all seeded cities ordered by state then city name.
 */
export const getCities = async (_req: Request, res: Response): Promise<void> => {
  try {
    const citiesList = await prisma.cities.findMany({
      orderBy: [
        { state: 'asc' },
        { city_name: 'asc' }
      ]
    });

    res.status(200).json(citiesList);
  } catch (error: any) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
};
