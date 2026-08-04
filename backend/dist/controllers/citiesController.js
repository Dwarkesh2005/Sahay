"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCities = void 0;
const db_1 = require("../db");
const defaultCities = [
    { city_name: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh' },
    { city_name: 'Patna', district: 'Patna', state: 'Bihar' },
    { city_name: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh' },
    { city_name: 'Ranchi', district: 'Ranchi', state: 'Jharkhand' },
    { city_name: 'New Delhi', district: 'New Delhi', state: 'Delhi' }
];
const getCities = async (_req, res) => {
    try {
        let citiesList = await db_1.prisma.cities.findMany();
        if (citiesList.length === 0) {
            await db_1.prisma.cities.createMany({
                data: defaultCities,
                skipDuplicates: true
            });
            citiesList = await db_1.prisma.cities.findMany();
        }
        res.status(200).json(citiesList);
    }
    catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
};
exports.getCities = getCities;
