// vault-access.js

const codes = {
    AMSWEST: 'c05cf473094ca91f8e88337f4b1d504467b133ff8c2c38a92af912bff6ffd50f', // SHA-256 hash
    WORLD5:  'f81dd8a8f53195f2c55fb0917d03602f461b4e2fb18e02f0138ff39d36a5b680', // SHA-256 hash
};

async function verifyCode(inputCode) {
    const encoder = new TextEncoder();
    const inputHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(inputCode));
    const inputHashArray = Array.from(new Uint8Array(inputHashBuffer));
    const inputHash = inputHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return Object.values(codes).includes(inputHash);
}

module.exports = { verifyCode };