# BCID - SQL Implementation

A SQL Server implementation of the BCID (Base62 Chronological Identifier) generator. This utility generates time-orderable, base62 string identifiers with a prefix, and also supports fully random identifiers.

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

Run the `bcid.sql` script in your SQL Server database:

```sql
USE YourDatabase;
GO
:r bcid.sql
```

## Usage

### Generate Chronological Identifiers

With current time and default machine ID (1):
```sql
SELECT dbo.GenerateBCID('TEST', DEFAULT, DEFAULT, DEFAULT, NEWID()) AS bcid;
```

With specific machine ID:
```sql
SELECT dbo.GenerateBCID('TEST', 29388, DEFAULT, DEFAULT, NEWID()) AS bcid;
```

With specific date/time:
```sql
SELECT dbo.GenerateBCID('TEST', 1, '2023-12-25 10:30:00', DEFAULT, NEWID()) AS bcid;
```

With all chronological parameters specified:
```sql
DECLARE @random UNIQUEIDENTIFIER = NEWID();
SELECT dbo.GenerateBCID('TEST', 29388, '2023-12-25 10:30:00', 0, @random) AS bcid;
```

### Generate Random Identifiers

Generate a fully random identifier:
```sql
SELECT dbo.GenerateBCID('TEST', DEFAULT, DEFAULT, 1, NEWID()) AS random_bcid;
```

With specific machine ID:
```sql
SELECT dbo.GenerateBCID('TEST', 123, DEFAULT, 1, NEWID()) AS random_bcid;
```

Alternative using the dedicated random function:
```sql
SELECT dbo.GenerateRandomBCID('TEST', 1, NEWID()) AS random_bcid;
```

With specific machine ID using dedicated function:
```sql
SELECT dbo.GenerateRandomBCID('TEST', 123, NEWID()) AS random_bcid;
```

### Function Signatures

#### Main Generation Function
```sql
dbo.GenerateBCID(
    @prefix NVARCHAR(4),           -- 4-character prefix (required)
    @machine_id SMALLINT = 1,      -- Machine ID (0-65535, default: 1)
    @user_datetime DATETIME2 = NULL, -- Custom date/time (default: current time, ignored if @is_random = 1)
    @is_random BIT = 0,            -- Generate random identifier if 1 (default: 0)
    @random_value UNIQUEIDENTIFIER = NULL -- Custom random seed (default: NEWID())
)
```

#### Random Generation Function
```sql
dbo.GenerateRandomBCID(
    @prefix NVARCHAR(4),           -- 4-character prefix (required)
    @machine_id SMALLINT = 1,      -- Machine ID (0-65535, default: 1)
    @random_value UNIQUEIDENTIFIER = NULL -- Custom random seed (default: NEWID())
)
```

### Decode an Identifier

Decode any identifier (automatically detects type):
```sql
SELECT * FROM dbo.DecodeBCID('TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4');
```

The result will include:
- **prefix**: The 4-character prefix
- **timestamp**: The timestamp (chronological only, NULL for random)
- **machine_id**: The machine identifier
- **random_value**: The random value (chronological only, NULL for random)
- **random_part**: The random data (random identifiers only, NULL for chronological)
- **identifier_type**: 'chronological' or 'random'

## Implementation Details

The SQL implementation uses:
- `GETUTCDATE()` for current UTC timestamp generation
- `DATETIME2` for user-supplied date/time parsing
- `NEWID()` for cryptographically secure random components
- `FORMAT()` for date/time formatting
- Base62 encoding/decoding functions
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

### Date/Time Input Formats

When specifying a custom date/time for chronological identifiers, you can use any format accepted by SQL Server's `DATETIME2`:
- ISO format: `'2023-12-25T10:30:00'`
- Standard format: `'2023-12-25 10:30:00'`
- Date only (defaults to 00:00:00): `'2023-12-25'`
- With milliseconds: `'2023-12-25 10:30:00.123'`

**Note**: All timestamps are stored and processed in UTC for consistency across different timezones.

## Error Handling

The implementation includes validation for:
- Prefix length (must be exactly 4 characters)
- Machine ID range (must be between 0 and 65535)
- Identifier length (must be exactly 32 characters)
- Invalid encoding during decoding

## License

MIT
