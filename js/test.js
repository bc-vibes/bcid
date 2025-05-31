import { generateIdentifier, generateRandomIdentifier, decodeIdentifier } from './bcid.js';

// Test generating a chronological identifier
console.log('Testing chronological identifier generation...');
const prefix = 'TEST';
const machineId = 1;
const identifier = generateIdentifier(prefix, machineId);
console.log(`Generated identifier: ${identifier}`);
console.log(`Length: ${identifier.length} characters`);
console.log(`Starts with prefix: ${identifier.startsWith(prefix)}`);

// Test decoding the chronological identifier
console.log('\nTesting chronological identifier decoding...');
const decoded = decodeIdentifier(identifier);
console.log('Decoded components:');
console.log(`Prefix: ${decoded.prefix}`);
console.log(`Type: ${decoded.type}`);
console.log(`Timestamp: ${decoded.timestamp}`);
console.log(`Machine ID: ${decoded.machineId}`);
console.log(`Random Value: ${decoded.random}`);

// Test generating a random identifier
console.log('\n=== Testing Random Identifier Generation ===');
const randomId = generateRandomIdentifier('TEST', 42);
console.log(`Generated random identifier: ${randomId}`);
console.log(`Length: ${randomId.length} characters`);
console.log(`Starts with prefix: ${randomId.startsWith('TEST')}`);

// Test decoding the random identifier
console.log('\nTesting random identifier decoding...');
const randomDecoded = decodeIdentifier(randomId);
console.log('Decoded random components:');
console.log(`Prefix: ${randomDecoded.prefix}`);
console.log(`Type: ${randomDecoded.type}`);
console.log(`Machine ID: ${randomDecoded.machineId}`);
console.log(`Random Part: ${randomDecoded.randomPart}`);

// Test generating random identifier via main function
console.log('\nTesting random identifier via generateIdentifier...');
const randomId2 = generateIdentifier('TEST', 123, null, true);
console.log(`Generated random identifier (method 2): ${randomId2}`);
const randomDecoded2 = decodeIdentifier(randomId2);
console.log(`Machine ID preserved: ${randomDecoded2.machineId === 123}`);
console.log(`Type: ${randomDecoded2.type}`);

// Test that random identifiers are actually random
console.log('\nTesting randomness...');
const randomIds = new Set();
for (let i = 0; i < 100; i++) {
    const id = generateRandomIdentifier('TEST', 1);
    if (randomIds.has(id)) {
        console.log('Error: Duplicate random ID generated!');
        process.exit(1);
    }
    randomIds.add(id);
}
console.log('Successfully generated 100 unique random identifiers');

// Test that chronological identifiers are different from random ones
console.log('\nTesting chronological vs random difference...');
const chronoId = generateIdentifier('TEST', 1);
const randomId3 = generateRandomIdentifier('TEST', 1);
console.log(`Chronological: ${chronoId}`);
console.log(`Random: ${randomId3}`);
console.log(`Different: ${chronoId !== randomId3}`);

const chronoDecoded = decodeIdentifier(chronoId);
const randomDecoded3 = decodeIdentifier(randomId3);
console.log(`Chrono type: ${chronoDecoded.type}`);
console.log(`Random type: ${randomDecoded3.type}`);

// Test error handling
console.log('\nTesting error handling...');
try {
    generateIdentifier('ABC'); // Should fail - prefix too short
} catch (e) {
    console.log('Expected error (short prefix):', e.message);
}

try {
    generateIdentifier('ABCDE'); // Should fail - prefix too long
} catch (e) {
    console.log('Expected error (long prefix):', e.message);
}

try {
    generateIdentifier('ABCD', 65536); // Should fail - machine ID too large
} catch (e) {
    console.log('Expected error (large machine ID):', e.message);
}

try {
    decodeIdentifier('ABCD'); // Should fail - identifier too short
} catch (e) {
    console.log('Expected error (short identifier):', e.message);
}

// Test multiple generations
console.log('\nTesting multiple chronological generations...');
const ids = new Set();
for (let i = 0; i < 1000; i++) {
    const id = generateIdentifier('TEST');
    if (ids.has(id)) {
        console.log('Error: Duplicate ID generated!');
        process.exit(1);
    }
    ids.add(id);
}
console.log('Successfully generated 1000 unique chronological identifiers');

console.log('\n✅ All tests passed!'); 