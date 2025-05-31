use std::time::{SystemTime, UNIX_EPOCH};
use std::env;
use std::process;
use chrono::{Utc, NaiveDateTime, DateTime, TimeZone};
use rand::random;

// Base62 alphabet (a-zA-Z0-9)
const BASE62: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/// Convert a number to base62 string
fn base62_encode(mut num: u64) -> String {
    if num == 0 {
        return String::from_utf8_lossy(&[BASE62[0]]).to_string();
    }

    let mut result = Vec::new();
    while num > 0 {
        result.push(BASE62[(num % 62) as usize]);
        num /= 62;
    }
    result.reverse();
    String::from_utf8_lossy(&result).to_string()
}

/// Convert a base62 string to number
fn base62_decode(s: &str) -> u64 {
    let mut num = 0u64;
    for c in s.chars() {
        if let Some(pos) = BASE62.iter().position(|&x| x == c as u8) {
            num = num * 62 + pos as u64;
        }
    }
    num
}

/// Generate a random 16-bit number
fn get_random_16bit() -> u16 {
    random::<u16>()
}

/// Parse user-supplied date/time string
fn parse_user_datetime(datetime_str: &str) -> Result<DateTime<Utc>, String> {
    // Try ISO 8601 format first
    if let Ok(naive) = NaiveDateTime::parse_from_str(datetime_str, "%Y-%m-%dT%H:%M:%S") {
        return Ok(Utc.from_utc_datetime(&naive));
    }
    
    // Try space-separated format
    if let Ok(naive) = NaiveDateTime::parse_from_str(datetime_str, "%Y-%m-%d %H:%M:%S") {
        return Ok(Utc.from_utc_datetime(&naive));
    }
    
    // Try date only (default to 00:00:00)
    if let Ok(date) = chrono::NaiveDate::parse_from_str(datetime_str, "%Y-%m-%d") {
        let naive = date.and_hms_opt(0, 0, 0).ok_or("Invalid date")?;
        return Ok(Utc.from_utc_datetime(&naive));
    }
    
    Err(format!("Invalid date format: {}. Use ISO 8601 format (e.g., '2023-12-25T10:30:00')", datetime_str))
}

/// Generate a time-orderable, base62 string identifier with a prefix
fn generate_identifier(prefix: &str, machine_id: u16, user_datetime: Option<&str>, is_random: bool) -> String {
    if prefix.len() != 4 {
        eprintln!("Error: Prefix must be exactly 4 characters long");
        process::exit(1);
    }

    if is_random {
        return generate_random_identifier(prefix, machine_id);
    }

    // Use user-supplied datetime or current UTC time
    let datetime = if let Some(datetime_str) = user_datetime {
        match parse_user_datetime(datetime_str) {
            Ok(dt) => dt,
            Err(e) => {
                eprintln!("Error: {}", e);
                process::exit(1);
            }
        }
    } else {
        Utc::now()
    };

    // Format timestamp as YYYYMMDDHHmmSSmm (UTC)
    let timestamp = datetime.format("%Y%m%d%H%M%S").to_string();
    
    // Add milliseconds (use 00 for user-supplied time, or current microseconds)
    let timestamp = if user_datetime.is_some() {
        format!("{}00", timestamp)
    } else {
        let micros = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .subsec_micros();
        format!("{}{:02}", timestamp, micros / 10000)
    };
    
    let timestamp: u64 = timestamp.parse().unwrap();

    // Generate random value
    let random_value = get_random_16bit();

    // Convert components to base62
    let timestamp_b62 = base62_encode(timestamp);
    let machine_id_b62 = format!(
        "{}{}{}",
        BASE62[(machine_id / (62 * 62)) as usize] as char,
        BASE62[((machine_id / 62) % 62) as usize] as char,
        BASE62[(machine_id % 62) as usize] as char
    );
    let random_b62 = base62_encode(random_value as u64);

    // Generate padding
    let mut padding_b62 = String::with_capacity(21);
    for _ in 0..21 {
        let random_byte = get_random_16bit() as u8;
        padding_b62.push(BASE62[(random_byte % 62) as usize] as char);
    }

    // Combine all components
    let mut result = format!("{}{}{}{}", prefix, timestamp_b62, machine_id_b62, random_b62);
    result.push_str(&padding_b62[..28 - result.len() + 4]);
    result.truncate(32);
    result
}

