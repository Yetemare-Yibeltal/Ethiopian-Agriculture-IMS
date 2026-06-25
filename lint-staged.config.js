module.exports = {
  'frontend/src/**/*.{ts,tsx}': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
  ],
  'backend/src/**/*.{ts}': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
  ],
  '**/*.json': ['prettier --write'],
  '**/*.css': ['prettier --write'],
  '**/*.md': ['prettier --write'],
  '**/*.{yml,yaml}': ['prettier --write'],
  '**/*.prisma': ['prettier --write'],
};
