import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { runId } = await request.json();
    
    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 });
    }

    const run = db.prepare(`
      SELECT run_type, status
      FROM migration_runs
      WHERE id = ?
    `).get(runId) as { run_type: string; status: string } | undefined;

    if (!run) {
      return NextResponse.json({ error: 'Migration run not found' }, { status: 404 });
    }

    if (run.run_type !== 'execution') {
      return NextResponse.json({ error: 'Only execution runs can be rolled back' }, { status: 400 });
    }

    if (run.status !== 'completed') {
      return NextResponse.json({ error: 'Only completed execution runs can be rolled back' }, { status: 409 });
    }

    // Begin transaction for rollback
    const executeRollback = db.transaction((id: number) => {
        // Delete inserted records
        const deleteRecords = db.prepare('DELETE FROM target_users WHERE migration_run_id = ?');
        const deleteResult = deleteRecords.run(id);

        // Update run status
        const updateRun = db.prepare("UPDATE migration_runs SET status = 'rolled_back' WHERE id = ?");
        updateRun.run(id);
        
        return deleteResult.changes;
    });

    const recordsDeleted = executeRollback(runId);

    return NextResponse.json({ success: true, message: 'Rollback successful', recordsDeleted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