/// Generate a fully random (non-chronological) base62 string identifier with a prefix
fn generate_random_identifier(prefix: &str, machine_id: u16) -> String {
    if prefix.len() != 4 {
        eprintln!("Error: Prefix must be exactly 4 characters long");
        process::exit(1);
    }

    // Convert machine ID to base62 with fixed length (3 characters)
    // This ensures unambiguous decoding
    let machine_id_b62 = base62_encode(machine_id as u64);
    
    // Pad with 'a' characters to ensure exactly 3 characters
    let padded_machine_id_b62 = if machine_id_b62.len() < 3 {
        let padding_needed = 3 - machine_id_b62.len();
        let padding = "a".repeat(padding_needed);
        format!("{}{}", padding, machine_id_b62)
    } else {
        machine_id_b62
    };
    
    // Generate the remaining 25 characters as fully random data
    let remaining_length = 28 - padded_machine_id_b62.len(); // Should be 25
    
    // Generate random bytes and convert to base62
    let mut random_b62 = String::with_capacity(remaining_length);
    for _ in 0..remaining_length {
        let random_byte = get_random_16bit() as u8;
        random_b62.push(BASE62[(random_byte % 62) as usize] as char);
    }
    
    // Combine prefix with machine ID and random part
    format!("{}{}{}", prefix, padded_machine_id_b62, random_b62)
}

/// Decode a BCID into its component parts
fn decode_identifier(identifier: &str) -> (String, Option<u64>, u16, Option<u16>, Option<String>, String) {
    if identifier.len() != 32 {
        eprintln!("Error: Identifier must be exactly 32 characters long");
        process::exit(1);
    }

    let prefix = identifier[..4].to_string();
    let encoded = &identifier[4..];

    // Try to decode as chronological identifier first
    // Find the timestamp (it will be the largest number and should represent a valid date)
    let mut timestamp_str = String::new();
    let mut pos = 0;
    while pos < encoded.len() {
        timestamp_str.push(encoded.chars().nth(pos).unwrap());
        let timestamp_value = base62_decode(&timestamp_str);
        if timestamp_value > 9999999999999999 {
            timestamp_str.pop();
            break;
        }
        pos += 1;
    }
    
    let timestamp = base62_decode(&timestamp_str);
    
    // Check if this looks like a valid timestamp (year should be reasonable)
    let timestamp_str_16 = format!("{:016}", timestamp);
    let year: u32 = timestamp_str_16[..4].parse().unwrap_or(0);
    let is_valid_timestamp = year >= 1970 && year <= 2100;
    
    if is_valid_timestamp {
        // Try to decode as chronological identifier
        pos = timestamp_str.len();
        
        // Decode machine_id (exactly 3 characters)
        let machine_id = (base62_decode(&encoded[pos..pos+1]) * 62 * 62 +
                         base62_decode(&encoded[pos+1..pos+2]) * 62 +
                         base62_decode(&encoded[pos+2..pos+3])) as u16;
        pos += 3;

        // Find random value
        let mut random_str = String::new();
        while pos < encoded.len() {
            random_str.push(encoded.chars().nth(pos).unwrap());
            if base62_decode(&random_str) > 65535 {
                random_str.pop();
                break;
            }
            pos += 1;
        }
        let random = base62_decode(&random_str) as u16;

        (prefix, Some(timestamp), machine_id, Some(random), None, "chronological".to_string())
    } else {
        // Decode as random identifier
        // Machine ID is always encoded as exactly 3 characters (padded with 'a' if needed)
        let machine_id_str = &encoded[..3];
        let machine_id = base62_decode(machine_id_str) as u16;
        let random_part = encoded[3..].to_string();
        
        (prefix, None, machine_id, None, Some(random_part), "random".to_string())
    }
}

