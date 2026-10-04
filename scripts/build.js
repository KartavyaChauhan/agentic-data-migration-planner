const { spawnSync } = require('node:child_process');
const nextCli = require.resolve('next/dist/bin/next');

const result = spawnSync(process.execPath, [nextCli, 'build', '--webpack'], {
  env: {
    ...process.env,
    NEXT_PRIVATE_BUILD_WORKER: '1',
  },
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Unable to start Next.js build: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
