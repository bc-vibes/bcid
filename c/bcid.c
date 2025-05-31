#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <fcntl.h>
#include <stdint.h>
#include <ctype.h>
#include <sys/time.h>

// Base62 alphabet (a-zA-Z0-9)
const char BASE62[] = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// Function declarations
void generate_random_identifier(const char* prefix, uint16_t machine_id, char* result);

// Function to convert a number to base62 string
void base62_encode(uint64_t num, char* result, size_t max_len) {
    if (num == 0) {
        result[0] = BASE62[0];
        result[1] = '\0';
        return;
    }

    char temp[64];  // Buffer for reversed string
    size_t i = 0;   // Changed to size_t
    
    while (num && i < max_len - 1) {
        temp[i++] = BASE62[num % 62];
        num /= 62;
    }
    
    // Reverse the string
    size_t j;       // Changed to size_t
    for (j = 0; j < i; j++) {
        result[j] = temp[i - 1 - j];
    }
    result[j] = '\0';
}

// Function to convert a base62 string to number
uint64_t base62_decode(const char* str) {
    uint64_t num = 0;
    for (int i = 0; str[i]; i++) {
        const char* p = strchr(BASE62, str[i]);
        if (!p) return 0;  // Invalid character
        num = num * 62 + (p - BASE62);
    }
    return num;
}

// Function to generate a random 16-bit number
uint16_t get_random_16bit() {
    uint16_t random;
    int fd = open("/dev/urandom", O_RDONLY);
    if (fd < 0) {
        // Fallback to time-based random if /dev/urandom fails
        srand(time(NULL));
        random = rand() & 0xFFFF;
    } else {
        read(fd, &random, sizeof(random));
        close(fd);
    }
    return random;
}

// Function to parse ISO 8601 date string
int parse_iso_date(const char* date_str, struct tm* tm_info) {
    // Clear the struct
    memset(tm_info, 0, sizeof(struct tm));
    
    // Parse YYYY-MM-DDTHH:MM:SS format
    if (sscanf(date_str, "%d-%d-%dT%d:%d:%d", 
               &tm_info->tm_year, &tm_info->tm_mon, &tm_info->tm_mday,
               &tm_info->tm_hour, &tm_info->tm_min, &tm_info->tm_sec) == 6) {
        tm_info->tm_year -= 1900;  // tm_year is years since 1900
        tm_info->tm_mon -= 1;      // tm_mon is 0-11
        tm_info->tm_isdst = -1;    // Let system determine DST
        return 1;
    }
    
    // Parse YYYY-MM-DD HH:MM:SS format
    if (sscanf(date_str, "%d-%d-%d %d:%d:%d", 
               &tm_info->tm_year, &tm_info->tm_mon, &tm_info->tm_mday,
               &tm_info->tm_hour, &tm_info->tm_min, &tm_info->tm_sec) == 6) {
        tm_info->tm_year -= 1900;
        tm_info->tm_mon -= 1;
        tm_info->tm_isdst = -1;
        return 1;
    }
    
    // Parse YYYY-MM-DD format (default to 00:00:00)
    if (sscanf(date_str, "%d-%d-%d", 
               &tm_info->tm_year, &tm_info->tm_mon, &tm_info->tm_mday) == 3) {
        tm_info->tm_year -= 1900;
        tm_info->tm_mon -= 1;
        tm_info->tm_hour = 0;
        tm_info->tm_min = 0;
        tm_info->tm_sec = 0;
        tm_info->tm_isdst = -1;
        return 1;
    }
    
    return 0;  // Failed to parse
}

