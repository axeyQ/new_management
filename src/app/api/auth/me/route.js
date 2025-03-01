import { NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';

const handler = async (request) => {
  // The user data will be attached by the authMiddleware
  const user = request.user;
  
  return NextResponse.json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
      status: user.status
    }
  });
};

export const GET = authMiddleware(handler);