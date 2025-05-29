import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }
    const data = await req.json();
    const user = await prisma.user.update({
      where: { id },
      data,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error in PUT /api/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }

    const user = await prisma.user.delete({
      where: { id: id },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Error && (error as any).code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.error('Error in DELETE /api/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}