fn print_usage() {
    println!("Usage:");
    println!("  Generate: bcid -p PREFIX [-m MACHINE_ID] [-t DATETIME] [-r]");
    println!("  Decode:   bcid -d IDENTIFIER");
    println!("\nOptions:");
    println!("  -p PREFIX     4-character prefix (required for generation)");
    println!("  -m MACHINE_ID 16-bit machine identifier (0-65535, default: 1)");
    println!("  -t DATETIME   ISO 8601 date/time (default: current time, ignored with -r)");
    println!("  -r            Generate fully random identifier (non-chronological)");
    println!("  -d IDENTIFIER Decode an existing identifier");
    println!("\nExamples:");
    println!("  bcid -p TEST");
    println!("  bcid -p TEST -m 2 -t '2023-12-25T10:30:00'");
    println!("  bcid -p TEST -r");
    println!("  bcid -p TEST -m 2 -r");
    println!("  bcid -d TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4");
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let mut prefix = None;
    let mut decode_id = None;
    let mut user_datetime = None;
    let mut machine_id = 1u16;
    let mut is_random = false;

    // If no arguments provided, show usage and exit
    if args.len() == 1 {
        print_usage();
        process::exit(0);
    }

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "-p" => {
                if i + 1 < args.len() {
                    prefix = Some(args[i + 1].clone());
                    i += 2;
                } else {
                    eprintln!("Error: Missing prefix argument");
                    print_usage();
                    process::exit(1);
                }
            }
            "-m" => {
                if i + 1 < args.len() {
                    match args[i + 1].parse::<u16>() {
                        Ok(id) => {
                            machine_id = id;
                        }
                        Err(_) => {
                            eprintln!("Error: Invalid machine ID - must be a number between 0 and 65535");
                            process::exit(1);
                        }
                    }
                    i += 2;
                } else {
                    eprintln!("Error: Missing machine ID argument");
                    print_usage();
                    process::exit(1);
                }
            }
            "-t" => {
                if i + 1 < args.len() {
                    user_datetime = Some(args[i + 1].clone());
                    i += 2;
                } else {
                    eprintln!("Error: Missing datetime argument");
                    print_usage();
                    process::exit(1);
                }
            }
            "-r" => {
                is_random = true;
                i += 1;
            }
            "-d" => {
                if i + 1 < args.len() {
                    decode_id = Some(args[i + 1].clone());
                    i += 2;
                } else {
                    eprintln!("Error: Missing identifier argument");
                    print_usage();
                    process::exit(1);
                }
            }
            _ => {
                eprintln!("Error: Unknown argument '{}'", args[i]);
                print_usage();
                process::exit(1);
            }
        }
    }

    if let Some(id) = decode_id {
        if prefix.is_some() {
            eprintln!("Warning: Prefix is ignored when decoding");
        }
        if machine_id != 1 {
            eprintln!("Warning: Machine ID is ignored when decoding");
        }
        if user_datetime.is_some() {
            eprintln!("Warning: User datetime is ignored when decoding");
        }
        if is_random {
            eprintln!("Warning: Random flag is ignored when decoding");
        }
        
        let (prefix, timestamp, machine_id, random, random_part, identifier_type) = decode_identifier(&id);
        println!("Prefix: {}", prefix);
        println!("Type: {}", identifier_type);
        println!("Machine ID: {}", machine_id);
        
        if identifier_type == "chronological" {
            if let Some(timestamp) = timestamp {
                println!("Timestamp: {}", timestamp);
            }
            if let Some(random) = random {
                println!("Random Value: {}", random);
            }
        } else {
            if let Some(random_part) = random_part {
                println!("Random Part: {}", random_part);
            }
        }
    } else {
        match prefix {
            Some(p) => {
                if is_random && user_datetime.is_some() {
                    eprintln!("Warning: Time parameter is ignored when generating random identifiers");
                }
                
                let identifier = generate_identifier(&p, machine_id, user_datetime.as_deref(), is_random);
                println!("{}", identifier);
            }
            None => {
                eprintln!("Error: Prefix is required when generating an identifier");
                print_usage();
                process::exit(1);
            }
        }
    }
}
