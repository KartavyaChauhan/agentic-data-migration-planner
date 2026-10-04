import { NextResponse } from 'next/server';
import { executeMigration } from '@/lib/engine';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { planId } = await request.json();
    
    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    // Must be approved to execute
    const planStmt = db.prepare('SELECT status FROM migration_plans WHERE id = ?');
    const planRow = planStmt.get(planId) as any;
    if (!planRow || planRow.status !== 'approved') {
       return NextResponse.json({ error: 'Plan must be approved before execution' }, { status: 400 });
    }
    
    const result = executeMigration(planId, 'execution');
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
