// Base62 alphabet (a-zA-Z0-9)
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Convert a number to base62 string
 * @param {number} num - The number to convert
 * @returns {string} The base62 encoded string
 */
function base62Encode(num) {
    if (num === 0) return BASE62[0];
    
    let result = [];
    while (num) {
        const rem = num % 62;
        result.unshift(BASE62[rem]);
        num = Math.floor(num / 62);
    }
    return result.join('');
}

/**
 * Convert a base62 string to number
 * @param {string} s - The base62 string to convert
 * @returns {number} The decoded number
 */
function base62Decode(s) {
    let num = 0;
    for (const char of s) {
        num = num * 62 + BASE62.indexOf(char);
    }
    return num;
}

/**
 * Generates a time-orderable, base62 string identifier with a prefix
 * @param {string} prefix - A 4-letter prefix to prepend to the identifier
 * @param {number} machineId - A 16-bit machine identifier (default: 1)
 * @param {Date|string} userDate - Optional user-supplied date/time (default: current time)
 * @param {boolean} isRandom - If true, generates a fully random identifier (ignores userDate)
 * @returns {string} The generated base62 string identifier, exactly 32 characters long
 */
export function generateIdentifier(prefix, machineId = 1, userDate = null, isRandom = false) {
    if (prefix.length !== 4) {
        throw new Error('Prefix must be exactly 4 characters long');
    }
    
    if (machineId < 0 || machineId >= 65536) {
        throw new Error('Machine ID must be between 0 and 65535');
    }

    if (isRandom) {
        return generateRandomIdentifier(prefix, machineId);
    }

    // Use user-supplied date or current time
    let dateTime;
    if (userDate) {
        if (typeof userDate === 'string') {
            dateTime = new Date(userDate);
            if (isNaN(dateTime.getTime())) {
                throw new Error('Invalid date format. Use ISO 8601 format (e.g., "2023-12-25T10:30:00")');
            }
        } else if (userDate instanceof Date) {
            dateTime = userDate;
        } else {
            throw new Error('userDate must be a Date object or ISO 8601 string');
        }
    } else {
        dateTime = new Date();
    }

    // Get timestamp in YYYYMMDDHHmmSSmmmm format (using UTC)
    const timestamp = parseInt(dateTime.getUTCFullYear().toString() +
        (dateTime.getUTCMonth() + 1).toString().padStart(2, '0') +
        dateTime.getUTCDate().toString().padStart(2, '0') +
        dateTime.getUTCHours().toString().padStart(2, '0') +
        dateTime.getUTCMinutes().toString().padStart(2, '0') +
        dateTime.getUTCSeconds().toString().padStart(2, '0') +
        dateTime.getUTCMilliseconds().toString().padStart(3, '0').slice(0, 2));

    // Generate 16-bit random value
    const randomValue = Math.floor(Math.random() * 65536);
    
    // Convert components to base62
    const timestampB62 = base62Encode(timestamp);
    const machineIdB62 = base62Encode(machineId);
    const randomB62 = base62Encode(randomValue);
    
    // Generate additional random bytes and convert to base62
    const randomPadding = new Uint8Array(21);
    crypto.getRandomValues(randomPadding);
    const paddingB62 = Array.from(randomPadding)
        .map(b => base62Encode(b))
        .join('');
    
    // Combine all components
    let encoded = timestampB62 + machineIdB62 + randomB62 + paddingB62;
    
    // Take exactly 28 characters after the prefix
    encoded = encoded.slice(0, 28);
    
    // Combine prefix with encoded part
    return prefix + encoded;
}

/**
 * Generates a fully random (non-chronological) base62 string identifier with a prefix
 * @param {string} prefix - A 4-letter prefix to prepend to the identifier
 * @param {number} machineId - A 16-bit machine identifier (default: 1)
 * @returns {string} The generated base62 string identifier, exactly 32 characters long
 */
export function generateRandomIdentifier(prefix, machineId = 1) {
    if (prefix.length !== 4) {
        throw new Error('Prefix must be exactly 4 characters long');
    }
    
    if (machineId < 0 || machineId >= 65536) {
        throw new Error('Machine ID must be between 0 and 65535');
    }

    // Convert machine ID to base62 with fixed length (3 characters)
    // This ensures unambiguous decoding
    const machineIdB62 = base62Encode(machineId);
    const paddedMachineIdB62 = machineIdB62.padStart(3, BASE62[0]); // Pad with 'a' (represents 0)
    
    // Generate the remaining 25 characters as fully random data
    const remainingLength = 28 - paddedMachineIdB62.length; // Should be 25
    
    // Generate random bytes and convert to base62
    const randomBytes = new Uint8Array(remainingLength);
    crypto.getRandomValues(randomBytes);
    
    let randomB62 = '';
    for (const byte of randomBytes) {
        randomB62 += BASE62[byte % 62];
    }
    
    // Combine prefix with machine ID and random part
    return prefix + paddedMachineIdB62 + randomB62;
}

/**
 * Decodes a BCID into its component parts
 * @param {string} identifier - The BCID to decode
 * @returns {Object} A dictionary containing the decoded components
 */
