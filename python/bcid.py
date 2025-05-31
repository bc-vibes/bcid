import time
import argparse
import os
import struct
from datetime import datetime, timezone
import string

# Base62 alphabet (a-zA-Z0-9)
BASE62 = string.ascii_letters + string.digits

def base62_encode(num):
    """Convert a number to base62 string."""
    if num == 0:
        return BASE62[0]
    
    result = []
    while num:
        num, rem = divmod(num, 62)
        result.append(BASE62[rem])
    return ''.join(reversed(result))

def base62_decode(s):
    """Convert a base62 string to number."""
    num = 0
    for char in s:
        num = num * 62 + BASE62.index(char)
    return num

def generate_identifier(prefix, machine_id=1, user_datetime=None, is_random=False):
    """
    Generates a time-orderable, base62 string identifier with a prefix.

    Args:
        prefix (str): A 4-letter prefix to prepend to the identifier.
        machine_id (int, optional): A 16-bit machine identifier. Defaults to 1.
        user_datetime (datetime|str, optional): User-supplied date/time. Defaults to current UTC time.
        is_random (bool, optional): If True, generates a fully random identifier (ignores user_datetime).

    Returns:
        str: The generated base62 string identifier, exactly 32 characters long.
    """
    if len(prefix) != 4:
        raise ValueError("Prefix must be exactly 4 characters long")
    
    if not 0 <= machine_id < 65536:
        raise ValueError("Machine ID must be between 0 and 65535")

    if is_random:
        return generate_random_identifier(prefix, machine_id)

    # Use user-supplied datetime or current UTC time
    if user_datetime:
        if isinstance(user_datetime, str):
            try:
                # Try parsing ISO format first
                if 'T' in user_datetime:
                    dt = datetime.fromisoformat(user_datetime.replace('Z', '+00:00'))
                else:
                    # Try common date formats
                    for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d']:
                        try:
                            dt = datetime.strptime(user_datetime, fmt)
                            break
                        except ValueError:
                            continue
                    else:
                        raise ValueError(f"Unable to parse date string: {user_datetime}")
                
                # Convert to UTC if no timezone info
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                else:
                    dt = dt.astimezone(timezone.utc)
            except ValueError as e:
                raise ValueError(f"Invalid date format: {e}. Use ISO 8601 format (e.g., '2023-12-25T10:30:00')")
        elif isinstance(user_datetime, datetime):
            dt = user_datetime
            # Convert to UTC if no timezone info
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
        else:
            raise ValueError("user_datetime must be a datetime object or ISO 8601 string")
    else:
        dt = datetime.now(timezone.utc)

    # Get timestamp in YYYYMMDDHHmmSSmmmm format (using UTC)
    timestamp = int(dt.strftime("%Y%m%d%H%M%S%f")[:16])  # Get first 16 digits (YYYYMMDDHHmmSSmm)
    
    # Generate 16-bit random value
    random_value = os.urandom(2)
    random_int = struct.unpack('>H', random_value)[0]
    
    # Convert components to base62
    timestamp_b62 = base62_encode(timestamp)
    machine_id_b62 = base62_encode(machine_id)
    random_b62 = base62_encode(random_int)
    
    # Generate additional random bytes and convert to base62
    random_padding = os.urandom(21)
    padding_b62 = ''.join(base62_encode(b) for b in random_padding)
    
    # Combine all components
    encoded = timestamp_b62 + machine_id_b62 + random_b62 + padding_b62
    
    # Take exactly 28 characters after the prefix
    encoded = encoded[:28]
    
    # Combine prefix with encoded part
    identifier = prefix + encoded
    
    return identifier

def generate_random_identifier(prefix, machine_id=1):
    """
    Generates a fully random (non-chronological) base62 string identifier with a prefix.

    Args:
        prefix (str): A 4-letter prefix to prepend to the identifier.
        machine_id (int, optional): A 16-bit machine identifier. Defaults to 1.

    Returns:
        str: The generated base62 string identifier, exactly 32 characters long.
    """
    if len(prefix) != 4:
        raise ValueError("Prefix must be exactly 4 characters long")
    
    if not 0 <= machine_id < 65536:
        raise ValueError("Machine ID must be between 0 and 65535")

    # Convert machine ID to base62 with fixed length (3 characters)
    # This ensures unambiguous decoding
    machine_id_b62 = base62_encode(machine_id)
    padded_machine_id_b62 = machine_id_b62.rjust(3, BASE62[0])  # Pad with 'a' (represents 0)
    
    # Generate the remaining 25 characters as fully random data
    remaining_length = 28 - len(padded_machine_id_b62)  # Should be 25
    
    # Generate random bytes and convert to base62
    random_bytes = os.urandom(remaining_length)
    
    random_b62 = ''
    for byte in random_bytes:
        random_b62 += BASE62[byte % 62]
    
    # Combine prefix with machine ID and random part
    return prefix + padded_machine_id_b62 + random_b62

