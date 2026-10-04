export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export const sourceSchema: SchemaField[] = [
  { name: 'legacy_id', type: 'string', required: true, description: 'Unique identifier from the legacy system' },
  { name: 'full_name', type: 'string', required: true, description: 'First and last name combined' },
  { name: 'date_of_birth', type: 'string', required: false, description: 'Date of birth in YYYY-MM-DD format' },
  { name: 'department', type: 'string', required: false, description: 'Department name' },
  { name: 'hire_date', type: 'string', required: false, description: 'Date the employee was hired' },
  { name: 'is_active', type: 'boolean/number', required: true, description: '1 if active, 0 if inactive' },
  { name: 'email_address', type: 'string', required: false, description: 'Legacy email address' }
];

export const targetSchema: SchemaField[] = [
  { name: 'username', type: 'string', required: true, description: 'Unique username, ideally generated from email or name' },
  { name: 'first_name', type: 'string', required: true, description: 'First name extracted from full name' },
  { name: 'last_name', type: 'string', required: true, description: 'Last name extracted from full name' },
  { name: 'email', type: 'string', required: true, description: 'Valid email address' },
  { name: 'role', type: 'string', required: true, description: 'User role, e.g., derived from department' },
  { name: 'status', type: 'string', required: true, description: '"ACTIVE" or "INACTIVE"' },
  { name: 'joined_at', type: 'string', required: true, description: 'ISO 8601 Date string for when they joined' }
];

export const supportedTransformations = [
  'split_name: Splits a full name into first and last name',
  'format_date_iso: Converts a date string to ISO 8601 format',
  'map_status: Converts 1/0 to ACTIVE/INACTIVE',
  'map_role: Maps department names to system roles (e.g., Engineering -> Developer, Sales -> Sales Rep, others -> General)',
  'generate_username: Creates a username from email or name',
  'copy: Copies the value directly if types match'
];
