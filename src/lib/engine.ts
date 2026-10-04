import db from './db';
import { MappingProposal } from './ai';

export interface RunResult {
  runId: number;
  totalSource: number;
  transformedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  logs: any[];
}

export function executeMigration(planId: number, runType: 'dry_run' | 'execution'): RunResult {
  // 1. Get Plan
  const planStmt = db.prepare('SELECT * FROM migration_plans WHERE id = ?');
  const planRow = planStmt.get(planId) as any;
  if (!planRow) throw new Error('Plan not found');
  
  const plan = JSON.parse(planRow.mapping_json) as MappingProposal;

  // 2. Create Run Record
  const insertRun = db.prepare(`
    INSERT INTO migration_runs (plan_id, run_type, status)
    VALUES (?, ?, 'in_progress')
  `);
  const runRecord = insertRun.run(planId, runType);
  const runId = runRecord.lastInsertRowid as number;

  // 3. Prepare queries
  const getSourceData = db.prepare('SELECT * FROM source_employees');
  const insertLog = db.prepare(`
    INSERT INTO migration_logs (run_id, source_record_id, status, error_details, transformed_data_json)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const insertTarget = db.prepare(`
    INSERT INTO target_users (username, first_name, last_name, email, role, status, joined_at, migration_run_id, source_id)
    VALUES (@username, @first_name, @last_name, @email, @role, @status, @joined_at, @migration_run_id, @source_id)
  `);

  const checkDuplicate = db.prepare('SELECT id FROM target_users WHERE source_id = ?');

  // 4. Execute
  let totalSource = 0;
  let transformedCount = 0;
  let acceptedCount = 0;
  let rejectedCount = 0;
  
  const processRow = db.transaction((row: any) => {
    totalSource++;
    const targetData: any = { migration_run_id: runId, source_id: row.id };
    const errors: string[] = [];

    // Check if already migrated
    const isDup = checkDuplicate.get(row.id);
    if (isDup && runType === 'execution') {
        errors.push('Duplicate entry: Source ID already migrated.');
    } else {
        // Apply Mappings
        for (const mapping of plan.mappings) {
          const { targetField, sourceFields, transformation } = mapping;
          const srcVal = sourceFields[0] ? row[sourceFields[0]] : null;
          
          try {
            switch (transformation) {
              case 'split_name':
                if (srcVal) {
                  const parts = srcVal.split(' ');
                  if (targetField === 'first_name') targetData[targetField] = parts[0] || '';
                  if (targetField === 'last_name') targetData[targetField] = parts.slice(1).join(' ') || '';
                } else {
                   targetData[targetField] = '';
                   errors.push(`Missing value for split_name on ${targetField}`);
                }
                break;
              case 'format_date_iso':
                if (srcVal && srcVal !== 'N/A' && srcVal !== 'invalid-date') {
                   // simple validation for our mock
                   const d = new Date(srcVal);
                   if (isNaN(d.getTime())) {
                       errors.push(`Invalid date format for ${sourceFields[0]}`);
                   } else {
                       targetData[targetField] = d.toISOString();
                   }
                } else {
                   errors.push(`Invalid or missing date for ${sourceFields[0]}`);
                }
                break;
              case 'map_status':
                targetData[targetField] = srcVal === 1 ? 'ACTIVE' : 'INACTIVE';
                break;
              case 'map_role':
                if (srcVal === 'Engineering') targetData[targetField] = 'Developer';
                else if (srcVal === 'Sales') targetData[targetField] = 'Sales Rep';
                else targetData[targetField] = 'General';
                break;
              case 'generate_username':
                if (row.email_address) {
                    targetData[targetField] = row.email_address.split('@')[0];
                } else if (row.full_name) {
                    targetData[targetField] = row.full_name.replace(' ', '.').toLowerCase();
                } else {
                    errors.push('Cannot generate username, missing email and name');
                }
                break;
              case 'copy':
              default:
                if (srcVal === null || srcVal === undefined) {
                    errors.push(`Missing value for ${targetField}`);
                } else {
                    targetData[targetField] = srcVal;
                }
                break;
            }
          } catch (err: any) {
             errors.push(`Transformation error on ${targetField}: ${err.message}`);
          }
        }
    }
    
    // We expect some basic required fields for target (mock check)
    if (!targetData.username) errors.push('Missing required target field: username');
    if (!targetData.email) errors.push('Missing required target field: email');
    
    const status = errors.length > 0 ? 'rejected' : 'accepted';
    
    if (status === 'accepted') {
        transformedCount++;
        acceptedCount++;
        if (runType === 'execution') {
            try {
                insertTarget.run(targetData);
            } catch (err: any) {
                // SQLite constraint error
                errors.push(`DB Insert Error: ${err.message}`);
                acceptedCount--;
                rejectedCount++;
                insertLog.run(runId, row.id, 'rejected', JSON.stringify(errors), JSON.stringify(targetData));
                return;
            }
        }
    } else {
        rejectedCount++;
    }
    
    // Log record
    insertLog.run(runId, row.id, status, errors.length ? JSON.stringify(errors) : null, JSON.stringify(targetData));
  });

  const sourceRows = getSourceData.all();
  for (const row of sourceRows) {
      processRow(row);
  }

  // Finalize run
  db.prepare('UPDATE migration_runs SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('completed', runId);
    
  // Fetch logs for report
  const logs = db.prepare('SELECT * FROM migration_logs WHERE run_id = ?').all(runId);

  return {
      runId,
      totalSource,
      transformedCount,
      acceptedCount,
      rejectedCount,
      logs
  };
}
