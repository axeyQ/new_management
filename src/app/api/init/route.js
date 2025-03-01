import { NextResponse } from 'next/server';
import { initAdminUser } from '@/lib/initAdminUser';

export async function GET() {
  try {
    await initAdminUser();
    return NextResponse.json({ 
      success: true, 
      message: 'Initialization completed' 
    });
  } catch (error) {
    console.error('Initialization error:', error);
    return NextResponse.json(
      { success: false, message: 'Initialization failed' },
      { status: 500 }
    );
  }
}