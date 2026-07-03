// Stable test env vars so crypto/token helpers work deterministically.
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ??
  "9f4c2e8a1b7d6f3e5a0c9b8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f";