// Function to generate identifier
void generate_identifier(const char* prefix, uint16_t machine_id, const char* user_time, int is_random, char* result) {
    if (strlen(prefix) != 4) {
        fprintf(stderr, "Error: Prefix must be exactly 4 characters long\n");
        exit(1);
    }

    if (is_random) {
        generate_random_identifier(prefix, machine_id, result);
        return;
    }

    struct tm tm_info;
    time_t timestamp_time;
    char timestamp_str[17];
    
    if (user_time) {
        // Parse user-supplied time
        if (!parse_iso_date(user_time, &tm_info)) {
            fprintf(stderr, "Error: Invalid date format. Use ISO 8601 format (e.g., '2023-12-25T10:30:00')\n");
            exit(1);
        }
        timestamp_time = mktime(&tm_info);
        if (timestamp_time == -1) {
            fprintf(stderr, "Error: Invalid date/time\n");
            exit(1);
        }
        // Convert to UTC
        struct tm* utc_tm = gmtime(&timestamp_time);
        tm_info = *utc_tm;
    } else {
        // Use current UTC time
        timestamp_time = time(NULL);
        struct tm* utc_tm = gmtime(&timestamp_time);
        tm_info = *utc_tm;
    }

    // Format timestamp as YYYYMMDDHHmmSSmm (UTC)
    strftime(timestamp_str, sizeof(timestamp_str), "%Y%m%d%H%M%S", &tm_info);
    
    // Add milliseconds (use 00 for user-supplied time, or current microseconds)
    if (user_time) {
        strcat(timestamp_str, "00");
    } else {
        struct timeval tv;
        gettimeofday(&tv, NULL);
        snprintf(timestamp_str + 14, 3, "%02d", (int)(tv.tv_usec / 10000));
    }
    
    uint64_t timestamp = atoll(timestamp_str);

    // Generate random value
    uint16_t random_value = get_random_16bit();

    // Convert components to base62
    char timestamp_b62[32];
    char machine_id_b62[8];
    char random_b62[8];
    char padding_b62[32];

    base62_encode(timestamp, timestamp_b62, sizeof(timestamp_b62));
    // Use a fixed 3-character encoding for machine_id
    machine_id_b62[0] = BASE62[machine_id / (62 * 62)];
    machine_id_b62[1] = BASE62[(machine_id / 62) % 62];
    machine_id_b62[2] = BASE62[machine_id % 62];
    machine_id_b62[3] = '\0';
    base62_encode(random_value, random_b62, sizeof(random_b62));

    // Generate padding
    for (int i = 0; i < 21; i++) {
        uint8_t random_byte = get_random_16bit() & 0xFF;
        char byte_b62[2];
        base62_encode(random_byte, byte_b62, sizeof(byte_b62));
        padding_b62[i] = byte_b62[0];
    }
    padding_b62[21] = '\0';

    // Combine all components
    snprintf(result, 33, "%s%s%s%s", prefix, timestamp_b62, machine_id_b62, random_b62);
    strncat(result, padding_b62, 28 - strlen(result) + 4);
    result[32] = '\0';
}

// Function to generate a fully random (non-chronological) identifier
void generate_random_identifier(const char* prefix, uint16_t machine_id, char* result) {
    if (strlen(prefix) != 4) {
        fprintf(stderr, "Error: Prefix must be exactly 4 characters long\n");
        exit(1);
    }

    // Convert machine ID to base62 with fixed length (3 characters)
    // This ensures unambiguous decoding
    char machine_id_b62[4];
    base62_encode(machine_id, machine_id_b62, sizeof(machine_id_b62));
    
    // Pad with 'a' characters to ensure exactly 3 characters
    char padded_machine_id_b62[4];
    int machine_id_len = strlen(machine_id_b62);
    if (machine_id_len < 3) {
        int padding_needed = 3 - machine_id_len;
        for (int i = 0; i < padding_needed; i++) {
            padded_machine_id_b62[i] = 'a';
        }
        strcpy(padded_machine_id_b62 + padding_needed, machine_id_b62);
    } else {
        strcpy(padded_machine_id_b62, machine_id_b62);
    }
    
    // Generate the remaining 25 characters as fully random data
    int remaining_length = 28 - 3; // Should be 25
    
    // Generate random bytes and convert to base62
    char random_b62[26];
    for (int i = 0; i < remaining_length; i++) {
        uint8_t random_byte = get_random_16bit() & 0xFF;
        random_b62[i] = BASE62[random_byte % 62];
    }
    random_b62[remaining_length] = '\0';
    
    // Combine prefix with machine ID and random part
    snprintf(result, 33, "%s%s%s", prefix, padded_machine_id_b62, random_b62);
}

// Function to decode identifier
void decode_identifier(const char* identifier, uint64_t* timestamp, uint16_t* machine_id, uint16_t* random, char* random_part, char* type) {
    if (strlen(identifier) != 32) {
        fprintf(stderr, "Error: Identifier must be exactly 32 characters long\n");
        exit(1);
    }

    const char* encoded = identifier + 4;  // Skip prefix
    size_t pos = 0;

    // Try to decode as chronological identifier first
    // Find the timestamp (it will be the largest number and should represent a valid date)
    char timestamp_str[32] = {0};
    int i = 0;
    while (encoded[pos + i] && base62_decode(timestamp_str) <= 9999999999999999) {
        timestamp_str[i] = encoded[pos + i];
        i++;
    }
    timestamp_str[i-1] = '\0';
    uint64_t decoded_timestamp = base62_decode(timestamp_str);
    
    // Check if this looks like a valid timestamp (year should be reasonable)
    char timestamp_str_16[17];
    snprintf(timestamp_str_16, sizeof(timestamp_str_16), "%016llu", decoded_timestamp);
    int year = (timestamp_str_16[0] - '0') * 1000 + (timestamp_str_16[1] - '0') * 100 + 
               (timestamp_str_16[2] - '0') * 10 + (timestamp_str_16[3] - '0');
    int is_valid_timestamp = (year >= 1970 && year <= 2100);
    
    if (is_valid_timestamp) {
        // Decode as chronological identifier
        *timestamp = decoded_timestamp;
        pos += i - 1;

        // Decode machine_id (exactly 3 characters)
        *machine_id = (uint16_t)(
            (strchr(BASE62, encoded[pos]) - BASE62) * 62 * 62 +
            (strchr(BASE62, encoded[pos + 1]) - BASE62) * 62 +
            (strchr(BASE62, encoded[pos + 2]) - BASE62)
        );
        pos += 3;

        // Find random value
        char random_str[8] = {0};
        i = 0;
        while (encoded[pos + i] && base62_decode(random_str) <= 65535) {
            random_str[i] = encoded[pos + i];
            i++;
        }
        random_str[i-1] = '\0';
        *random = (uint16_t)base62_decode(random_str);
        
        random_part[0] = '\0'; // No random part for chronological
        strcpy(type, "chronological");
    } else {
        // Decode as random identifier
        // Machine ID is always encoded as exactly 3 characters (padded with 'a' if needed)
        char machine_id_str[4];
        strncpy(machine_id_str, encoded, 3);
        machine_id_str[3] = '\0';
        *machine_id = (uint16_t)base62_decode(machine_id_str);
        
        // The rest is random data
        strcpy(random_part, encoded + 3);
        
        *timestamp = 0; // No timestamp for random
        *random = 0; // No random value for random identifiers
        strcpy(type, "random");
    }
}

