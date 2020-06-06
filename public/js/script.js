const password = document.querySelector('#password');
const confirmPassword = document.querySelector('#confirmpassword');
const submitBtn = document.querySelector('#submit-btn');
const inputs = document.querySelectorAll('input');


const verifyPassword = () => {
    if (password.value.length >= 8) {
        return true
    }
    return false
}

const verifyConfirmpassword = () => {
    if (confirmpassword.value === password.value) {
        return true
    }
    return false
}

confirmPassword.addEventListener('input', () => {
    verifyConfirmpassword()
})
password.addEventListener('input', () => {
    verifyPassword()
})
const activateSubmitBtn = () => {
    if (verifyPassword() && verifyConfirmpassword()) {
        submitBtn.disabled = false;
    }
}

inputs.forEach(input => {
    input.addEventListener('input', () => {
        activateSubmitBtn();
    })
})