import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateMappingProposal } from '@/lib/ai';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const generate = url.searchParams.get('generate');

  if (generate === 'true') {
    try {
      // Get 3 sample records
      const sampleStmt = db.prepare('SELECT * FROM source_employees LIMIT 3');
      const samples = sampleStmt.all();

      // Call AI to generate proposal
      const proposal = await generateMappingProposal(samples);

      // Save as draft plan
      const insertPlan = db.prepare(`
        INSERT INTO migration_plans (version, mapping_json, status)
        VALUES (?, ?, 'draft')
      `);

      // Determine next version
      const maxVersionStmt = db.prepare('SELECT MAX(version) as maxV FROM migration_plans');
      const maxVersionResult = maxVersionStmt.get() as { maxV: number | null };
      const nextVersion = (maxVersionResult.maxV || 0) + 1;

      const result = insertPlan.run(nextVersion, JSON.stringify(proposal));

      return NextResponse.json({ id: result.lastInsertRowid, version: nextVersion, plan: proposal, status: 'draft' });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Unable to generate migration plan';
      const isInvalidApiKey = message.includes('API_KEY_INVALID');

      return NextResponse.json(
        {
          error: isInvalidApiKey
            ? 'The Gemini API key is invalid or expired. Update GEMINI_API_KEY in .env.local and restart the dev server.'
            : message
        },
        { status: isInvalidApiKey ? 502 : 500 }
      );
    }
  } else {
    // Return latest plan
    const latestPlanStmt = db.prepare('SELECT * FROM migration_plans ORDER BY id DESC LIMIT 1');
    const latestPlan = latestPlanStmt.get() as any;

    if (!latestPlan) {
      return NextResponse.json({ message: 'No plans found' }, { status: 404 });
    }

    return NextResponse.json({
      id: latestPlan.id,
      version: latestPlan.version,
      plan: JSON.parse(latestPlan.mapping_json),
      status: latestPlan.status,
      created_at: latestPlan.created_at,
      approved_at: latestPlan.approved_at
    });
  }
}

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
       return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    const updatePlan = db.prepare(`
      UPDATE migration_plans 
      SET status = 'approved', approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = updatePlan.run(id);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Plan approved' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
