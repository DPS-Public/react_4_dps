# Contributing to DPS

**Thank you for your interest in contributing to DPS!**
We welcome contributions that align with the **Canvas Driven Architecture (CDA)** standards.

**Copyright:** Anar Rustamov (DPS Alliance)
**Contact:** me@anarrustamov.com

---

## 🤝 Who Can Contribute?

Anyone can contribute. By contributing, you agree that your submission may be incorporated into DPS and governed by the project's existing licensing structure.

This means:

- Personal and internal use are governed by [`LICENSE.md`](./LICENSE.md)
- Commercial use requires a separate commercial arrangement under [`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md)

---

## 📋 How to Contribute

### 1. Report Bugs
Open an issue on GitHub with the prefix `[BUG]`. Please include:

- DPS version
- Steps to reproduce the bug
- Expected behavior vs. actual behavior
- Screenshots or error logs if applicable

### 2. Suggest Features
Use the `[FEATURE]` prefix in the issues tab. Describe:

- What problem this feature solves
- How it fits into the Canvas Driven Architecture
- Any mockups, diagrams, or examples if available

### 3. Submit Code (Pull Requests)
- **Fork** the repository
- **Create a branch** using a descriptive name (see Branch Naming below)
- **Write code** following [`code-standardization.md`](./code-standardization.md)
- **Run relevant tests** before submitting
- **Commit** using the Commit Message Convention below
- **Push** to your fork
- **Open a Pull Request** against the `main` branch

---

## 🌿 Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Bug fix | `fix/short-description` | `fix/api-canvas-load` |
| New feature | `feature/short-description` | `feature/backlog-drag` |
| Documentation | `docs/short-description` | `docs/cda-standards` |
| Refactor | `refactor/short-description` | `refactor/canvas-state` |

---

## 💬 Commit Message Convention

Use a clear and consistent commit style:

```
type: short description

Examples:
feat: add drag-to-reorder in Backlog Canvas
fix: resolve API Canvas load failure on refresh
docs: update code-standardization naming section
refactor: extract canvas state to Redux slice
```

---

## ✅ Pull Request Requirements

Before submitting a PR, please ensure:

- [ ] Your code follows the CDA standards in [`code-standardization.md`](./code-standardization.md)
- [ ] You have tested your change appropriately
- [ ] Existing tests pass where relevant
- [ ] Documentation is updated if needed
- [ ] Your PR description clearly explains the change and its architectural impact

---

## ❌ What We Will Not Accept

- Code that violates the existing license terms
- Changes that break Canvas-to-Code traceability
- Contributions that introduce unnecessary architectural confusion
- Security vulnerability reports submitted as public issues — follow [`SECURITY.md`](./SECURITY.md) instead

---

## 🕐 Review Process

- PRs are reviewed by **Anar Rustamov** or the **DPS Alliance** core team
- Review timing may vary depending on workload and contribution complexity
- You may be asked to revise your submission before merge

---

## 📜 Contribution License and Rights

By submitting a contribution, you confirm that:

- You have the right to submit the code or content
- Your contribution does not knowingly infringe third-party rights
- DPS Alliance may review, modify, merge, reject, or remove the contribution at its discretion

Unless otherwise agreed in writing, the overall DPS project ownership, brand ownership, and licensing model remain with **Anar Rustamov / DPS Alliance**.

---

## 💬 Questions?

Open a GitHub Discussion or email **me@anarrustamov.com**

---

© 2026 **Anar Rustamov (DPS Alliance)**