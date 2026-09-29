"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCities = void 0;
const db_1 = require("../db");
/**
 * GET /api/cities - Get all cities in the database
 * Returns all seeded cities ordered by state then city name.
 */
const getCities = async (_req, res) => {
    try {
        const citiesList = await db_1.prisma.cities.findMany({
            orderBy: [
                { state: 'asc' },
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
