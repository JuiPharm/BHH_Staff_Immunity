const url = 'https://script.google.com/macros/s/AKfycbwZhiYOz_EyRdbIRwsRurrboTkF_Sg6GXMLY8LAh68hwNpO4FmoN_Wbx6luDB12Ar0Q/exec';
const payload = {
    action: "login",
    staffId: "IC8001",
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
