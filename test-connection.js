const url = 'https://script.google.com/macros/s/AKfycbwZhiYOz_EyRdbIRwsRurrboTkF_Sg6GXMLY8LAh68hwNpO4FmoN_Wbx6luDB12Ar0Q/exec';
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
.then(res => res.text())
.then(data => {
    console.log("Raw Response:\n", data);
})
.catch(err => {
    console.error("Connection failed:", err);
});
