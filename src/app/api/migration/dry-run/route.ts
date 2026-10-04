import { NextResponse } from 'next/server';
import { executeMigration } from '@/lib/engine';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { planId } = await request.json();
    
    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    // Check if plan is approved
    const planStmt = db.prepare('SELECT status FROM migration_plans WHERE id = ?');
    const planRow = planStmt.get(planId) as any;
    if (!planRow) {
       return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    
    // We allow dry run on draft plans too for testing, but let's log it.
    
    const result = executeMigration(planId, 'dry_run');
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
