import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { generateToken, setAuthCookie } from '@/lib/auth';

// Escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function POST(request) {
  try {
    await dbConnect();
    const { identifier } = await request.json();

    if (!identifier) {
      return NextResponse.json({ error: 'Username or email required' }, { status: 400 });
    }

    const trimmedIdentifier = identifier.trim();
    const regex = new RegExp(`^${escapeRegExp(trimmedIdentifier)}$`, 'i'); // case-insensitive exact match

    const user = await User.findOne({
      $or: [
        { username: regex },
        { email: regex },
      ],
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const token = generateToken(user._id);
    await setAuthCookie(token);

    return NextResponse.json({
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  
}
