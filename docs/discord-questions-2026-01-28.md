# Discord Follow-Up Questions — January 28, 2026

## Context

8-hour hackathon attempt to deploy a 24-line Proof of Authorship contract to Midnight Preview. Everything worked (compile, wallet connect, providers) except the final deployment step due to runtime version mismatch.

## Question 1: Browser Deployment Version Matrix

> I got a Proof of Authorship contract compiled (toolchain 0.26.0), Lace wallet connected, and all providers configured on Preview. Deployment fails with `expected instance of _ChargedState` because toolchain 0.26.0 produces contracts for compact-runtime 0.9.0 (CJS), but browser/Vite requires 0.11.0-rc.1 (ESM) which has breaking API changes. **What is the correct set of package versions for deploying a compiled contract to Preview from a browser today?**

## Question 2: CLI Fallback

> **Alternatively, is there a working CLI deployment path using a standalone wallet seed (no Lace) on Preview?**

## Status

- [ ] Question 1 asked
- [ ] Question 1 answered
- [ ] Question 2 asked
- [ ] Question 2 answered
