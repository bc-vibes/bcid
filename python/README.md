# BCID - Python Implementation

A Python implementation of the BCID (Base62 Chronological Identifier) generator. This utility generates time-orderable, base62 string identifiers with a prefix, and also supports fully random identifiers.

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

```bash
pip install -e .
```

## Usage

### As a Module

```python
from bcid import generate_identifier, generate_random_identifier, decode_identifier
from datetime import datetime

# Generate a chronological identifier with current time
id = generate_identifier('TEST', machine_id=1)  # prefix, machine_id (optional)
print(id)  # e.g., "TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4"

# Generate a chronological identifier with specific date/time
custom_id = generate_identifier('TEST', machine_id=1, user_datetime='2023-12-25T10:30:00')
print(custom_id)  # e.g., "TESTx9z8y7w6v5u4t3s2r1q0p9o8n7m6"

# Generate with datetime object
date_id = generate_identifier('TEST', machine_id=1, user_datetime=datetime(2023, 12, 25, 10, 30, 0))
print(date_id)

# Generate a fully random identifier (non-chronological)
random_id = generate_identifier('TEST', machine_id=1, is_random=True)
print(random_id)  # e.g., "TESTaazbY9x8w7v6u5t4s3r2q1p0o9n8m7l6"

# Alternative: use the dedicated random function
random_id2 = generate_random_identifier('TEST', machine_id=1)
print(random_id2)  # e.g., "TESTaam6l5k4j3h2g1f0e9d8c7b6a5z4y3"

# Decode any identifier (automatically detects type)
components = decode_identifier(id)
print(components)
# For chronological:
# {
#     'prefix': 'TEST',
#     'timestamp': 1234567890123456,
#     'machine_id': 1,
#     'random': 12345,
#     'type': 'chronological'
# }

random_components = decode_identifier(random_id)
print(random_components)
# For random:
# {
#     'prefix': 'TEST',
#     'machine_id': 1,
#     'random_part': 'zbY9x8w7v6u5t4s3r2q1p0o9n8m7l6',
#     'type': 'random'
# }
```

### Command Line

Generate a chronological identifier with current time:
```bash
python bcid.py -p TEST
# or
python bcid.py --prefix TEST
```

Generate with a specific machine ID:
```bash
python bcid.py -p TEST -m 2
# or
python bcid.py --prefix TEST --machine-id 2
```

Generate with a specific date and time:
```bash
python bcid.py -p TEST -t "2023-12-25T10:30:00"
# or
python bcid.py --prefix TEST --time "2023-12-25T10:30:00"
```

Generate a random identifier:
```bash
python bcid.py -p TEST -r
# or
python bcid.py --prefix TEST --random
```

Generate a random identifier with a specific machine ID:
```bash
python bcid.py -p TEST -m 2 -r
# or
python bcid.py --prefix TEST --machine-id 2 --random
```

Generate with all chronological options:
```bash
python bcid.py -p TEST -m 2 -t "2023-12-25T10:30:00"
```

Generate with all random options:
```bash
python bcid.py -p TEST -m 2 -r
```

Decode an identifier:
```bash
python bcid.py -d TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4
# or
python bcid.py --decode TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4
```

## API Reference

### `generate_identifier(prefix, machine_id=1, user_datetime=None, is_random=False)`

Generates either a chronological or random identifier based on the `is_random` parameter.

**Parameters:**
- `prefix` (str): 4-character prefix
- `machine_id` (int): 16-bit machine identifier (0-65535, default: 1)
- `user_datetime` (datetime|str): Custom date/time (ignored if `is_random` is True)
- `is_random` (bool): Generate random identifier if True (default: False)

**Returns:** 32-character base62 string

### `generate_random_identifier(prefix, machine_id=1)`

Generates a fully random (non-chronological) identifier.

**Parameters:**
- `prefix` (str): 4-character prefix
- `machine_id` (int): 16-bit machine identifier (0-65535, default: 1)

**Returns:** 32-character base62 string

### `decode_identifier(identifier)`

Decodes any BCID identifier and automatically detects whether it's chronological or random.

**Parameters:**
- `identifier` (str): 32-character BCID to decode

**Returns:** Dict with decoded components and `type` field indicating 'chronological' or 'random'

### Date/Time Input Formats

When specifying a custom date/time for chronological identifiers, you can use:
- ISO 8601 strings: `"2023-12-25T10:30:00"`, `"2023-12-25T10:30:00.123Z"`
- Python datetime objects: `datetime(2023, 12, 25, 10, 30, 0)`
- Common date formats: `"2023-12-25 10:30:00"`, `"2023-12-25 10:30"`, `"2023-12-25"`

**Note**: All timestamps are converted to UTC for consistency across different timezones.

## Testing

Run the test suite:
```bash
pytest
```

## Implementation Details

The Python implementation uses:
- `datetime` module for timestamp generation and parsing (**UTC timezone**)
- `os.urandom()` for cryptographically secure random components
- `argparse` for command-line argument parsing
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