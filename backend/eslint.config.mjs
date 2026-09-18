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
    files: ['repositories/**/*.ts'],
    ignores: [
      'repositories/tenant-scoped.repository.ts',
      'repositories/tenants/tenant.repository.ts',
      'repositories/cross-tenant-lookup.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='createQueryBuilder']",
          message:
            'Build queries through TenantScopedRepository.scopedTo()/scopedQuery(), or the explicit CrossTenantLookup collaborator, only (03-architecture.md R7).',
        },
      ],
    },
  },
  {
    files: ['services/**/*.ts', 'controllers/**/*.ts', 'models/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='HttpException']",
          message:
            'Throw a DomainException subclass from models/domain-errors.ts so 05-api.md §9 stays single-sourced.',
        },
      ],
    },
  },
);
