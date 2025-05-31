# BCID - Rust Implementation

A Rust implementation of the BCID (Base62 Chronological Identifier) generator. This utility generates time-orderable, base62 string identifiers with a prefix, and also supports fully random identifiers.

## Features

- Generates 32-character identifiers with a 4-character prefix
- **Time-orderable using timestamp-based generation** (chronological mode)
- **Fully random identifiers** (non-chronological mode) - preserves machine ID but randomizes everything else
- Base62 encoded (a-zA-Z0-9) for URL-safe strings
- Includes machine ID support for distributed systems
- Includes random components for uniqueness
- Can decode identifiers back to their components
- Supports user-supplied date/time for custom timestamp generation
- Automatic detection of identifier type during decoding

## Installation

Add to your `Cargo.toml`:
```toml
[dependencies]
bcid = { path = "." }
```

## Usage

### As a Library

```rust
use bcid::{generate_identifier, generate_random_identifier, decode_identifier};

// Generate a chronological identifier with current time
let id = generate_identifier("TEST", Some(1), None, false); // prefix, machine_id, user_datetime, is_random
println!("{}", id); // e.g., "TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4"

// Generate a chronological identifier with specific date/time
let custom_id = generate_identifier("TEST", Some(1), Some("2023-12-25T10:30:00"), false);
println!("{}", custom_id); // e.g., "TESTx9z8y7w6v5u4t3s2r1q0p9o8n7m6"

// Generate a fully random identifier (non-chronological)
let random_id = generate_identifier("TEST", Some(1), None, true);
println!("{}", random_id); // e.g., "TESTaazbY9x8w7v6u5t4s3r2q1p0o9n8m7l6"

// Alternative: use the dedicated random function
let random_id2 = generate_random_identifier("TEST", 1);
println!("{}", random_id2); // e.g., "TESTaam6l5k4j3h2g1f0e9d8c7b6a5z4y3"

// Decode any identifier (automatically detects type)
let components = decode_identifier(&id).unwrap();
println!("{:?}", components);
// For chronological:
// Components {
//     prefix: "TEST",
//     timestamp: Some(1234567890123456),
//     machine_id: 1,
//     random: Some(12345),
//     random_part: None,
//     type: "chronological"
// }

let random_components = decode_identifier(&random_id).unwrap();
println!("{:?}", random_components);
// For random:
// Components {
//     prefix: "TEST",
//     timestamp: None,
//     machine_id: 1,
//     random: None,
//     random_part: Some("zbY9x8w7v6u5t4s3r2q1p0o9n8m7l6"),
//     type: "random"
// }
```

### Command Line

Generate a chronological identifier with current time:
```bash
cargo run -- -p TEST
```

Generate with a specific machine ID:
```bash
cargo run -- -p TEST -m 2
```

Generate with a specific date and time:
```bash
cargo run -- -p TEST -t "2023-12-25T10:30:00"
```

Generate a random identifier:
```bash
cargo run -- -p TEST -r
```

Generate a random identifier with a specific machine ID:
```bash
cargo run -- -p TEST -m 2 -r
```

Generate with all chronological options:
```bash
cargo run -- -p TEST -m 2 -t "2023-12-25T10:30:00"
```

Generate with all random options:
```bash
cargo run -- -p TEST -m 2 -r
```

Decode an identifier:
```bash
cargo run -- -d TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4
```

## API Reference

### `generate_identifier(prefix: &str, machine_id: u16, user_datetime: Option<&str>, is_random: bool)`

Generates either a chronological or random identifier based on the `is_random` parameter.

**Parameters:**
- `prefix`: 4-character prefix
- `machine_id`: 16-bit machine identifier (0-65535)
- `user_datetime`: Custom date/time (ignored if `is_random` is true)
- `is_random`: Generate random identifier if true

**Returns:** 32-character base62 string

### `generate_random_identifier(prefix: &str, machine_id: u16)`

Generates a fully random (non-chronological) identifier.

**Parameters:**
- `prefix`: 4-character prefix
- `machine_id`: 16-bit machine identifier (0-65535)

**Returns:** 32-character base62 string

### `decode_identifier(identifier: &str)`

Decodes any BCID identifier and automatically detects whether it's chronological or random.

**Parameters:**
- `identifier`: 32-character BCID to decode

**Returns:** Result with decoded components and `type` field indicating 'chronological' or 'random'

### Date/Time Input Formats

When specifying a custom date/time for chronological identifiers, you can use:
- ISO 8601 format: `"2023-12-25T10:30:00"`
- Space-separated format: `"2023-12-25 10:30:00"`
- Date only (defaults to 00:00:00): `"2023-12-25"`

**Note**: All timestamps are converted to UTC for consistency across different timezones.

## Testing

Run the test suite:
```bash
cargo test
```

## Implementation Details

The Rust implementation uses:
- `std::time::SystemTime` for timestamp generation
- `chrono` crate for date/time parsing and formatting (UTC timezone)
- `rand` crate for cryptographically secure random components
- Native command-line argument parsing
- UTF-8 encoding/decoding for string handling
- Comprehensive error handling and validation

### Identifier Structure

#### Chronological Identifiers
1. A 4-character prefix
2. A timestamp component (base62 encoded, **UTC timezone**)
3. A machine ID component (base62 encoded)
4. A random component (base62 encoded)
5. Additional random padding to ensure the total length is 32 characters

#### Random Identifiers
1. A 4-character prefix
2. A machine ID component (base62 encoded, fixed 3-character length)
3. Fully random data for the remaining characters

## License

MIT 