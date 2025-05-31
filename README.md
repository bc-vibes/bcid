# BCID - Base62 Chronological Identifier

A collection of implementations for generating BCID (Base62 Chronological Identifier) in various programming languages. BCID is a utility that generates time-orderable, base62 string identifiers with a prefix.

## Features

- Generates 32-character identifiers with a 4-character prefix
- Time-orderable using timestamp-based generation
- Base62 encoded (a-zA-Z0-9) for URL-safe strings
- Includes machine ID support for distributed systems
- Includes random components for uniqueness
- Can decode identifiers back to their components

## Available Implementations

- [JavaScript Implementation](js/README.md)
- [Python Implementation](python/README.md)
- [Rust Implementation](rust/README.md)
- [C Implementation](c/README.md)
- [SQL Implementation](sql/README.md)

Each implementation follows the same specification but is optimized for its respective language and ecosystem.

## Common Specification

The identifier is composed of:
1. A 4-character prefix
2. A timestamp component (base62 encoded)
3. A machine ID component (base62 encoded)
4. A random component (base62 encoded)
5. Additional random padding to ensure the total length is 32 characters

The timestamp is in the format YYYYMMDDHHmmSSmm (year, month, day, hour, minute, second, millisecond).

## Error Handling

All implementations include validation for:
- Prefix length (must be exactly 4 characters)
- Machine ID range (must be between 0 and 65535)
- Identifier length (must be exactly 32 characters)
- Invalid encoding during decoding

## License

MIT
