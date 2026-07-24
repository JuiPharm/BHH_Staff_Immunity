const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function pbkdf2GAS(password, salt, iterations = 100000) {
    let key = password + salt;
    for (let i = 0; i < iterations; i++) {
        key = crypto.createHmac('sha256', salt).update(key).digest('hex');
    }
    return key;
}

const users = ['IC8001', 'ST8004', 'HR8002'];
const password = 'password123';
const iterations = 100000;

let csvContent = "UserUUID,StaffID,PasswordHash,Salt,Iterations,FailedLoginCount,LockoutUntil,MustChangePassword,AccountStatus,ResetTokenHash,ResetTokenExpiresAt,CreatedAt,CreatedBy,UpdatedAt,UpdatedBy,RecordVersion,IsDeleted\n";

users.forEach(staffId => {
    const salt = crypto.randomBytes(8).toString('hex');
    console.log(`Hashing password for ${staffId}... (this might take a few seconds)`);
    const hash = pbkdf2GAS(password, salt, iterations);
    const uuid = `usr-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    
    csvContent += `${uuid},${staffId},${hash},${salt},${iterations},0,,TRUE,ACTIVE,,,${now},SYSTEM,${now},SYSTEM,1,FALSE\n`;
});

fs.writeFileSync(path.join(__dirname, 'sample_data', 'User_Account_Sample.csv'), csvContent);
console.log("Created sample_data/User_Account_Sample.csv");
