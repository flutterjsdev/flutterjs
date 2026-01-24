# 🛡️ Security Policy

## 📦 Supported Versions

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| 0.0.x   | :white_check_mark: | Current development version |
| < 0.0.x | :x:                | No longer supported |

## 🐞 Reporting a Vulnerability

We take the security of FlutterJS seriously. If you have discovered a security vulnerability, we appreciate your help in disclosing it to us in a responsible manner.

> [!IMPORTANT]
> **Please DO NOT report security vulnerabilities through public GitHub issues.**

### How to Report

Please email a detailed report to **[info@flutterjs.dev](mailto:info@flutterjs.dev)**.

Include the following details:
- **Type of issue** (e.g., XSS, Injection, logical flaw)
- **Full paths** of source file(s) related to the manifestation of the issue
- **Location** of the affected source code (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept** or exploit code (if available)
- **Impact** of the issue, including how an attacker might exploit it

### Our Response Policy

1.  **Response**: We will acknowledge receipt of your report within **48 hours**.
2.  **Assessment**: We will investigate the issue and determine its impact.
3.  **Fix**: If verified, we will work on a fix and release a patch as soon as possible.
4.  **Disclosure**: We will coordinate the public disclosure of the vulnerability with you.

## 🔒 Security Best Practices

When using FlutterJS in your applications:

1.  **Secrets Management**: Never commit API keys or secrets to version control. Use environment variables.
2.  **Input Validation**: Always sanitize and validate user input to prevent injection attacks.
3.  **Dependency Updates**: Keep your dependencies up to date using `dart pub upgrade` and `npm update`.
4.  **Transport Security**: Always use HTTPS in production environments.