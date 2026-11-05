"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCities = exports.ALLOWED_GUJARAT_CITIES = void 0;
const db_1 = require("../db");
exports.ALLOWED_GUJARAT_CITIES = [
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
const getCities = async (_req, res) => {
    try {
        const citiesList = await db_1.prisma.cities.findMany({
            where: {
                city_name: {
                    in: exports.ALLOWED_GUJARAT_CITIES
                }
            },
            orderBy: [
                { city_name: 'asc' }
            ]
        });
        res.status(200).json(citiesList);
    }
    catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
};
exports.getCities = getCities;
