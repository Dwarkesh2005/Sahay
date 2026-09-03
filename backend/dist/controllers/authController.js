"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getMe = exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || 'sahay_nature_secret_key_2026';
const register = async (req, res) => {
    try {
        const { role, fullName, email, phone, password, city, ngoName, registrationNumber, pan, ngoDarpanId, ngoDescription, ngoAddress, ngoServices } = req.body;
        // Validate required fields
        if (!fullName || !email || !password) {
            res.status(400).json({ error: 'Full name, email, and password are required' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }
        // Check email uniqueness
        const existingUser = await db_1.prisma.users.findUnique({
            where: { email }
        });
        if (existingUser) {
            res.status(400).json({ error: 'User with this email already exists' });
            return;
        }
        // Check phone uniqueness if provided
        if (phone) {
            const existingPhone = await db_1.prisma.users.findUnique({
                where: { phone_number: phone }
            });
            if (existingPhone) {
                res.status(400).json({ error: 'User with this phone number already exists' });
                return;
            }
        }
        // Resolve city_id (create city with default properties if not exists)
        let cityRecord = await db_1.prisma.cities.findFirst({
            where: {
                city_name: {
                    equals: city,
                    mode: 'insensitive'
                }
            }
        });
        if (!cityRecord && city) {
            cityRecord = await db_1.prisma.cities.create({
                data: {
                    city_name: city,
                    district: city,
                    state: 'Uttar Pradesh'
                }
            });
        }
        const cityId = cityRecord ? cityRecord.city_id : null;
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        // Map role
        let dbRole = client_1.user_role.MIGRANT;
        if (role === 'NGO')
            dbRole = client_1.user_role.NGO;
        if (role === 'VOLUNTEER')
            dbRole = client_1.user_role.VOLUNTEER;
        // Create user and NGO profile (if role is NGO) in transaction
        const result = await db_1.prisma.$transaction(async (tx) => {
            const newUser = await tx.users.create({
                data: {
                    full_name: fullName,
                    email,
                    phone_number: phone || null,
                    password_hash: passwordHash,
                    role: dbRole,
                    city_id: cityId,
                    is_active: true,
                    is_verified: dbRole !== client_1.user_role.NGO // volunteers and migrants verified automatically, NGOs need review
                }
            });
            if (dbRole === client_1.user_role.NGO) {
                const ngo = await tx.ngos.create({
                    data: {
                        user_id: newUser.user_id,
                        ngo_name: ngoName || fullName,
                        registration_number: registrationNumber || null,
                        pan: pan ? pan.toUpperCase().trim() : null,
                        ngo_darpan_id: ngoDarpanId || null,
                        contact_person: fullName,
                        phone_number: phone || null,
                        email: email,
                        city_id: cityId || 1,
                        address: ngoAddress || city || 'Local',
                        description: ngoDescription || null,
                        verification_status: client_1.verification_status.PENDING
                    }
                });
                // Add NGO services if provided
                if (ngoServices && Array.isArray(ngoServices) && ngoServices.length > 0) {
                    await tx.ngo_services.createMany({
                        data: ngoServices.map((service) => ({
                            ngo_id: ngo.ngo_id,
                            service: service
                        })),
                        skipDuplicates: true
                    });
                }
            }
            return newUser;
        });
        res.status(201).json({
            message: 'Registration successful',
            user: {
                user_id: result.user_id,
                full_name: result.full_name,
                email: result.email,
                role: result.role,
                is_verified: result.is_verified
            }
        });
    }
    catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const user = await db_1.prisma.users.findUnique({
            where: { email },
            include: {
                ngos: {
                    include: {
                        ngo_services: true
                    }
                },
                cities: true
            }
        });
        if (!user) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        if (!user.is_active) {
            res.status(403).json({ error: 'Your account is deactivated' });
            return;
        }
        const passwordMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!passwordMatch) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            user_id: user.user_id,
            email: user.email,
            role: user.role
        }, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({
            token,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                is_verified: user.is_verified,
                phone_number: user.phone_number,
                city_id: user.city_id,
                city: user.cities,
                address: user.address,
                ngo: user.ngos
            }
        });
    }
    catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
};
exports.login = login;
/**
 * GET /api/auth/me - Get current authenticated user profile
 */
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const user = await db_1.prisma.users.findUnique({
            where: { user_id: req.user.user_id },
            include: {
                ngos: {
                    include: {
                        ngo_services: true,
                        cities: true
                    }
                },
                cities: true
            }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        if (!user.is_active) {
            res.status(403).json({ error: 'Your account is deactivated' });
            return;
        }
        res.status(200).json({
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                is_verified: user.is_verified,
                phone_number: user.phone_number,
                city_id: user.city_id,
                city: user.cities,
                address: user.address,
                profile_photo: user.profile_photo,
                created_at: user.created_at,
                ngo: user.ngos
            }
        });
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMe = getMe;
/**
 * PUT /api/auth/profile - Update current user profile
 */
const updateProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { full_name, phone_number, address, city_id } = req.body;
        // Validate phone uniqueness if updating
        if (phone_number) {
            const existingPhone = await db_1.prisma.users.findFirst({
                where: {
                    phone_number,
                    user_id: { not: req.user.user_id }
                }
            });
            if (existingPhone) {
                res.status(409).json({ error: 'Phone number already in use by another account' });
                return;
            }
        }
        const updateData = {};
        if (full_name)
            updateData.full_name = full_name;
        if (phone_number !== undefined)
            updateData.phone_number = phone_number || null;
        if (address !== undefined)
            updateData.address = address;
        if (city_id !== undefined)
            updateData.city_id = city_id;
        updateData.updated_at = new Date();
        const updatedUser = await db_1.prisma.users.update({
            where: { user_id: req.user.user_id },
            data: updateData,
            include: {
                ngos: {
                    include: { ngo_services: true, cities: true }
                },
                cities: true
            }
        });
        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                user_id: updatedUser.user_id,
                full_name: updatedUser.full_name,
                email: updatedUser.email,
                role: updatedUser.role,
                is_verified: updatedUser.is_verified,
                phone_number: updatedUser.phone_number,
                city_id: updatedUser.city_id,
                city: updatedUser.cities,
                address: updatedUser.address,
                ngo: updatedUser.ngos
            }
        });
    }
    catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateProfile = updateProfile;
