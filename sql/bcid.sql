-- Base62 alphabet (a-zA-Z0-9)
CREATE OR ALTER FUNCTION dbo.Base62Encode(@num BIGINT)
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @BASE62 NVARCHAR(62) = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    DECLARE @result NVARCHAR(MAX) = '';
    DECLARE @remainder INT;
    
    IF @num = 0
        RETURN 'a';
        
    WHILE @num > 0
    BEGIN
        SET @remainder = @num % 62;
        SET @result = SUBSTRING(@BASE62, @remainder + 1, 1) + @result;
        SET @num = @num / 62;
    END
    
    RETURN @result;
END;
GO

-- Function to decode base62 string to number
CREATE OR ALTER FUNCTION dbo.Base62Decode(@str NVARCHAR(MAX))
RETURNS BIGINT
AS
BEGIN
    DECLARE @BASE62 NVARCHAR(62) = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    DECLARE @num BIGINT = 0;
    DECLARE @i INT = 1;
    DECLARE @len INT = LEN(@str);
    DECLARE @char NCHAR(1);
    DECLARE @pos INT;
    
    WHILE @i <= @len
    BEGIN
        SET @char = SUBSTRING(@str, @i, 1);
        SET @pos = CHARINDEX(@char, @BASE62) - 1;
        IF @pos = -1
            RETURN 0;  -- Invalid character
        SET @num = @num * 62 + @pos;
        SET @i = @i + 1;
    END
    
    RETURN @num;
END;
GO

-- Main function to generate BCID
CREATE OR ALTER FUNCTION dbo.GenerateBCID(
    @prefix NVARCHAR(4),
    @machine_id SMALLINT = 1,
    @user_datetime DATETIME2 = NULL,
    @is_random BIT = 0,
    @random_value UNIQUEIDENTIFIER = NULL
)
RETURNS NVARCHAR(32)
AS
BEGIN
    DECLARE @BASE62 NVARCHAR(62) = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    -- Validate prefix length
    IF LEN(@prefix) != 4
        RETURN NULL;
        
    -- If random mode, call the random function
    IF @is_random = 1
        RETURN dbo.GenerateRandomBCID(@prefix, @machine_id, @random_value);
        
    -- Use provided random value or generate new one
    DECLARE @random UNIQUEIDENTIFIER = ISNULL(@random_value, NEWID());
    
    -- Use user-supplied datetime or current UTC time
    DECLARE @datetime DATETIME2 = ISNULL(@user_datetime, GETUTCDATE());
    
    -- Get timestamp in YYYYMMDDHHmmSSmm format (UTC)
    DECLARE @timestamp NVARCHAR(16) = FORMAT(@datetime, 'yyyyMMddHHmmss');
    
    -- Add milliseconds (use 00 for user-supplied time, or current milliseconds)
    DECLARE @milliseconds INT = CASE 
        WHEN @user_datetime IS NOT NULL THEN 0
        ELSE DATEPART(MILLISECOND, GETUTCDATE())
    END;
    SET @timestamp = @timestamp + RIGHT('000' + CAST(@milliseconds AS NVARCHAR(3)), 2);
    
    -- Convert timestamp to number
    DECLARE @timestamp_num BIGINT = CAST(@timestamp AS BIGINT);
    
    -- Generate random value from NEWID
    DECLARE @random_num SMALLINT = ABS(CAST(CAST(@random AS VARBINARY(16)) AS BIGINT) % 65536);
    
    -- Convert components to base62
    DECLARE @timestamp_b62 NVARCHAR(MAX) = dbo.Base62Encode(@timestamp_num);
    DECLARE @machine_id_b62 NVARCHAR(3) = 
        SUBSTRING(@BASE62, (@machine_id / (62 * 62)) + 1, 1) +
        SUBSTRING(@BASE62, ((@machine_id / 62) % 62) + 1, 1) +
        SUBSTRING(@BASE62, (@machine_id % 62) + 1, 1);
    DECLARE @random_b62 NVARCHAR(MAX) = dbo.Base62Encode(@random_num);
    
    -- Generate padding from random value
    DECLARE @padding_b62 NVARCHAR(21) = '';
    DECLARE @i INT = 0;
    DECLARE @random_bytes VARBINARY(16) = CAST(@random AS VARBINARY(16));
    
    WHILE @i < 21
    BEGIN
        SET @padding_b62 = @padding_b62 + 
            SUBSTRING(@BASE62, (CAST(SUBSTRING(@random_bytes, (@i % 16) + 1, 1) AS INT) % 62) + 1, 1);
        SET @i = @i + 1;
    END
    
    -- Combine all components
    DECLARE @result NVARCHAR(32) = @prefix + @timestamp_b62 + @machine_id_b62 + @random_b62;
    SET @result = @result + SUBSTRING(@padding_b62, 1, 28 - LEN(@result) + 4);
    
    RETURN LEFT(@result, 32);
END;
GO

