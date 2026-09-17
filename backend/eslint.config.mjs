import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['Repositories/**/*.ts'],
    ignores: ['Repositories/tenant-scoped.repository.ts', 'Repositories/tenant.repository.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='createQueryBuilder']",
          message:
            'Build queries through TenantScopedRepository.scopedTo()/scopedQuery() only (04-architecture.md R7).',
        },
      ],
    },
  },
  {
    files: ['Services/**/*.ts', 'Controllers/**/*.ts', 'Models/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='HttpException']",
          message:
            'Throw a DomainException subclass from Models/domain-errors.ts so 05-api.md §9 stays single-sourced.',
        },
      ],
    },
  },
);