def decode_identifier(identifier):
    """
    Decodes a BCID into its component parts.

    Args:
        identifier (str): The BCID to decode.

    Returns:
        dict: A dictionary containing the decoded components:
            - prefix: The 4-character prefix
            - timestamp: The timestamp in YYYYMMDDHHmmSSmm format (chronological only)
            - machine_id: The 16-bit machine identifier
            - random: The 16-bit random value (chronological only)
            - random_part: The random part (random identifiers only)
            - type: 'chronological' or 'random'
    """
    if len(identifier) != 32:
        raise ValueError("Identifier must be exactly 32 characters long")
    
    prefix = identifier[:4]
    encoded = identifier[4:]
    
    try:
        # Try to decode as chronological identifier first
        # Find the timestamp (it will be the largest number and should represent a valid date)
        timestamp_str = ''
        for char in encoded:
            timestamp_str += char
            timestamp_value = base62_decode(timestamp_str)
            if timestamp_value > 9999999999999999:  # Max 16-digit number
                timestamp_str = timestamp_str[:-1]
                break
        
        timestamp = base62_decode(timestamp_str)
        
        # Check if this looks like a valid timestamp (year should be reasonable)
        timestamp_str_16 = str(timestamp).zfill(16)
        year = int(timestamp_str_16[:4])
        is_valid_timestamp = 1970 <= year <= 2100
        
        if is_valid_timestamp:
            # Try to decode as chronological identifier
            # Find the machine_id (next 2-3 chars)
            machine_id_str = ''
            for char in encoded[len(timestamp_str):]:
                machine_id_str += char
                if base62_decode(machine_id_str) > 65535:  # Max 16-bit number
                    machine_id_str = machine_id_str[:-1]
                    break
            
            # Find the random value (next 2-3 chars)
            random_str = ''
            for char in encoded[len(timestamp_str) + len(machine_id_str):]:
                random_str += char
                if base62_decode(random_str) > 65535:  # Max 16-bit number
                    random_str = random_str[:-1]
                    break
            
            machine_id = base62_decode(machine_id_str)
            random_value = base62_decode(random_str)
            
            return {
                'prefix': prefix,
                'timestamp': timestamp,
                'machine_id': machine_id,
                'random': random_value,
                'type': 'chronological'
            }
        else:
            # Decode as random identifier
            # Machine ID is always encoded as exactly 3 characters (padded with 'a' if needed)
            machine_id_str = encoded[:3]
            machine_id = base62_decode(machine_id_str)
            random_part = encoded[3:]
            
            return {
                'prefix': prefix,
                'machine_id': machine_id,
                'random_part': random_part,
                'type': 'random'
            }
    except Exception as e:
        raise ValueError(f"Invalid encoding: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate or decode a time-orderable, base62 string identifier.")
    parser.add_argument("-p", "--prefix", type=str,
                        help="The 4-letter prefix to prepend to the identifier")
    parser.add_argument("-m", "--machine-id", type=int, default=1,
                        help="A 16-bit machine identifier (0-65535, default: 1)")
    parser.add_argument("-t", "--time", type=str,
                        help="ISO 8601 date/time string (default: current time, ignored with -r)")
    parser.add_argument("-r", "--random", action="store_true",
                        help="Generate fully random identifier (non-chronological)")
    parser.add_argument("-d", "--decode", type=str,
                        help="Decode a BCID into its components")
    args = parser.parse_args()

    try:
        if args.decode:
            if args.prefix:
                print("Warning: Prefix is ignored when decoding")
            if args.machine_id != 1:
                print("Warning: Machine ID is ignored when decoding")
            if args.time:
                print("Warning: User time is ignored when decoding")
            if args.random:
                print("Warning: Random flag is ignored when decoding")
            
            components = decode_identifier(args.decode)
            print(f"Prefix: {components['prefix']}")
            print(f"Type: {components['type']}")
            print(f"Machine ID: {components['machine_id']}")
            
            if components['type'] == 'chronological':
                print(f"Timestamp: {components['timestamp']}")
                print(f"Random Value: {components['random']}")
            else:
                print(f"Random Part: {components['random_part']}")
        else:
            if not args.prefix:
                print("Error: Prefix is required when generating an identifier")
                print("\nUsage:")
                print("  Generate: python bcid.py -p PREFIX [-m MACHINE_ID] [-t DATETIME] [-r]")
                print("  Decode:   python bcid.py -d IDENTIFIER")
                print("\nOptions:")
                print("  -p, --prefix      4-character prefix (required for generation)")
                print("  -m, --machine-id  16-bit machine identifier (0-65535, default: 1)")
                print("  -t, --time        ISO 8601 date/time (default: current time, ignored with -r)")
                print("  -r, --random      Generate fully random identifier (non-chronological)")
                print("  -d, --decode      Decode an existing identifier")
                print("\nExamples:")
                print("  python bcid.py -p TEST")
                print("  python bcid.py -p TEST -m 2 -t '2023-12-25T10:30:00'")
                print("  python bcid.py -p TEST -r")
                print("  python bcid.py -p TEST -m 2 -r")
                print("  python bcid.py -d TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4")
                exit(1)
            
            if args.random and args.time:
                print("Warning: Time parameter is ignored when generating random identifiers")
            
            identifier = generate_identifier(args.prefix, args.machine_id, args.time, args.random)
            print(identifier)
    except ValueError as e:
        print(f"Error: {e}")
        exit(1)
