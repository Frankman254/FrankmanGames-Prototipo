import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'dist/**',
            'dist-electron/**',
            'release/**',
            'node_modules/**',
            'work/**',
            'reference_assets/**',
            'arte/**',
            'assets/**',
            'data/**',
            'docs/**',
            'scripts/blender/**',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        languageOptions: {
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
        },
        rules: {
            // El indentado y el estilo los fija Prettier (tabWidth 4).
            indent: 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            'no-empty': 'off',
            'no-empty-static-block': 'off',
            'no-useless-escape': 'off',
            'no-useless-assignment': 'off',
            'no-control-regex': 'off',
            'no-dupe-keys': 'off',
            'prefer-const': 'off',
        },
    },
    {
        files: ['**/*.{js,mjs,cjs}'],
        languageOptions: {
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                URL: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
            'no-undef': 'off',
        },
    },
);
