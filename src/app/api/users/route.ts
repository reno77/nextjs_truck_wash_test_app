import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hash } from 'bcryptjs';
import nodemailer from 'nodemailer';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, fullName, role, password } = await req.json();
    if (!email || !fullName || !role || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);
    const user = await prisma.user.create({
      data: { email, fullName, role, passwordHash },
    });

    // Try to send email notification, but don't fail if it errors
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: 'Your Truck Wash App Account',
          text: `Hello ${fullName},\n\nYour account has been created.\nEmail: ${email}\nPassword: (the one set by manager)\nRole: ${role}\n\nPlease log in at: ${process.env.APP_URL || 'http://localhost:3000'}/login`,
        });
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Continue without failing the request
    }

    return NextResponse.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        fullName: user.fullName, 
        role: user.role 
      } 
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}