# BCID - C Implementation

A C implementation of the BCID (Base62 Chronological Identifier) generator. This utility generates time-orderable, base62 string identifiers with a prefix, and also supports fully random identifiers.

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

## Building

```bash
make
```

This will create the `bcid` executable.

## Usage

### As a Library

```c
#include "bcid.h"

// Generate a chronological identifier with current time
char id[33];  // 32 chars + null terminator
generate_identifier("TEST", 1, NULL, 0, id);  // prefix, machine_id, user_time, is_random, output buffer
printf("%s\n", id);  // e.g., "TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4"

// Generate a chronological identifier with specific date/time
char custom_id[33];
generate_identifier("TEST", 1, "2023-12-25T10:30:00", 0, custom_id);
printf("%s\n", custom_id);  // e.g., "TESTx9z8y7w6v5u4t3s2r1q0p9o8n7m6"

// Generate a fully random identifier (non-chronological)
char random_id[33];
generate_identifier("TEST", 1, NULL, 1, random_id);
printf("%s\n", random_id);  // e.g., "TESTaazbY9x8w7v6u5t4s3r2q1p0o9n8m7l6"

// Alternative: use the dedicated random function
char random_id2[33];
generate_random_identifier("TEST", 1, random_id2);
printf("%s\n", random_id2);  // e.g., "TESTaam6l5k4j3h2g1f0e9d8c7b6a5z4y3"

// Decode any identifier (automatically detects type)
uint64_t timestamp;
uint16_t machine_id, random;
char random_part[29];
char type[16];
decode_identifier(id, &timestamp, &machine_id, &random, random_part, type);

printf("Prefix: %.4s\n", id);
printf("Type: %s\n", type);
printf("Machine ID: %u\n", machine_id);

if (strcmp(type, "chronological") == 0) {
    printf("Timestamp: %llu\n", timestamp);
    printf("Random Value: %u\n", random);
} else {
    printf("Random Part: %s\n", random_part);
}
```

### Command Line

Generate a chronological identifier with current time:
```bash
./bcid -p TEST
```

Generate with a specific machine ID:
```bash
./bcid -p TEST -m 2
```

Generate with a specific date and time:
```bash
./bcid -p TEST -t "2023-12-25T10:30:00"
```

Generate a random identifier:
```bash
./bcid -p TEST -r
```

Generate a random identifier with a specific machine ID:
```bash
./bcid -p TEST -m 2 -r
```

Generate with all chronological options:
```bash
./bcid -p TEST -m 2 -t "2023-12-25T10:30:00"
```

Generate with all random options:
```bash
./bcid -p TEST -m 2 -r
```

Decode an identifier:
```bash
./bcid -d TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4
```

## API Reference

### `generate_identifier(prefix, machine_id, user_time, is_random, result)`

Generates either a chronological or random identifier based on the `is_random` parameter.

**Parameters:**
- `prefix`: 4-character prefix
- `machine_id`: 16-bit machine identifier (0-65535)
- `user_time`: Custom date/time string (ignored if `is_random` is 1)
- `is_random`: Generate random identifier if 1
- `result`: Output buffer (must be at least 33 characters)

### `generate_random_identifier(prefix, machine_id, result)`

Generates a fully random (non-chronological) identifier.

**Parameters:**
- `prefix`: 4-character prefix
- `machine_id`: 16-bit machine identifier (0-65535)
- `result`: Output buffer (must be at least 33 characters)

### `decode_identifier(identifier, timestamp, machine_id, random, random_part, type)`

Decodes any BCID identifier and automatically detects whether it's chronological or random.

**Parameters:**
- `identifier`: 32-character BCID to decode
- `timestamp`: Pointer to store timestamp (chronological only)
- `machine_id`: Pointer to store machine ID
- `random`: Pointer to store random value (chronological only)
- `random_part`: Buffer to store random part (random identifiers only, at least 29 chars)
- `type`: Buffer to store identifier type (at least 16 chars)

### Date/Time Input Formats

When specifying a custom date/time for chronological identifiers, you can use:
- ISO 8601 format: `"2023-12-25T10:30:00"`
- Space-separated format: `"2023-12-25 10:30:00"`
- Date only (defaults to 00:00:00): `"2023-12-25"`

**Note**: All timestamps are converted to UTC for consistency across different timezones.

## Testing

Run the test suite:
```bash
make test
```

## Implementation Details

The C implementation uses:
- `time()` and `mktime()` for timestamp generation and parsing (**UTC timezone**)
- `/dev/urandom` for cryptographically secure random components (with fallback to `rand()`)
- `getopt()` for command-line argument parsing
- `strftime()` and `sscanf()` for date/time formatting and parsing
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