export function decodeIdentifier(identifier) {
    if (identifier.length !== 32) {
        throw new Error('Identifier must be exactly 32 characters long');
    }
    
    const prefix = identifier.slice(0, 4);
    const encoded = identifier.slice(4);
    
    try {
        // Try to decode as chronological identifier first
        // Find the timestamp (it will be the largest number and should represent a valid date)
        let timestampStr = '';
        for (const char of encoded) {
            timestampStr += char;
            const timestampValue = base62Decode(timestampStr);
            if (timestampValue > 9999999999999999) { // Max 16-digit number
                timestampStr = timestampStr.slice(0, -1);
                break;
            }
        }
        
        const timestamp = base62Decode(timestampStr);
        
        // Check if this looks like a valid timestamp (year should be reasonable)
        const timestampStr16 = timestamp.toString().padStart(16, '0');
        const year = parseInt(timestampStr16.slice(0, 4));
        const isValidTimestamp = year >= 1970 && year <= 2100;
        
        if (isValidTimestamp) {
            // Try to decode as chronological identifier
            // Find the machine_id (next 2-3 chars)
            let machineIdStr = '';
            for (const char of encoded.slice(timestampStr.length)) {
                machineIdStr += char;
                if (base62Decode(machineIdStr) > 65535) { // Max 16-bit number
                    machineIdStr = machineIdStr.slice(0, -1);
                    break;
                }
            }
            
            // Find the random value (next 2-3 chars)
            let randomStr = '';
            for (const char of encoded.slice(timestampStr.length + machineIdStr.length)) {
                randomStr += char;
                if (base62Decode(randomStr) > 65535) { // Max 16-bit number
                    randomStr = randomStr.slice(0, -1);
                    break;
                }
            }
            
            const machineId = base62Decode(machineIdStr);
            const randomValue = base62Decode(randomStr);
            
            return {
                prefix,
                timestamp,
                machineId,
                random: randomValue,
                type: 'chronological'
            };
        } else {
            // Decode as random identifier
            // Machine ID is always encoded as exactly 3 characters (padded with 'a' if needed)
            const machineIdStr = encoded.slice(0, 3);
            const machineId = base62Decode(machineIdStr);
            const randomPart = encoded.slice(3);
            
            return {
                prefix,
                machineId,
                randomPart,
                type: 'random'
            };
        }
    } catch (e) {
        throw new Error(`Invalid encoding: ${e.message}`);
    }
}

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const prefix = args.find(arg => arg.startsWith('-p=') || arg.startsWith('--prefix='))?.split('=')[1];
    const machineId = parseInt(args.find(arg => arg.startsWith('-m=') || arg.startsWith('--machine-id='))?.split('=')[1] || '1');
    const userDate = args.find(arg => arg.startsWith('-t=') || arg.startsWith('--time='))?.split('=')[1];
    const decode = args.find(arg => arg.startsWith('-d=') || arg.startsWith('--decode='))?.split('=')[1];
    const isRandom = args.some(arg => arg === '-r' || arg === '--random');

    try {
        if (decode) {
            if (prefix) console.warn('Warning: Prefix is ignored when decoding');
            if (machineId !== 1) console.warn('Warning: Machine ID is ignored when decoding');
            if (userDate) console.warn('Warning: User date is ignored when decoding');
            if (isRandom) console.warn('Warning: Random flag is ignored when decoding');
            
            const components = decodeIdentifier(decode);
            console.log(`Prefix: ${components.prefix}`);
            console.log(`Type: ${components.type}`);
            console.log(`Machine ID: ${components.machineId}`);
            
            if (components.type === 'chronological') {
                console.log(`Timestamp: ${components.timestamp}`);
                console.log(`Random Value: ${components.random}`);
            } else {
                console.log(`Random Part: ${components.randomPart}`);
            }
        } else {
            if (!prefix) {
                console.error('Error: Prefix is required when generating an identifier');
                console.error('Usage:');
                console.error('  Generate: node bcid.js -p=PREFIX [-m=MACHINE_ID] [-t=DATETIME] [-r]');
                console.error('  Decode:   node bcid.js -d=IDENTIFIER');
                console.error('');
                console.error('Options:');
                console.error('  -p, --prefix      4-character prefix (required for generation)');
                console.error('  -m, --machine-id  16-bit machine identifier (0-65535, default: 1)');
                console.error('  -t, --time        ISO 8601 date/time (default: current time, ignored with -r)');
                console.error('  -r, --random      Generate fully random identifier (non-chronological)');
                console.error('  -d, --decode      Decode an existing identifier');
                console.error('');
                console.error('Examples:');
                console.error('  node bcid.js -p=TEST');
                console.error('  node bcid.js -p=TEST -m=2 -t="2023-12-25T10:30:00"');
                console.error('  node bcid.js -p=TEST -r');
                console.error('  node bcid.js -p=TEST -m=2 -r');
                console.error('  node bcid.js -d=TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4');
                process.exit(1);
            }
            
            if (isRandom && userDate) {
                console.warn('Warning: Time parameter is ignored when generating random identifiers');
            }
            
            const identifier = generateIdentifier(prefix, machineId, userDate, isRandom);
            console.log(identifier);
        }
    } catch (e) {
        console.error(`Error: ${e.message}`);
        process.exit(1);
    }
} 