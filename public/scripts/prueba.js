const BotonCrearCuenta = document.querySelector('.form');
const accountSid = "AC5393e88c30f0d4a65991d880f8befd6b";
const authToken = "738de323367f2ade1d350dd7f60e0f2d";
const verifySid = "VAa880bf93dacfdadb85f2dcd4b3ce2549";
import twilio from 'twilio';
const client = twilio(accountSid, authToken);


BotonCrearCuenta.addEventListener('submit', paginaConfirmación);


function paginaConfirmación(event){
    event.preventDefault();
    client.verify.v2
  .services(verifySid)
  .verifications.create({ to: "+50247013483", channel: "sms" })
  .then((verification) => console.log(verification.status))
  .then(() => {
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    readline.question("Please enter the OTP:", (otpCode) => {
      client.verify.v2
        .services(verifySid)
        .verificationChecks.create({ to: "+50247013483", code: otpCode })
        .then((verification_check) => console.log(verification_check.status))
        .then(() => readline.close());
    });
  });
    
}