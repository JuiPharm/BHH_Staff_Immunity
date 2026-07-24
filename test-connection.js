const url = 'https://script.google.com/macros/s/AKfycbx4PX8yYrTZi49I_aHmv1EFnaLMCMjI0MdIOfEYVpZef2HtH5-o-TSkCwOkSThq0ND6/exec';
const payload = {
    action: "login",
    staffId: "HR8002",
    password: "password123"
};

fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => {
    console.log("Connection successful!");
    console.log("Response:", JSON.stringify(data, null, 2));
})
.catch(err => {
    console.error("Connection failed:", err);
});
