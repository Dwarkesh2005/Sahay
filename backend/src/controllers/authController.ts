import { Request, Response } from 'express';
import { user_role, verification_status } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_nature_secret_key_2026';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      role,
      fullName,
      email,
      phone,
      password,
      city,
      ngoName,
      registrationNumber,
      ngoDarpanId
    } = req.body;

    // Check email uniqueness
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // Check phone uniqueness if provided
    if (phone) {
      const existingPhone = await prisma.users.findUnique({
        where: { phone_number: phone }
      });
      if (existingPhone) {
        res.status(400).json({ error: 'User with this phone number already exists' });
        return;
      }
    }

    // Resolve city_id (create city with default properties if not exists)
    let cityRecord = await prisma.cities.findFirst({
      where: {
        city_name: {
          equals: city,
          mode: 'insensitive'
        }
      }
    });

    if (!cityRecord && city) {
      cityRecord = await prisma.cities.create({
        data: {
          city_name: city,
          district: city,
          state: 'Uttar Pradesh'
        }
      });
    }

    const cityId = cityRecord ? cityRecord.city_id : null;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Map role
    let dbRole: user_role = user_role.MIGRANT;
    if (role === 'NGO') dbRole = user_role.NGO;
    if (role === 'VOLUNTEER') dbRole = user_role.VOLUNTEER;

    // Create user and NGO profile (if role is NGO) in transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.users.create({
        data: {
          full_name: fullName,
          email,
          phone_number: phone || null,
          password_hash: passwordHash,
          role: dbRole,
          city_id: cityId,
          is_active: true,
          is_verified: dbRole !== user_role.NGO // volunteers and migrants verified automatically, NGOs need review
        }
      });

      if (dbRole === user_role.NGO) {
        await tx.ngos.create({
          data: {
            user_id: newUser.user_id,
            ngo_name: ngoName || fullName,
            registration_number: registrationNumber || null,
            ngo_darpan_id: ngoDarpanId || null,
            contact_person: fullName,
            phone_number: phone || null,
            email: email,
            city_id: cityId || 1,
            address: city || 'Local',
            verification_status: verification_status.PENDING
          }
        });
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
  } catch (error: any) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'Your account is deactivated' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified
      }
    });
  } catch (error: any) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};