void print_usage() {
    printf("Usage:\n");
    printf("  Generate: bcid -p PREFIX [-m MACHINE_ID] [-t DATETIME] [-r]\n");
    printf("  Decode:   bcid -d IDENTIFIER\n");
    printf("\nOptions:\n");
    printf("  -p PREFIX     4-character prefix (required for generation)\n");
    printf("  -m MACHINE_ID 16-bit machine identifier (0-65535, default: 1)\n");
    printf("  -t DATETIME   ISO 8601 date/time (default: current time, ignored with -r)\n");
    printf("  -r            Generate fully random identifier (non-chronological)\n");
    printf("  -d IDENTIFIER Decode an existing identifier\n");
    printf("\nExamples:\n");
    printf("  bcid -p TEST\n");
    printf("  bcid -p TEST -m 2 -t '2023-12-25T10:30:00'\n");
    printf("  bcid -p TEST -r\n");
    printf("  bcid -p TEST -m 2 -r\n");
    printf("  bcid -d TESTa1b2c3d4e5f6g7h8i9j0k1l2m3n4\n");
}

int main(int argc, char* argv[]) {
    char* prefix = NULL;
    char* decode_id = NULL;
    char* user_time = NULL;
    uint16_t machine_id = 1;
    int is_random = 0;
    int opt;

    while ((opt = getopt(argc, argv, "p:m:t:d:r")) != -1) {
        switch (opt) {
            case 'p':
                prefix = optarg;
                break;
            case 'm':
                machine_id = atoi(optarg);
                if (machine_id > 65535) {  // Max value for uint16_t
                    fprintf(stderr, "Error: Machine ID must be between 0 and 65535\n");
                    return 1;
                }
                break;
            case 't':
                user_time = optarg;
                break;
            case 'r':
                is_random = 1;
                break;
            case 'd':
                decode_id = optarg;
                break;
            default:
                print_usage();
                return 1;
        }
    }

    if (decode_id) {
        if (prefix) {
            fprintf(stderr, "Warning: Prefix is ignored when decoding\n");
        }
        if (machine_id != 1) {
            fprintf(stderr, "Warning: Machine ID is ignored when decoding\n");
        }
        if (user_time) {
            fprintf(stderr, "Warning: User time is ignored when decoding\n");
        }
        if (is_random) {
            fprintf(stderr, "Warning: Random flag is ignored when decoding\n");
        }
        
        uint64_t timestamp;
        uint16_t decoded_machine_id, random;  // Renamed to avoid shadowing
        char random_part[29];
        char type[16];
        decode_identifier(decode_id, &timestamp, &decoded_machine_id, &random, random_part, type);
        printf("Prefix: %.4s\n", decode_id);
        printf("Type: %s\n", type);
        printf("Machine ID: %u\n", decoded_machine_id);
        
        if (strcmp(type, "chronological") == 0) {
            printf("Timestamp: %llu\n", timestamp);
            printf("Random Value: %u\n", random);
        } else {
            printf("Random Part: %s\n", random_part);
        }
    } else {
        if (!prefix) {
            fprintf(stderr, "Error: Prefix is required when generating an identifier\n");
            print_usage();
            return 1;
        }
        
        if (is_random && user_time) {
            fprintf(stderr, "Warning: Time parameter is ignored when generating random identifiers\n");
        }
        
        char result[33];
        generate_identifier(prefix, machine_id, user_time, is_random, result);
        printf("%s\n", result);
    }

    return 0;
} 