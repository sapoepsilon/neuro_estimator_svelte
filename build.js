import { execSync } from 'child_process';

try {
  // Run the build command with the --no-warnings flag
  execSync('npx vite build --no-warnings', { stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed with error:', error.message);
  process.exit(1);
}

