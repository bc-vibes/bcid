# BCID - Node.js Implementation

A Node.js implementation of the BCID (Base62 Chronological Identifier) generator. This utility generates time-orderable, base62 string identifiers with a prefix, and also supports fully random identifiers.

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
npm install
```

## Usage

### As a Module

```javascript
import { generateIdentifier, generateRandomIdentifier, decodeIdentifier } from './bcid.js';

// Generate a chronological identifier with current time
const id = generateIdentifier('TEST', 1); // prefix, machineId (optional)
console.log(id); // e.g., "TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4"

// Generate a chronological identifier with specific date/time
const customId = generateIdentifier('TEST', 1, '2023-12-25T10:30:00');
console.log(customId); // e.g., "TESTx9z8y7w6v5u4t3s2r1q0p9o8n7m6"

// Generate with Date object
const dateId = generateIdentifier('TEST', 1, new Date('2023-12-25T10:30:00'));
console.log(dateId);

// Generate a fully random identifier (non-chronological)
const randomId = generateIdentifier('TEST', 1, null, true);
console.log(randomId); // e.g., "TESTz9x8w7v6u5t4s3r2q1p0o9n8m7l6"

// Alternative: use the dedicated random function
const randomId2 = generateRandomIdentifier('TEST', 1);
console.log(randomId2); // e.g., "TESTm6l5k4j3h2g1f0e9d8c7b6a5z4y3"

// Decode any identifier (automatically detects type)
const components = decodeIdentifier(id);
console.log(components);
// For chronological:
// {
//   prefix: 'TEST',
//   timestamp: 1234567890123456,
//   machineId: 1,
//   random: 12345,
//   type: 'chronological'
// }

const randomComponents = decodeIdentifier(randomId);
console.log(randomComponents);
// For random:
// {
//   prefix: 'TEST',
//   machineId: 1,
//   randomPart: 'z9x8w7v6u5t4s3r2q1p0o9n8m7l6',
//   type: 'random'
// }
```

### Command Line

Generate an identifier with current time:
```bash
node bcid.js -p=TEST
# or
node bcid.js --prefix=TEST
```

Generate with a specific machine ID:
```bash
node bcid.js -p=TEST -m=2
# or
node bcid.js --prefix=TEST --machine-id=2
```

Generate with a specific date and time:
```bash
node bcid.js -p=TEST -t="2023-12-25T10:30:00"
# or
node bcid.js --prefix=TEST --time="2023-12-25T10:30:00"
```

Generate with all chronological options:
```bash
node bcid.js -p=TEST -m=2 -t="2023-12-25T10:30:00"
```

Generate with all random options:
```bash
node bcid.js -p=TEST -m=2 -r
```

Generate a random identifier:
```bash
node bcid.js -p=TEST -r
# or
node bcid.js --prefix=TEST --random
```

Generate a random identifier with a specific machine ID:
```bash
node bcid.js -p=TEST -m=2 -r
# or
node bcid.js --prefix=TEST --machine-id=2 --random
```

Decode an identifier:
```bash
node bcid.js -d=TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4
# or
node bcid.js --decode=TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4
```

## Testing

Run the test suite:
```bash
npm test
```

## Implementation Details

The identifier is composed of:

### Chronological Identifiers
1. A 4-character prefix
2. A timestamp component (base62 encoded, **UTC timezone**)
3. A machine ID component (base62 encoded)
4. A random component (base62 encoded)
5. Additional random padding to ensure the total length is 32 characters

### Random Identifiers
1. A 4-character prefix
2. A machine ID component (base62 encoded)
3. Fully random data for the remaining characters

The timestamp is in the format YYYYMMDDHHmmSSmm (year, month, day, hour, minute, second, millisecond) **in UTC timezone**.

## API Reference

### `generateIdentifier(prefix, machineId = 1, userDate = null, isRandom = false)`

Generates either a chronological or random identifier based on the `isRandom` parameter.

**Parameters:**
- `prefix` (string): 4-character prefix
- `machineId` (number): 16-bit machine identifier (0-65535, default: 1)
- `userDate` (Date|string): Custom date/time (ignored if `isRandom` is true)
- `isRandom` (boolean): Generate random identifier if true (default: false)

**Returns:** 32-character base62 string

### `generateRandomIdentifier(prefix, machineId = 1)`

Generates a fully random (non-chronological) identifier.

**Parameters:**
- `prefix` (string): 4-character prefix
- `machineId` (number): 16-bit machine identifier (0-65535, default: 1)

**Returns:** 32-character base62 string

### `decodeIdentifier(identifier)`

Decodes any BCID identifier and automatically detects whether it's chronological or random.

**Parameters:**
- `identifier` (string): 32-character BCID to decode

**Returns:** Object with decoded components and `type` field indicating 'chronological' or 'random'

### Date/Time Input Formats

When specifying a custom date/time for chronological identifiers, you can use:
- ISO 8601 strings: `"2023-12-25T10:30:00"`, `"2023-12-25T10:30:00.123Z"`
- JavaScript Date objects: `new Date('2023-12-25T10:30:00')`
- Any format accepted by JavaScript's `Date()` constructor

**Note**: All timestamps are converted to UTC for consistency across different timezones.

## Error Handling

The implementation includes validation for:
- Prefix length (must be exactly 4 characters)
- Machine ID range (must be between 0 and 65535)
- Identifier length (must be exactly 32 characters)
- Invalid encoding during decoding

## License

MIT 