-- Function to generate a fully random (non-chronological) BCID
CREATE OR ALTER FUNCTION dbo.GenerateRandomBCID(
    @prefix NVARCHAR(4),
    @machine_id SMALLINT = 1,
    @random_value UNIQUEIDENTIFIER = NULL
)
RETURNS NVARCHAR(32)
AS
BEGIN
    DECLARE @BASE62 NVARCHAR(62) = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    -- Validate prefix length
    IF LEN(@prefix) != 4
        RETURN NULL;
        
    -- Use provided random value or generate new one
    DECLARE @random UNIQUEIDENTIFIER = ISNULL(@random_value, NEWID());
    
    -- Convert machine ID to base62 with fixed length (3 characters)
    -- This ensures unambiguous decoding
    DECLARE @machine_id_b62 NVARCHAR(3) = dbo.Base62Encode(@machine_id);
    
    -- Pad with 'a' characters to ensure exactly 3 characters
    DECLARE @padded_machine_id_b62 NVARCHAR(3);
    DECLARE @machine_id_len INT = LEN(@machine_id_b62);
    IF @machine_id_len < 3
    BEGIN
        DECLARE @padding_needed INT = 3 - @machine_id_len;
        SET @padded_machine_id_b62 = REPLICATE('a', @padding_needed) + @machine_id_b62;
    END
    ELSE
    BEGIN
        SET @padded_machine_id_b62 = @machine_id_b62;
    END
    
    -- Generate the remaining 25 characters as fully random data
    DECLARE @remaining_length INT = 28 - 3; -- Should be 25
    
    -- Generate random bytes and convert to base62
    DECLARE @random_b62 NVARCHAR(25) = '';
    DECLARE @i INT = 0;
    DECLARE @random_bytes VARBINARY(16) = CAST(@random AS VARBINARY(16));
    
    WHILE @i < @remaining_length
    BEGIN
        SET @random_b62 = @random_b62 + 
            SUBSTRING(@BASE62, (CAST(SUBSTRING(@random_bytes, (@i % 16) + 1, 1) AS INT) % 62) + 1, 1);
        SET @i = @i + 1;
    END
    
    -- Combine prefix with machine ID and random part
    RETURN @prefix + @padded_machine_id_b62 + @random_b62;
END;
GO

-- Function to decode BCID
CREATE OR ALTER FUNCTION dbo.DecodeBCID(@identifier NVARCHAR(32))
RETURNS TABLE
AS
RETURN
(
    WITH DecodedData AS (
        SELECT 
            LEFT(@identifier, 4) AS prefix,
            SUBSTRING(@identifier, 5, 28) AS encoded,
            -- Try to extract timestamp from the beginning
            CASE 
                WHEN LEN(@identifier) = 32 THEN
                    -- Find the first part that could be a timestamp
                    dbo.Base62Decode(
                        SUBSTRING(@identifier, 5, 
                            CASE 
                                WHEN CHARINDEX('a', @identifier, 5) > 0 AND CHARINDEX('a', @identifier, 5) <= 12 THEN CHARINDEX('a', @identifier, 5) - 5
                                WHEN CHARINDEX('b', @identifier, 5) > 0 AND CHARINDEX('b', @identifier, 5) <= 12 THEN CHARINDEX('b', @identifier, 5) - 5
                                ELSE 8  -- Default length for timestamp
                            END
                        )
                    )
                ELSE 0
            END AS potential_timestamp
    ),
    TypeDetection AS (
        SELECT 
            *,
            -- Check if the potential timestamp represents a valid year (1970-2100)
            CASE 
                WHEN potential_timestamp > 0 THEN
                    CAST(LEFT(RIGHT('0000000000000000' + CAST(potential_timestamp AS NVARCHAR(16)), 16), 4) AS INT)
                ELSE 0
            END AS year_from_timestamp,
            CASE 
                WHEN potential_timestamp > 0 THEN
                    CASE 
                        WHEN CAST(LEFT(RIGHT('0000000000000000' + CAST(potential_timestamp AS NVARCHAR(16)), 16), 4) AS INT) BETWEEN 1970 AND 2100 
                        THEN 'chronological'
                        ELSE 'random'
                    END
                ELSE 'random'
            END AS identifier_type
        FROM DecodedData
    )
    SELECT 
        prefix,
        CASE 
            WHEN identifier_type = 'chronological' THEN potential_timestamp
            ELSE NULL
        END AS timestamp,
        CASE 
            WHEN identifier_type = 'chronological' THEN
                -- For chronological: decode machine_id from position after timestamp
                CAST(dbo.Base62Decode(SUBSTRING(encoded, 9, 3)) AS SMALLINT)
            ELSE
                -- For random: machine_id is always first 3 characters
                CAST(dbo.Base62Decode(SUBSTRING(encoded, 1, 3)) AS SMALLINT)
        END AS machine_id,
        CASE 
            WHEN identifier_type = 'chronological' THEN
                -- For chronological: decode random value from position after machine_id
                CAST(dbo.Base62Decode(SUBSTRING(encoded, 12, 3)) AS SMALLINT)
            ELSE NULL
        END AS random_value,
        CASE 
            WHEN identifier_type = 'random' THEN
                -- For random: everything after machine_id is random data
                SUBSTRING(encoded, 4, 25)
            ELSE NULL
        END AS random_part,
        identifier_type
    FROM TypeDetection
);
GO

-- Example usage:
-- Generate chronological BCID with current time
SELECT dbo.GenerateBCID('TEST', 1, DEFAULT, DEFAULT, NEWID()) AS bcid;

-- Generate chronological BCID with specific date/time
SELECT dbo.GenerateBCID('TEST', 1, '2023-12-25 10:30:00', DEFAULT, NEWID()) AS bcid;

-- Generate random BCID
SELECT dbo.GenerateBCID('TEST', 1, DEFAULT, 1, NEWID()) AS random_bcid;

-- Generate random BCID with specific machine ID
SELECT dbo.GenerateBCID('TEST', 123, DEFAULT, 1, NEWID()) AS random_bcid_with_machine_id;

-- Alternative: use the dedicated random function
SELECT dbo.GenerateRandomBCID('TEST', 1, NEWID()) AS random_bcid_direct;

-- Generate chronological BCID with all parameters
SELECT dbo.GenerateBCID('abc.', 29388, '2023-12-25 10:30:00', DEFAULT, NEWID()) AS bcid;

-- Decode any BCID (automatically detects type)
SELECT * FROM dbo.DecodeBCID('TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4'); 