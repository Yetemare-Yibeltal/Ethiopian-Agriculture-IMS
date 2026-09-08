import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiResponse } from '../lib/ApiResponse';
import { ApiError } from '../lib/ApiError';
import prisma from '../lib/db';
import bcrypt from 'bcrypt';
import type { Request } from 'express';

export const userRouter = Router();

userRouter.get('/', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req: Request, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = parseInt(req.query.perPage as string) || 20;
  const search = req.query.search as string;
  const role = req.query.role as string;
  const where: Record<string, unknown> = {};
  if (search) { where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }]; }
  if (role) where.role = role;
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: { id: true, name: true, email: true, role: true, language: true, isActive: true, lastLoginAt: true, createdAt: true, organization: { select: { id: true, name: true, type: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
    prisma.user.count({ where }),
  ]);
  return res.json({ success: true, data: users, pagination: { total, page, perPage, pageCount: Math.ceil(total / perPage) } });
}));

userRouter.get('/:id', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req: Request, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, name: true, email: true, role: true, language: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true, organization: { select: { id: true, name: true, type: true } } } });
  return res.json({ success: true, data: user });
}));

userRouter.post('/', authenticate, authorize(['SUPER_ADMIN']), asyncHandler(async (req: Request, res) => {
  const { name, email, password, role, orgId, language } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, 'Email already exists');
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, email: email.toLowerCase(), password: hashedPassword, role, orgId: orgId || null, language: language || 'en' }, select: { id: true, name: true, email: true, role: true, language: true, isActive: true, createdAt: true, organization: { select: { id: true, name: true, type: true } } } });
  return res.status(201).json({ success: true, data: user, message: 'User created successfully' });
}));

userRouter.patch('/:id', authenticate, authorize(['SUPER_ADMIN']), asyncHandler(async (req: Request, res) => {
  const { name, role, orgId, language, isActive } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  const updated = await prisma.user.update({ where: { id: req.params.id }, data: { ...(name && { name }), ...(role && { role }), ...(orgId !== undefined && { orgId: orgId || null }), ...(language && { language }), ...(isActive !== undefined && { isActive }) }, select: { id: true, name: true, email: true, role: true, language: true, isActive: true, updatedAt: true, organization: { select: { id: true, name: true, type: true } } } });
  return res.json({ success: true, data: updated, message: 'User updated successfully' });
}));

userRouter.patch('/:id/reset-password', authenticate, authorize(['SUPER_ADMIN']), asyncHandler(async (req: Request, res) => {
  const { newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.params.id }, data: { password: hashedPassword } });
  return res.json({ success: true, data: null, message: 'Password reset successfully' });
}));

userRouter.delete('/:id', authenticate, authorize(['SUPER_ADMIN']), asyncHandler(async (req: Request, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  const authReq = req as Request & { user?: { id: string } };
  if (user.id === authReq.user?.id) throw new ApiError(400, 'You cannot delete your own account');
  await prisma.user.delete({ where: { id: req.params.id } });
  return res.json({ success: true, data: null, message: 'User deleted successfully' });
}));
