import { NextResponse } from 'next/server';

export function apiSuccess(data: any, status: number = 200) {
  return NextResponse.json({
    success: true,
    data
  }, { status });
}

export function apiError(code: string, message: string, status: number = 400) {
  return NextResponse.json({
    success: false,
    error: {
      code,
      message
    }
  }, { status });
}
