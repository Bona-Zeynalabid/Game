import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { generateToken, setAuthCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    await dbConnect();
    const { username, email } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, ...(email ? [{ email }] : [])] });
    if (existingUser) {
      return NextResponse.json({ error: 'Username or email already taken' }, { status: 409 });
    }

    // Create user
    const user = await User.create({
      username,
      email: email || undefined,
      displayName: username,
    });

    const token = generateToken(user._id);
    await setAuthCookie(token);

    return NextResponse.json({ user: { id: user._id, username: user.username, email: user.email } }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}