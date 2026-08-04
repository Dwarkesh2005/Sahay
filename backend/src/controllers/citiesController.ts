import { Request, Response } from 'express';
import { prisma } from '../db';

const defaultCities = [
  { city_name: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh' },
  { city_name: 'Patna', district: 'Patna', state: 'Bihar' },
  { city_name: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh' },
  { city_name: 'Ranchi', district: 'Ranchi', state: 'Jharkhand' },
  { city_name: 'New Delhi', district: 'New Delhi', state: 'Delhi' }
];

export const getCities = async (_req: Request, res: Response): Promise<void> => {
  try {
    let citiesList = await prisma.cities.findMany();
    
    if (citiesList.length === 0) {
      await prisma.cities.createMany({
        data: defaultCities,
        skipDuplicates: true
      });
      citiesList = await prisma.cities.findMany();
    }
    
    res.status(200).json(citiesList);
  } catch (error: any) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
};
