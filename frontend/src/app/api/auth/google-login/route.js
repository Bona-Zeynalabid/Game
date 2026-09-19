import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { generateToken, setAuthCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    const { credential } = await request.json();
    if (!credential) {
      return NextResponse.json({ error: 'Credential missing' }, { status: 400 });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const displayName = payload.name || '';
    const avatar = payload.picture || '';

    await dbConnect();

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      const username = email.split('@')[0] || `user_${googleId}`;
      user = await User.create({
        googleId,
        email,
        username,
        displayName,
        avatar,
      });
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = user.avatar || avatar;
        user.displayName = user.displayName || displayName;
        await user.save();
      }
    }

    const token = generateToken(user._id);
    await setAuthCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google login error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}