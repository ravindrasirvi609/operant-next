# Diagrams

Reusable **Mermaid source** (`.mmd`) for the UMIS architecture suite. These are the canonical sources; the same diagrams are also embedded inline in the relevant documents so each doc reads standalone.

Render locally with the [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) (`mmdc -i file.mmd -o file.svg`), the Mermaid Live Editor, or any Markdown viewer with Mermaid support (GitHub renders inline fenced Mermaid, not `.mmd` files directly).

| File | Diagram | Primary document |
|---|---|---|
| [`system-context.mmd`](system-context.mmd) | High-level system context | [02_Current_Architecture.md](../02_Current_Architecture.md) |
| [`request-lifecycle.mmd`](request-lifecycle.mmd) | Mutation lifecycle (write + `router.refresh()`) | [08_Backend_Architecture.md](../08_Backend_Architecture.md) |
| [`auth-flow.mmd`](auth-flow.mmd) | Login + session + authorization resolution | [16_Security_Audit.md](../16_Security_Audit.md) |
| [`database-erd.mmd`](database-erd.mmd) | Core entity-relationship diagram | [05_Database_Architecture.md](../05_Database_Architecture.md) |
| [`workflow-state-machine.mmd`](workflow-state-machine.mmd) | Shared contributor workflow state machine | [06_API_Documentation.md](../06_API_Documentation.md) |
| [`feature-relationships.mmd`](feature-relationships.mmd) | Feature data roll-up to NAAC criteria | [04_Module_Documentation.md](../04_Module_Documentation.md) |
| [`deployment-current.mmd`](deployment-current.mmd) | Current deployment topology | [15_Deployment_Architecture.md](../15_Deployment_Architecture.md) |
| [`deployment-target.mmd`](deployment-target.mmd) | Target deployment + CI/CD | [15_Deployment_Architecture.md](../15_Deployment_Architecture.md) |
| [`future-architecture.mmd`](future-architecture.mmd) | Target enterprise architecture | [19_Future_Architecture.md](../19_Future_Architecture.md) |

Back to the [suite index](../README.md).
