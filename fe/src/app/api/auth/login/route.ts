import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// In a real application, you would store this in an environment variable
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'default-secret-key';

// Hardcoded credentials for a single user
// In a real application, you would use a database and proper password hashing
const VALID_USERNAME = process.env.NEXT_PUBLIC_VALID_USERNAME || 'admin';
const VALID_PASSWORD = process.env.NEXT_PUBLIC_VALID_PASSWORD || 'tradingbot123';

export async function POST(request: NextRequest) {
  try {
    console.log('Login API called');
    console.log('Expected credentials from env:', { 
      username: VALID_USERNAME,
      password_length: VALID_PASSWORD ? VALID_PASSWORD.length : 0,
      jwt_secret: JWT_SECRET
    });
    
    const body = await request.json();
    const { username, password } = body;
    console.log('Login attempt:', { 
      username,
      password_length: password ? password.length : 0,
      matches_username: username === VALID_USERNAME,
      matches_password: password === VALID_PASSWORD
    });

    // Validate credentials
    if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
      console.log('Invalid credentials');
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    console.log('Credentials valid, generating token');
    // Create a JWT token
    const token = jwt.sign(
      { 
        username,
        // Add any additional user data you want to include in the token
        role: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '24h' } // Token expires in 24 hours
    );

    console.log('Token generated successfully');
    // Return the token
    return NextResponse.json({ 
      success: true, 
      token,
      message: 'Login successful',
      redirectUrl: '/' // Include the redirect URL in the response
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
