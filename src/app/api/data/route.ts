import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const sourceCountStmt = db.prepare('SELECT COUNT(*) as c FROM source_employees');
    const sourceCount = (sourceCountStmt.get() as any).c;

    const targetCountStmt = db.prepare('SELECT COUNT(*) as c FROM target_users');
    const targetCount = (targetCountStmt.get() as any).c;

    return NextResponse.json({ sourceCount, targetCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
