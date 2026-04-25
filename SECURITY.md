# Security Policy

**Copyright © 2026 Anar Rustamov (DPS Alliance)**
**Contact:** me@anarrustamov.com

---

## 🔒 Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in DPS:

### ⚠️ DO NOT
- Do **not** open a public GitHub issue
- Do **not** post the details in Discussions or public forums
- Do **not** disclose the issue publicly before a fix or assessment is completed

### ✅ DO
Please report the issue privately by email:

**me@anarrustamov.com**

Suggested subject line:

`[SECURITY] Brief description of the issue`

Please include:

- Affected version(s), if known
- Steps to reproduce
- Potential impact
- Proof of concept, if safe and available
- Suggested mitigation or fix, if any

PGP or other encrypted reporting methods may be arranged upon request.

---

## 📅 What to Expect After Reporting

DPS Alliance will make a reasonable effort to:

- Acknowledge receipt of your report
- Investigate the issue
- Assess severity and scope
- Determine remediation steps
- Coordinate disclosure where appropriate

Response and remediation timelines depend on severity, complexity, and project capacity. We aim to acknowledge all reports within **72 hours**.

---

## 🔍 Scope

| In Scope | Out of Scope |
|---|---|
| Authentication & authorization flaws | Issues in third-party dependencies |
| Data exposure or privacy issues | Theoretical vulnerabilities without proof |
| XSS, CSRF, injection vulnerabilities | UI/UX bugs with no security impact |
| Insecure API endpoints | Spam or social engineering attempts |
| Hardcoded secrets or exposed credentials | Issues in user-modified deployments |

For third-party dependency vulnerabilities, please report directly to the relevant dependency maintainer.

---

## 🏆 Acknowledgements

We appreciate responsible disclosure. With your permission, we may acknowledge your contribution in future DPS security notes or release acknowledgements.

At this time, no public bug bounty program is promised unless explicitly announced by DPS Alliance.

---

## 🔐 Supported Versions

Security support focus is generally directed toward the current maintained release line.

Older, beta, preview, experimental, or significantly outdated versions may not receive fixes.

---

## 🛡️ Security Practices

DPS aims to follow good security practices, including where applicable:

- Dependency review and auditing
- Avoiding hardcoded secrets in public repositories
- Secure handling of configuration and environment variables
- Validation of external inputs

These practices are goals and operational standards, not a warranty of absolute security.

---

## 🔗 Related Documents

- [SUPPORT.md](./SUPPORT.md) – For non-security issues
- [LICENSE.md](./LICENSE.md) – Usage terms
- [README.md](./README.md) – Project overview

---

*Last updated: April 2026*
© 2026 **Anar Rustamov (DPS Alliance)**