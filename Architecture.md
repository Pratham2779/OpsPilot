=========================================================================
             SECURE ReAct TERMINAL AGENT ARCHITECTURE (V2)
=========================================================================

 [ User Request ] ──────┐
                        ▼
 ┌───────────────────────────────────────────────────────────────┐
 │                   MEMORY / CONTEXT WINDOW                    │
 │  System Prompt + User Goal + Feedback + Outputs (TRUNCATED)   │◄───────┐
 └───────────────────────────────────────────────────────────────┘        │
        │                                                                 │
        ▼ (Token-Safe Context)                                            │
 ┌───────────────────────────────────────────────────────────────┐        │
 │                          LLM ENGINE                           │        │
 │                   (Groq / llama3-70b-8192)                    │        │
 └───────────────────────────────────────────────────────────────┘        │
        │                                                                 │
        ├─────────────────────────────┐                                   │
        │                             │                                   │
 (No Tools Requested            (Tool Requested)                          │
  OR LoopCount > MAX)                 │                                   │
        │                             ▼                                   │
        │               ┌──────────────────────────────┐                  │
        ▼               │ TOOL DISPATCHER (Sequential) │                  │
 ┌─────────────┐        │ *Breaks inner loop on error  │                  │
 │ END SESSION │        │  to allow LLM to reassess    │                  │
 │ (Print Msg) │        └──────────────────────────────┘                  │
 └─────────────┘                │              │                          │
                                │              │                          │
            ┌───────────────────┘              └─────────────┐            │
            ▼                                                ▼            │
 ┌─────────────────────┐                         ┌───────────────────────┐│
 │     search.js       │                         │      executeCMD       ││
 │    (Web Search)     │                         └───────────────────────┘│
 └─────────────────────┘                                     │            │
            │                                                ▼            │
            │                                    ┌───────────────────────┐│
            │                                    │ commandRiskClassifier ││
            │                                    │ (Intent-Based RBAC)   ││
            │                                    └───────────────────────┘│
            │                                                │            │
            │                                           (Risk > Low?)     │
            │                                           /           \     │
            │                                       [YES]           [NO]  │
            │                                         │               │   │
            │                                         ▼               │   │
            │                                ┌─────────────────┐      │   │
            │                                │ Human-in-Loop   │      │   │
            │                                │ (SSH Keepalive) │      │   │
            │                                └─────────────────┘      │   │
            │                                   │ (Approve/Deny)      │   │
            │                                   ▼                     │   │
            │                                ┌─────────────────┐      │   │
            │                                │     ssh.js      │◄─────┘   │
            │                                │ (Remote Server) │          │
            │                                └─────────────────┘          │
            │                                         │                   │
            ▼                                         ▼                   │
 ┌───────────────────────────────────────────────────────────────┐        │
 │                 CONTEXT PAYLOAD GENERATOR                     │        │
 │ * Packages Stdout/Stderr, Status, and Human Feedback          │        │
 │ * ENFORCES 2000-TOKEN TRUNCATION TO PREVENT API OVERFLOW      │        │
 └───────────────────────────────────────────────────────────────┘        │
        │                                                                 │
        └─────────────────────────────────────────────────────────────────┘
                                 (Appends to Memory & Increments Loop)