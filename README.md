# DPS - Digital Product System 🚀

**DPS** is a comprehensive product management system built on the **Canvas Driven Product Management (CaDPM)** methodology. It integrates design, development, and management into a single, unified workflow using a visual canvas approach.

## 🛠 Features
- **UI & API Canvas:** Visual mapping of interfaces and data structures.
- **Flow Designer:** Logic orchestration for product workflows.
- **Code Builder:** Rapid prototyping and code generation.
- **Project & Backlog Canvas:** Seamless transition from idea to task.
- **Mermaid Converter:** Diagram-as-code visualization.
- **API Testing:** Built-in endpoint validation.

## 🏗 Architecture
This system follows the **CDA (Canvas Driven Architecture)**. Every component in the code mirrors a visual element in the DPS ecosystem. See [`code-standardization.md`](./code-standardization.md) for details.

## 🚀 Quick Start
```bash
git clone https://github.com/DPS-Public/react_4_dps.git
cd react_4_dps
npm install
npm run dev
```

> Requires **Node.js 18+** and **npm 9+**.

## 📚 Documentation
| File | Purpose |
|------|---------|
| [LICENSE.md](./LICENSE.md) | Personal & internal business use terms |
| [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md) | Commercial resale / SaaS licensing |
| [code-standardization.md](./code-standardization.md) | CDA architecture standards |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute to DPS |
| [SUPPORT.md](./SUPPORT.md) | Getting help and support |
| [SECURITY.md](./SECURITY.md) | Reporting vulnerabilities |

## 📜 Licensing
- **Personal & Internal Business Use:** Allowed under our custom [LICENSE.md](./LICENSE.md)
- **Commercial Use (Resale / SaaS / External Client Delivery):** Requires a separate [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md)

## 🤝 Contributing
We welcome contributions that align with the CDA standards. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a pull request. Security issues must follow [SECURITY.md](./SECURITY.md) — do not open public issues for vulnerabilities.

## 🌐 Links
- Official Website: [dpsummary.com](https://dpsummary.com)
- Licensing Inquiries: [dpsummary.com/licensing](https://dpsummary.com/licensing)
- Contact: me@anarrustamov.com

## Repository Sync
Pushes to the `shared_in_public` branch in `DPS-Public/react_4_dps_pre` automatically trigger `.github/workflows/sync-public-main.yml`, which syncs that branch's files into `main` in `DPS-Public/react_4_dps`.

This workflow requires the `PUBLIC_REPO_SYNC_TOKEN` GitHub Actions secret with read access to the source repository and write access to `DPS-Public/react_4_dps`.

---

© 2026 **Anar Rustamov (DPS Alliance)**. All rights reserved.
