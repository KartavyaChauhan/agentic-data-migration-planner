import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const runsStmt = db.prepare('SELECT * FROM migration_runs ORDER BY started_at DESC LIMIT 50');
    const runs = runsStmt.all();

    // Attach target counts to executions
    const countsStmt = db.prepare('SELECT COUNT(*) as c FROM target_users WHERE migration_run_id = ?');

    const history = runs.map((run: any) => {
       const counts = run.run_type === 'execution' && run.status === 'completed' 
           ? (countsStmt.get(run.id) as any).c 
           : 0;
       return { ...run, target_inserted_count: counts };
    });

    return NextResponse.json(history);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
