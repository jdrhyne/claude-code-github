# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of claude-code-github seriously. If you have discovered a security vulnerability, we appreciate your help in disclosing it to us responsibly.

### How to Report

Please **DO NOT** report security vulnerabilities through public GitHub issues.

Instead, please report them via email to: security@claude-code-github.dev

You can also report security vulnerabilities directly through GitHub's security advisory feature:
1. Go to the Security tab of this repository
2. Click on "Report a vulnerability"
3. Fill out the form with details about the vulnerability

### What to Include

Please include the following information in your report:
- Type of vulnerability (e.g., remote code execution, privilege escalation, etc.)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will provide a more detailed response within 7 days
- We will work on fixing the vulnerability and coordinate with you on the disclosure timeline

### Disclosure Policy

- We will work with you to understand and fix the vulnerability
- We will credit you for the discovery (unless you prefer to remain anonymous)
- We will publish a security advisory once the issue is resolved

## Security Best Practices for Users

To ensure the security of your development environment when using claude-code-github:

1. **GitHub Token Security**
   - Always use Personal Access Tokens with minimal required scopes (`repo` and `workflow`)
   - Regularly rotate your tokens
   - Never commit tokens to version control

2. **Configuration Security**
   - Keep your configuration files secure
   - Use absolute paths in project configurations
   - Regularly review your project access permissions

3. **Protected Branches**
   - Always configure protected branches to prevent accidental commits to main/production branches
   - Review the default protected branches list and adjust as needed

4. **Code Review**
   - Always review the changes suggested by the AI before committing
   - Verify pull requests before merging
   - Use draft pull requests for work in progress

## Dependencies

We regularly update our dependencies to incorporate security fixes. You can check for outdated dependencies by running:

```bash
npm audit
```

To fix vulnerabilities automatically:

```bash
npm audit fix
```

## Contact

For any security-related questions that don't involve reporting a vulnerability, please open a discussion in the GitHub repository.